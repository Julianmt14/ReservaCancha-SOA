package co.edu.usta.reservacancha;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import co.edu.usta.reservacancha.TestSupport.Sesion;
import co.edu.usta.reservacancha.escenarios.CanchaDto;
import co.edu.usta.reservacancha.escenarios.CanchaRequest;
import co.edu.usta.reservacancha.escenarios.CotizacionDto;
import co.edu.usta.reservacancha.escenarios.EscenariosClient;
import co.edu.usta.reservacancha.escenarios.FranjasDto;
import co.edu.usta.reservacancha.escenarios.FranjasDto.Franja;
import co.edu.usta.reservacancha.escenarios.HorarioDto;
import co.edu.usta.reservacancha.escenarios.HorarioRequest;
import co.edu.usta.reservacancha.escenarios.ReglasDto;
import co.edu.usta.reservacancha.pago.IntencionPagoDto;
import co.edu.usta.reservacancha.pago.PagoDto;
import co.edu.usta.reservacancha.pago.PagosClient;
import co.edu.usta.reservacancha.reserva.EstadoReserva;
import co.edu.usta.reservacancha.reservas.NuevaReservaRequest;
import co.edu.usta.reservacancha.reservas.OcupacionDto;
import co.edu.usta.reservacancha.reservas.ReservaDto;
import co.edu.usta.reservacancha.reservas.ReservasClient;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.web.server.ResponseStatusException;

/**
 * La consumidora integra a los dos proveedores. servicio-escenarios, servicio-reservas y
 * servicio-pagos son otras aplicaciones: aquí se simulan sus clientes HTTP y se revisa lo que hace
 * ReservaCancha con lo que contestan (formas JSON, permisos, reglas y propagación de errores).
 */
@SpringBootTest
@AutoConfigureMockMvc
class ReservaIntegrationTest {

  private static final CanchaDto CANCHA_1 =
      new CanchaDto(
          1L,
          1L,
          "Cancha 1 — Sintética F5",
          "FUTBOL",
          "Fútbol 5",
          "Sintética",
          "Villavicencio",
          new BigDecimal("60000.00"),
          true,
          new ReglasDto(60, 3, 50));

  @Autowired MockMvc mvc;
  @Autowired ObjectMapper json;

  @MockBean EscenariosClient escenarios;
  @MockBean ReservasClient reservas;
  @MockBean PagosClient pagos;

  @Value("${app.wompi.events-secret}")
  String eventsSecret;

  private static ReservaDto reserva(
      long id, long usuarioId, LocalDateTime inicio, EstadoReserva estado) {
    Instant ahora = Instant.now();
    return new ReservaDto(
        id,
        usuarioId,
        1L,
        inicio.toLocalDate(),
        inicio.toLocalTime(),
        inicio.toLocalTime().plusHours(1),
        new BigDecimal("60000.00"),
        estado,
        ahora,
        ahora);
  }

  private static ReservaDto conEstado(ReservaDto r, EstadoReserva estado) {
    return new ReservaDto(
        r.id(),
        r.usuarioId(),
        r.canchaId(),
        r.fecha(),
        r.horaInicio(),
        r.horaFin(),
        r.valorTotal(),
        estado,
        r.creadoEn(),
        Instant.now());
  }

  private static LocalDateTime enDias(int dias, int hora) {
    return LocalDate.now().plusDays(dias).atTime(hora, 0);
  }

  private ResultActions reservar(
      String token, long canchaId, LocalDate fecha, String inicio, String fin) throws Exception {
    String body =
        json.writeValueAsString(
            Map.of(
                "canchaId",
                canchaId,
                "fecha",
                fecha.toString(),
                "horaInicio",
                inicio,
                "horaFin",
                fin));
    var req = post("/api/reservas").contentType(MediaType.APPLICATION_JSON).content(body);
    if (token != null) req = req.header("Authorization", "Bearer " + token);
    return mvc.perform(req);
  }

  private JsonNode cuerpo(ResultActions r) throws Exception {
    return json.readTree(r.andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8));
  }

  // --- Crear reserva: cotización en el proveedor 1 → POST en el proveedor 2 ---

  @Test
  void crearReservaArmaLaFormaDeSiempreYMandaElValorCotizado() throws Exception {
    Sesion jugador = TestSupport.nuevoJugador(mvc, json);
    LocalDate fecha = LocalDate.now().plusDays(10);
    when(escenarios.cotizar(1L, fecha, LocalTime.of(10, 0), LocalTime.of(12, 0)))
        .thenReturn(
            new CotizacionDto(
                1L,
                fecha,
                LocalTime.of(10, 0),
                LocalTime.of(12, 0),
                120,
                new BigDecimal("120000.00"),
                new BigDecimal("60000.00"),
                3));
    when(escenarios.cancha(1L)).thenReturn(CANCHA_1);
    when(reservas.crear(any()))
        .thenAnswer(
            inv -> {
              NuevaReservaRequest q = inv.getArgument(0);
              Instant ahora = Instant.now();
              return new ReservaDto(
                  15L,
                  q.usuarioId(),
                  q.canchaId(),
                  q.fecha(),
                  q.horaInicio(),
                  q.horaFin(),
                  q.valorTotal(),
                  EstadoReserva.PENDIENTE,
                  ahora,
                  ahora);
            });

    JsonNode r =
        cuerpo(
            reservar(jugador.token(), 1, fecha, "10:00:00", "12:00:00").andExpect(status().isOk()));

    // Forma Reserva que usa el frontend (bookings.ts)
    assertThat(r.get("id").asLong()).isEqualTo(15L);
    assertThat(r.get("estado").asText()).isEqualTo("PENDIENTE");
    assertThat(r.get("valorTotal").decimalValue()).isEqualByComparingTo("120000");
    assertThat(r.get("fecha").asText()).isEqualTo(fecha.toString());
    assertThat(r.get("horaInicio").asText()).isEqualTo("10:00:00");
    assertThat(r.get("horaFin").asText()).isEqualTo("12:00:00");
    assertThat(r.hasNonNull("creadoEn")).isTrue();
    assertThat(r.get("usuario").get("id").asLong()).isEqualTo(jugador.id());
    assertThat(r.get("usuario").get("nombre").asText()).isEqualTo("Jugador Prueba");
    assertThat(r.get("usuario").get("rol").asText()).isEqualTo("JUGADOR");
    assertThat(r.get("usuario").has("password")).as("la respuesta no expone el hash").isFalse();
    assertThat(r.get("cancha").get("id").asLong()).isEqualTo(1L);
    assertThat(r.get("cancha").get("nombre").asText()).isEqualTo("Cancha 1 — Sintética F5");

    // Al proveedor 2 viaja el usuario de esta aplicación y el valor que cotizó el proveedor 1
    ArgumentCaptor<NuevaReservaRequest> enviada =
        ArgumentCaptor.forClass(NuevaReservaRequest.class);
    verify(reservas).crear(enviada.capture());
    assertThat(enviada.getValue().usuarioId()).isEqualTo(jugador.id());
    assertThat(enviada.getValue().canchaId()).isEqualTo(1L);
    assertThat(enviada.getValue().valorTotal()).isEqualByComparingTo("120000");
  }

  @Test
  void siEscenariosNoRespondeLaReservaNoSeCreaYNuncaSeLlamaAReservas() throws Exception {
    String token = TestSupport.registrarJugador(mvc, json);
    when(escenarios.cotizar(any(), any(), any(), any()))
        .thenThrow(
            new ResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "El servicio de escenarios no responde en http://localhost:8081."));

    JsonNode error =
        cuerpo(
            reservar(token, 1, LocalDate.now().plusDays(3), "10:00:00", "11:00:00")
                .andExpect(status().isServiceUnavailable()));
    assertThat(error.get("error").asText())
        .isEqualTo(
            "No se pudo verificar la cancha: el servicio de escenarios no responde. La reserva no"
                + " se creó.");
    verify(reservas, never()).crear(any());
  }

  @Test
  void unaReglaIncumplidaEnEscenariosResponde400ConSuMensaje() throws Exception {
    String token = TestSupport.registrarJugador(mvc, json);
    when(escenarios.cotizar(any(), any(), any(), any()))
        .thenThrow(
            new ResponseStatusException(
                HttpStatus.BAD_REQUEST, "No se puede reservar en un horario que ya pasó"));

    JsonNode error =
        cuerpo(
            reservar(token, 1, LocalDate.now().minusDays(1), "10:00:00", "11:00:00")
                .andExpect(status().isBadRequest()));
    assertThat(error.get("error").asText())
        .isEqualTo("No se puede reservar en un horario que ya pasó");
    verify(reservas, never()).crear(any());
  }

  @Test
  void elConflictoDeHorarioDeServicioReservasSePropagaComo409() throws Exception {
    String token = TestSupport.registrarJugador(mvc, json);
    when(escenarios.cotizar(any(), any(), any(), any()))
        .thenReturn(
            new CotizacionDto(
                1L,
                LocalDate.now().plusDays(4),
                LocalTime.of(15, 0),
                LocalTime.of(17, 0),
                120,
                new BigDecimal("120000.00"),
                new BigDecimal("60000.00"),
                3));
    when(reservas.crear(any()))
        .thenThrow(
            new ResponseStatusException(
                HttpStatus.CONFLICT, "Conflicto de horario: ya existe una reserva en ese rango"));

    JsonNode error =
        cuerpo(
            reservar(token, 1, LocalDate.now().plusDays(4), "15:00:00", "17:00:00")
                .andExpect(status().isConflict()));
    assertThat(error.get("error").asText())
        .isEqualTo("Conflicto de horario: ya existe una reserva en ese rango");
  }

  @Test
  void cuerpoIncompletoResponde400() throws Exception {
    String token = TestSupport.registrarJugador(mvc, json);
    mvc.perform(
            post("/api/reservas")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"canchaId\":1}"))
        .andExpect(status().isBadRequest());
    verifyNoInteractions(escenarios, reservas);
  }

  @Test
  void sinTokenNoSePuedeReservar() throws Exception {
    reservar(null, 1, LocalDate.now().plusDays(3), "10:00:00", "11:00:00")
        .andExpect(status().is4xxClientError());
    verifyNoInteractions(escenarios, reservas);
  }

  // --- Cancelar: dueño o personal; regla de horasCancelacion del proveedor 1 ---

  @Test
  void unJugadorNoCancelaAMenosDeTresHorasDelPartido() throws Exception {
    Sesion dueno = TestSupport.nuevoJugador(mvc, json);
    LocalDateTime pronto = LocalDateTime.now().plusHours(1).truncatedTo(ChronoUnit.MINUTES);
    when(reservas.una(20L)).thenReturn(reserva(20L, dueno.id(), pronto, EstadoReserva.PENDIENTE));
    when(escenarios.cancha(1L)).thenReturn(CANCHA_1);

    JsonNode error =
        cuerpo(
            mvc.perform(post("/api/reservas/20/cancelar").header("Authorization", dueno.bearer()))
                .andExpect(status().isBadRequest()));
    assertThat(error.get("error").asText())
        .isEqualTo("Solo se puede cancelar hasta 3 horas antes del partido");
    verify(reservas, never()).cambiarEstado(any(), any());
  }

  @Test
  void soloElDuenoOElPersonalCancelanUnaReserva() throws Exception {
    Sesion dueno = TestSupport.nuevoJugador(mvc, json);
    Sesion otro = TestSupport.nuevoJugador(mvc, json);
    ReservaDto r = reserva(21L, dueno.id(), enDias(5, 8), EstadoReserva.PENDIENTE);
    when(reservas.una(21L)).thenReturn(r);
    when(escenarios.cancha(1L)).thenReturn(CANCHA_1);
    when(reservas.cambiarEstado(21L, EstadoReserva.CANCELADA))
        .thenReturn(conEstado(r, EstadoReserva.CANCELADA));

    mvc.perform(post("/api/reservas/21/cancelar").header("Authorization", otro.bearer()))
        .andExpect(status().isForbidden());
    verify(reservas, never()).cambiarEstado(any(), any());

    JsonNode cancelada =
        cuerpo(
            mvc.perform(post("/api/reservas/21/cancelar").header("Authorization", dueno.bearer()))
                .andExpect(status().isOk()));
    assertThat(cancelada.get("estado").asText()).isEqualTo("CANCELADA");
    assertThat(cancelada.get("usuario").get("id").asLong()).isEqualTo(dueno.id());
    verify(reservas).cambiarEstado(21L, EstadoReserva.CANCELADA);
  }

  @Test
  void elPersonalCancelaAunqueFaltenMenosDeTresHoras() throws Exception {
    Sesion dueno = TestSupport.nuevoJugador(mvc, json);
    String admin = TestSupport.loginAdmin(mvc, json);
    LocalDateTime pronto = LocalDateTime.now().plusHours(1).truncatedTo(ChronoUnit.MINUTES);
    ReservaDto r = reserva(22L, dueno.id(), pronto, EstadoReserva.PAGADA);
    when(reservas.una(22L)).thenReturn(r);
    when(escenarios.cancha(1L)).thenReturn(CANCHA_1);
    when(reservas.cambiarEstado(22L, EstadoReserva.CANCELADA))
        .thenReturn(conEstado(r, EstadoReserva.CANCELADA));

    mvc.perform(post("/api/reservas/22/cancelar").header("Authorization", "Bearer " + admin))
        .andExpect(status().isOk());
    verify(reservas).cambiarEstado(22L, EstadoReserva.CANCELADA);
  }

  // --- Disponibilidad: franjas del proveedor 1 menos la ocupación del proveedor 2 ---

  @Test
  void laDisponibilidadSonLasFranjasMenosLaOcupacion() throws Exception {
    LocalDate fecha = LocalDate.now().plusDays(7);
    when(escenarios.franjas(2L, fecha))
        .thenReturn(
            new FranjasDto(
                2L,
                fecha,
                true,
                List.of(
                    new Franja("08:00", "09:00"),
                    new Franja("09:00", "10:00"),
                    new Franja("10:00", "11:00"))));
    when(reservas.ocupacion(2L, fecha))
        .thenReturn(List.of(new OcupacionDto(30L, "09:00", "10:00", "PENDIENTE")));

    JsonNode d =
        cuerpo(
            mvc.perform(
                    get("/api/disponibilidad")
                        .param("canchaId", "2")
                        .param("fecha", fecha.toString()))
                .andExpect(status().isOk()));
    assertThat(d.get("canchaId").asLong()).isEqualTo(2L);
    assertThat(d.get("fecha").asText()).isEqualTo(fecha.toString());
    assertThat(d.get("ocupadas")).hasSize(1);
    assertThat(d.get("ocupadas").get(0).get("inicio").asText()).isEqualTo("09:00");
    JsonNode libres = d.get("libres");
    assertThat(libres).hasSize(2); // 08-09 y 10-11
    assertThat(libres.get(0).get("inicio").asText()).isEqualTo("08:00");
    assertThat(libres.get(1).get("inicio").asText()).isEqualTo("10:00");
    assertThat(libres.get(1).get("fin").asText()).isEqualTo("11:00");
  }

  @Test
  void laOcupacionDeUnaCanchaSoloMuestraElJugadorAlPersonal() throws Exception {
    Sesion jugador = TestSupport.nuevoJugador(mvc, json);
    String admin = TestSupport.loginAdmin(mvc, json);
    when(reservas.porCancha(eq(1L), any()))
        .thenReturn(List.of(reserva(40L, jugador.id(), enDias(2, 18), EstadoReserva.PENDIENTE)));

    JsonNode paraJugador =
        cuerpo(
            mvc.perform(get("/api/reservas/cancha/1").header("Authorization", jugador.bearer()))
                .andExpect(status().isOk()));
    assertThat(paraJugador.get(0).get("horaInicio").asText()).isEqualTo("18:00");
    assertThat(paraJugador.get(0).get("usuarioId").asLong()).isEqualTo(jugador.id());
    assertThat(paraJugador.get(0).has("jugador")).isFalse();
    verify(reservas).porCancha(1L, LocalDate.now());

    JsonNode paraAdmin =
        cuerpo(
            mvc.perform(get("/api/reservas/cancha/1").header("Authorization", "Bearer " + admin))
                .andExpect(status().isOk()));
    assertThat(paraAdmin.get(0).get("jugador").asText()).isEqualTo("Jugador Prueba");
    verify(reservas).porCancha(1L, LocalDate.now().minusDays(30));
  }

  // --- Seguridad (SEC-01) y canchas/horarios del proveedor 1 ---

  // La interfaz web (HTML, CSS y JavaScript) se abre sin token; la API sigue protegida
  @Test
  void laInterfazWebSeAbreSinToken() throws Exception {
    mvc.perform(get("/")).andExpect(status().isOk());
    mvc.perform(get("/js/app.js")).andExpect(status().isOk());
    mvc.perform(get("/css/estilos.css")).andExpect(status().isOk());
  }

  @Test
  void sinTokenNoSeConsultanHorariosNiOcupacion() throws Exception {
    int horarios = mvc.perform(get("/api/horarios/cancha/1")).andReturn().getResponse().getStatus();
    int ocupacion =
        mvc.perform(get("/api/reservas/cancha/1")).andReturn().getResponse().getStatus();
    assertThat(horarios).isIn(401, 403);
    assertThat(ocupacion).isIn(401, 403);
    verifyNoInteractions(escenarios, reservas);
  }

  @Test
  void lasCanchasSeListanDesdeEscenariosConLaFormaDeSiempre() throws Exception {
    when(escenarios.canchas()).thenReturn(List.of(CANCHA_1));
    JsonNode c = cuerpo(mvc.perform(get("/api/canchas")).andExpect(status().isOk())).get(0);
    assertThat(c.get("id").asLong()).isEqualTo(1L);
    assertThat(c.get("nombre").asText()).isEqualTo("Cancha 1 — Sintética F5");
    assertThat(c.get("tipo").asText()).isEqualTo("Fútbol 5");
    assertThat(c.get("superficie").asText()).isEqualTo("Sintética");
    assertThat(c.get("ubicacion").asText()).isEqualTo("Villavicencio");
    assertThat(c.get("precioHora").decimalValue()).isEqualByComparingTo("60000");
    assertThat(c.get("activa").asBoolean()).isTrue();
  }

  @Test
  void lasEscriturasDeHorarioReenvianElTokenYSeRevisaElRol() throws Exception {
    String admin = TestSupport.loginAdmin(mvc, json);
    String jugador = TestSupport.registrarJugador(mvc, json);
    when(escenarios.crearHorario(any(), any()))
        .thenReturn(
            new HorarioDto(
                7L, 2L, DayOfWeek.MONDAY, LocalTime.of(8, 0), LocalTime.of(11, 0), true));
    String body =
        json.writeValueAsString(
            Map.of(
                "canchaId",
                2,
                "diaSemana",
                "MONDAY",
                "horaApertura",
                "08:00",
                "horaCierre",
                "11:00"));

    mvc.perform(
            post("/api/horarios")
                .header("Authorization", "Bearer " + jugador)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isForbidden());
    verify(escenarios, never()).crearHorario(any(), any());

    JsonNode h =
        cuerpo(
            mvc.perform(
                    post("/api/horarios")
                        .header("Authorization", "Bearer " + admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk()));
    // Forma Horario del frontend: cancha anidada
    assertThat(h.get("id").asLong()).isEqualTo(7L);
    assertThat(h.get("cancha").get("id").asLong()).isEqualTo(2L);
    assertThat(h.get("diaSemana").asText()).isEqualTo("MONDAY");
    assertThat(h.get("horaApertura").asText()).isEqualTo("08:00:00");
    assertThat(h.get("activo").asBoolean()).isTrue();

    ArgumentCaptor<HorarioRequest> enviado = ArgumentCaptor.forClass(HorarioRequest.class);
    verify(escenarios).crearHorario(enviado.capture(), eq("Bearer " + admin));
    assertThat(enviado.getValue().horaApertura()).isEqualTo(LocalTime.of(8, 0));
  }

  @Test
  void editarUnaCanchaConElCuerpoDelFrontendConservaSusReglas() throws Exception {
    String admin = TestSupport.loginAdmin(mvc, json);
    when(escenarios.cancha(1L)).thenReturn(CANCHA_1);
    when(escenarios.actualizarCancha(eq(1L), any(), any())).thenReturn(CANCHA_1);
    String body =
        """
        {"nombre":"Cancha 1","tipo":"Fútbol 5","superficie":"Sintética",
         "ubicacion":"Villavicencio","precioHora":65000,"activa":false}
        """;

    mvc.perform(
            put("/api/canchas/1")
                .header("Authorization", "Bearer " + admin)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andExpect(status().isOk());

    ArgumentCaptor<CanchaRequest> enviada = ArgumentCaptor.forClass(CanchaRequest.class);
    verify(escenarios).actualizarCancha(eq(1L), enviada.capture(), eq("Bearer " + admin));
    assertThat(enviada.getValue().precioHora()).isEqualByComparingTo("65000");
    assertThat(enviada.getValue().activa()).isFalse();
    assertThat(enviada.getValue().deporte()).isEqualTo("FUTBOL");
    assertThat(enviada.getValue().horasCancelacion()).isEqualTo(3);
    assertThat(enviada.getValue().porcentajeAbono()).isEqualTo(50);
  }

  // --- Pagos: la reserva viene del proveedor 2 ---

  @Test
  void jugadorNoPuedeIniciarElPagoDeUnaReservaAjena() throws Exception {
    Sesion dueno = TestSupport.nuevoJugador(mvc, json);
    Sesion otro = TestSupport.nuevoJugador(mvc, json);
    when(reservas.una(50L))
        .thenReturn(reserva(50L, dueno.id(), enDias(6, 20), EstadoReserva.PENDIENTE));

    mvc.perform(post("/api/pagos/iniciar/50").header("Authorization", otro.bearer()))
        .andExpect(status().isForbidden());
    // El permiso se revisa en ReservaCancha: la solicitud ajena nunca llega a servicio-pagos
    verify(pagos, never()).registrar(any());

    when(pagos.registrar(any()))
        .thenReturn(
            new IntencionPagoDto(
                1L, 50L, "RC-50-1", 6_000_000L, "COP", "a".repeat(64), "pub", "PENDIENTE"));
    JsonNode res =
        cuerpo(
            mvc.perform(post("/api/pagos/iniciar/50").header("Authorization", dueno.bearer()))
                .andExpect(status().isOk()));
    assertThat(res.get("firmaIntegridad").asText()).hasSize(64);
    assertThat(res.get("reservaId").asLong()).isEqualTo(50L);
  }

  @Test
  void elWebhookAprobadoMarcaLaReservaPagadaEnServicioReservas() throws Exception {
    Sesion dueno = TestSupport.nuevoJugador(mvc, json);
    ReservaDto r = reserva(60L, dueno.id(), enDias(8, 7), EstadoReserva.PENDIENTE);
    when(reservas.una(60L)).thenReturn(r);
    when(reservas.cambiarEstado(60L, EstadoReserva.PAGADA))
        .thenReturn(conEstado(r, EstadoReserva.PAGADA));
    when(escenarios.cancha(1L)).thenReturn(CANCHA_1);
    Instant ahora = Instant.now();
    when(pagos.notificar(any()))
        .thenReturn(
            new PagoDto(
                5L,
                60L,
                BigDecimal.valueOf(60000),
                "COP",
                "RC-60-1",
                "tx-1",
                "APROBADO",
                ahora,
                ahora));

    JsonNode res =
        cuerpo(
            mvc.perform(
                    post("/api/wompi/webhook")
                        .header("X-Webhook-Secret", eventsSecret)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                            "{\"referencia\":\"RC-60-1\",\"transactionId\":\"tx-1\",\"status\":\"APPROVED\"}"))
                .andExpect(status().isOk()));
    assertThat(res.get("reservaEstado").asText()).isEqualTo("PAGADA");
    verify(reservas).cambiarEstado(60L, EstadoReserva.PAGADA);
  }

  @Test
  void elResumenDelAdministradorCuentaLasReservasDeServicioReservas() throws Exception {
    String admin = TestSupport.loginAdmin(mvc, json);
    when(reservas.todas())
        .thenReturn(
            List.of(
                reserva(70L, 1L, enDias(1, 9), EstadoReserva.PENDIENTE),
                reserva(71L, 1L, enDias(1, 10), EstadoReserva.CANCELADA)));
    when(pagos.todos()).thenReturn(List.of());

    JsonNode res =
        cuerpo(
            mvc.perform(get("/api/admin/resumen").header("Authorization", "Bearer " + admin))
                .andExpect(status().isOk()));
    assertThat(res.get("totalReservas").asInt()).isEqualTo(2);
    assertThat(res.get("totalPagos").asInt()).isZero();
  }
}
