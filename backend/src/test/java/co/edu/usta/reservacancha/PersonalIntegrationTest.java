package co.edu.usta.reservacancha;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import co.edu.usta.reservacancha.escenarios.CanchaDto;
import co.edu.usta.reservacancha.escenarios.EscenariosClient;
import co.edu.usta.reservacancha.escenarios.HorarioDto;
import co.edu.usta.reservacancha.escenarios.ReglasDto;
import co.edu.usta.reservacancha.pago.PagoDto;
import co.edu.usta.reservacancha.pago.PagosClient;
import co.edu.usta.reservacancha.reserva.EstadoReserva;
import co.edu.usta.reservacancha.reservas.ReservaDto;
import co.edu.usta.reservacancha.reservas.ReservasClient;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

/**
 * Panel del personal: el jugador reserva sin cuenta, el empleado ve la agenda y cancela, y solo el
 * administrador ve las métricas, administra canchas y crea o desactiva empleados.
 */
@SpringBootTest
@AutoConfigureMockMvc
class PersonalIntegrationTest {

  private static final LocalDate DIA = LocalDate.now().plusDays(3);
  private static final CanchaDto FUTBOL_7 =
      new CanchaDto(
          2L,
          1L,
          "Cancha 2 — Fútbol 7",
          "FUTBOL",
          "Fútbol 7",
          "Sintética",
          "Villavicencio",
          new BigDecimal("90000.00"),
          true,
          new ReglasDto(60, 3, 50));

  @Autowired MockMvc mvc;
  @Autowired ObjectMapper json;

  @MockBean EscenariosClient escenarios;
  @MockBean ReservasClient reservas;
  @MockBean PagosClient pagos;

  private static ReservaDto reserva(long id, long usuario, int hora, int horas, EstadoReserva e) {
    return new ReservaDto(
        id,
        usuario,
        2L,
        DIA,
        LocalTime.of(hora, 0),
        LocalTime.of(hora + horas, 0),
        new BigDecimal(90000L * horas),
        e,
        Instant.now(),
        Instant.now());
  }

  private ResultActions pedir(
      org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder req,
      String token,
      Object cuerpo)
      throws Exception {
    if (token != null) req = req.header("Authorization", "Bearer " + token);
    if (cuerpo != null) {
      req = req.contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(cuerpo));
    }
    return mvc.perform(req);
  }

  private String login(String email, String clave) throws Exception {
    String res =
        pedir(post("/api/auth/login"), null, Map.of("email", email, "password", clave))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    return json.readTree(res).get("token").asText();
  }

  /** El administrador crea un empleado y devuelve {id, correo}. */
  private JsonNode crearEmpleado(String admin, String correo) throws Exception {
    String res =
        pedir(
                post("/api/admin/empleados"),
                admin,
                Map.of("nombre", "Laura Cancha", "email", correo, "password", TestSupport.CLAVE))
            .andExpect(status().isCreated())
            .andReturn()
            .getResponse()
            .getContentAsString();
    return json.readTree(res);
  }

  @Test
  void elRegistroPublicoNoCreaPersonal() throws Exception {
    for (String rol : List.of("PROPIETARIO", "EMPLEADO", "ADMIN")) {
      pedir(
              post("/api/auth/register"),
              null,
              Map.of(
                  "nombre",
                  "Intruso",
                  "email",
                  TestSupport.correoUnico(),
                  "password",
                  TestSupport.CLAVE,
                  "rol",
                  rol))
          .andExpect(status().isForbidden());
    }
  }

  @Test
  void elAdministradorCreaUnEmpleadoQueIniciaSesion() throws Exception {
    String admin = TestSupport.loginAdmin(mvc, json);
    String correo = TestSupport.correoUnico();
    JsonNode e = crearEmpleado(admin, correo);
    assertThat(e.get("rol").asText()).isEqualTo("EMPLEADO");
    assertThat(e.has("password")).isFalse();

    String res =
        pedir(post("/api/auth/login"), null, Map.of("email", correo, "password", TestSupport.CLAVE))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    assertThat(json.readTree(res).get("rol").asText()).isEqualTo("EMPLEADO");

    // Correo repetido: 409; la lista del personal lo incluye
    pedir(
            post("/api/admin/empleados"),
            admin,
            Map.of("nombre", "Otra", "email", correo, "password", TestSupport.CLAVE))
        .andExpect(status().isConflict());
    String lista =
        pedir(get("/api/admin/empleados"), admin, null)
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    assertThat(lista).contains(correo).contains("admin@reservacancha.co").doesNotContain("JUGADOR");
  }

  @Test
  void elEmpleadoVeLaAgendaPeroNoAdministra() throws Exception {
    when(reservas.todas()).thenReturn(List.of(reserva(1, 99, 15, 1, EstadoReserva.PENDIENTE)));
    when(escenarios.cancha(2L)).thenReturn(FUTBOL_7);
    String empleado = login("empleado@reservacancha.co", "empleado123");

    pedir(get("/api/admin/reservas"), empleado, null).andExpect(status().isOk());
    pedir(get("/api/admin/metricas"), empleado, null).andExpect(status().isForbidden());
    pedir(get("/api/admin/empleados"), empleado, null).andExpect(status().isForbidden());
    pedir(
            post("/api/admin/empleados"),
            empleado,
            Map.of("nombre", "X", "email", TestSupport.correoUnico(), "password", "Clave-123456"))
        .andExpect(status().isForbidden());
    pedir(
            post("/api/canchas"),
            empleado,
            Map.of("nombre", "Nueva", "tipo", "Fútbol 5", "precioHora", 50000))
        .andExpect(status().isForbidden());
  }

  @Test
  void elJugadorNoVeLaAgenda() throws Exception {
    String jugador = TestSupport.registrarJugador(mvc, json);
    pedir(get("/api/admin/reservas"), jugador, null).andExpect(status().isForbidden());
  }

  @Test
  void elEmpleadoCancelaLaReservaDeUnJugador() throws Exception {
    ReservaDto r = reserva(7, 99, 15, 1, EstadoReserva.PENDIENTE);
    when(reservas.una(7L)).thenReturn(r);
    when(escenarios.cancha(2L)).thenReturn(FUTBOL_7);
    when(reservas.cambiarEstado(eq(7L), eq(EstadoReserva.CANCELADA)))
        .thenReturn(reserva(7, 99, 15, 1, EstadoReserva.CANCELADA));
    String empleado = login("empleado@reservacancha.co", "empleado123");
    String res =
        pedir(post("/api/reservas/7/cancelar"), empleado, null)
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    assertThat(json.readTree(res).get("estado").asText()).isEqualTo("CANCELADA");
  }

  @Test
  void unEmpleadoDesactivadoNoEntraNiUsaSuToken() throws Exception {
    when(reservas.todas()).thenReturn(List.of());
    String admin = TestSupport.loginAdmin(mvc, json);
    String correo = TestSupport.correoUnico();
    long id = crearEmpleado(admin, correo).get("id").asLong();
    String token = login(correo, TestSupport.CLAVE);
    pedir(get("/api/admin/reservas"), token, null).andExpect(status().isOk());

    String res =
        pedir(patch("/api/admin/empleados/" + id), admin, Map.of("activo", false))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    assertThat(json.readTree(res).get("activo").asBoolean()).isFalse();

    pedir(post("/api/auth/login"), null, Map.of("email", correo, "password", TestSupport.CLAVE))
        .andExpect(status().isUnauthorized());
    assertThat(pedir(get("/api/admin/reservas"), token, null).andReturn().getResponse().getStatus())
        .isIn(401, 403);

    // Se puede volver a activar; una cuenta de administrador no se desactiva desde aquí
    pedir(patch("/api/admin/empleados/" + id), admin, Map.of("activo", true))
        .andExpect(status().isOk());
    login(correo, TestSupport.CLAVE);
    String lista =
        pedir(get("/api/admin/empleados"), admin, null)
            .andReturn()
            .getResponse()
            .getContentAsString();
    long idAdmin = 0;
    for (JsonNode u : json.readTree(lista)) {
      if ("admin@reservacancha.co".equals(u.get("email").asText())) idAdmin = u.get("id").asLong();
    }
    pedir(patch("/api/admin/empleados/" + idAdmin), admin, Map.of("activo", false))
        .andExpect(status().isBadRequest());
  }

  @Test
  void lasMetricasJuntanReservasPagosYHorarios() throws Exception {
    when(escenarios.canchas()).thenReturn(List.of(FUTBOL_7));
    when(escenarios.horarios(2L))
        .thenReturn(
            Arrays.stream(DayOfWeek.values())
                .map(d -> new HorarioDto(1L, 2L, d, LocalTime.of(14, 0), LocalTime.of(22, 0), true))
                .toList());
    // 1 h de 3 a 4 y 2 h de 6 a 8 activas; una cancelada que no cuenta
    when(reservas.todas())
        .thenReturn(
            List.of(
                reserva(1, 10, 15, 1, EstadoReserva.PAGADA),
                reserva(2, 11, 18, 2, EstadoReserva.PENDIENTE),
                reserva(3, 12, 20, 1, EstadoReserva.CANCELADA)));
    when(pagos.todos())
        .thenReturn(
            List.of(
                new PagoDto(
                    1L, 1L, new BigDecimal("45000"), "COP", "ref", "tx", "APROBADO", null, null),
                new PagoDto(
                    2L,
                    2L,
                    new BigDecimal("90000"),
                    "COP",
                    "ref2",
                    "tx2",
                    "RECHAZADO",
                    null,
                    null)));
    String admin = TestSupport.loginAdmin(mvc, json);
    String res =
        pedir(get("/api/admin/metricas?desde=" + DIA + "&hasta=" + DIA), admin, null)
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    JsonNode m = json.readTree(res);
    assertThat(m.get("reservas").asLong()).isEqualTo(2);
    assertThat(m.get("canceladas").asLong()).isEqualTo(1);
    assertThat(m.get("jugadores").asLong()).isEqualTo(2);
    assertThat(m.get("ingresos").decimalValue()).isEqualByComparingTo("270000");
    assertThat(m.get("abonosCobrados").decimalValue()).isEqualByComparingTo("45000");
    // 3 horas reservadas de 8 que abre: 37,5 %
    JsonNode c = m.get("porCancha").get(0);
    assertThat(c.get("horas").asDouble()).isEqualTo(3.0);
    assertThat(c.get("ocupacion").asDouble()).isEqualTo(37.5);
    assertThat(m.get("porDia").get(0).get("reservas").asLong()).isEqualTo(2);
    assertThat(m.get("porHora").toString())
        .contains("{\"hora\":15,\"reservas\":1}")
        .contains("{\"hora\":18,\"reservas\":1}")
        .contains("{\"hora\":19,\"reservas\":1}");

    pedir(get("/api/admin/metricas?desde=" + DIA + "&hasta=" + DIA.minusDays(1)), admin, null)
        .andExpect(status().isBadRequest());
  }
}
