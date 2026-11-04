package co.edu.usta.servicioreservas;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import co.edu.usta.servicioreservas.reserva.BloqueReservadoRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

@SpringBootTest
@AutoConfigureMockMvc
class ReservaControllerTest {

  /** Cada prueba usa una cancha (y un usuario) distinta porque la base H2 se comparte. */
  private static final AtomicLong CANCHA = new AtomicLong(100);

  private static final AtomicLong USUARIO = new AtomicLong(500);

  /** Fecha futura calculada: las pruebas no dependen del día en que se ejecuten. */
  private static final LocalDate FECHA = LocalDate.now().plusDays(7);

  @Autowired MockMvc mvc;
  @Autowired ObjectMapper json;
  @Autowired BloqueReservadoRepository bloques;

  @Value("${app.api-key}")
  String clave;

  private MockHttpServletRequestBuilder conClave(MockHttpServletRequestBuilder req) {
    return req.header("X-Api-Key", clave).contentType(MediaType.APPLICATION_JSON);
  }

  private ResultActions crear(long usuarioId, long canchaId, String inicio, String fin)
      throws Exception {
    return crear(usuarioId, canchaId, FECHA, inicio, fin);
  }

  private ResultActions crear(
      long usuarioId, long canchaId, LocalDate fecha, String inicio, String fin) throws Exception {
    Map<String, Object> cuerpo =
        Map.of(
            "usuarioId", usuarioId,
            "canchaId", canchaId,
            "fecha", fecha.toString(),
            "horaInicio", inicio,
            "horaFin", fin,
            "valorTotal", 90000);
    return mvc.perform(conClave(post("/api/reservas")).content(json.writeValueAsString(cuerpo)));
  }

  private JsonNode crearOk(long usuarioId, long canchaId, String inicio, String fin)
      throws Exception {
    return leer(crear(usuarioId, canchaId, inicio, fin).andExpect(status().isCreated()));
  }

  private ResultActions cambiarEstado(long id, String estado) throws Exception {
    return mvc.perform(
        conClave(patch("/api/reservas/" + id + "/estado"))
            .content(json.writeValueAsString(Map.of("estado", estado))));
  }

  private JsonNode leer(ResultActions res) throws Exception {
    return json.readTree(res.andReturn().getResponse().getContentAsString());
  }

  @Test
  void crearDevuelve201ConLaReservaPendiente() throws Exception {
    long cancha = CANCHA.incrementAndGet();
    JsonNode r = crearOk(2, cancha, "21:00", "22:00");

    assertThat(r.get("id").asLong()).isPositive();
    assertThat(r.get("usuarioId").asLong()).isEqualTo(2);
    assertThat(r.get("canchaId").asLong()).isEqualTo(cancha);
    assertThat(r.get("fecha").asText()).isEqualTo(FECHA.toString());
    assertThat(r.get("horaInicio").asText()).isEqualTo("21:00:00");
    assertThat(r.get("horaFin").asText()).isEqualTo("22:00:00");
    assertThat(r.get("valorTotal").decimalValue()).isEqualByComparingTo(new BigDecimal("90000"));
    assertThat(r.get("estado").asText()).isEqualTo("PENDIENTE");
    assertThat(r.get("creadoEn").asText()).endsWith("Z");
    assertThat(r.get("actualizadoEn").asText()).isNotBlank();
    // 21:00–22:00 ocupa dos bloques de 30 minutos
    assertThat(bloques.countByReservaId(r.get("id").asLong())).isEqualTo(2);

    mvc.perform(conClave(get("/api/reservas/" + r.get("id").asLong())))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.estado").value("PENDIENTE"));
  }

  @Test
  void elMismoRangoRespondeConflicto409() throws Exception {
    long cancha = CANCHA.incrementAndGet();
    crearOk(2, cancha, "21:00", "22:00");

    crear(3, cancha, "21:00:00", "22:00:00")
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.status").value(409))
        .andExpect(
            jsonPath("$.error").value("Conflicto de horario: ya existe una reserva en ese rango"))
        .andExpect(jsonPath("$.ts").exists());
  }

  @Test
  void unRangoQueSeTraslapaParcialmenteRespondeConflicto409() throws Exception {
    long cancha = CANCHA.incrementAndGet();
    crearOk(2, cancha, "21:00", "22:00");

    crear(3, cancha, "21:30", "22:30").andExpect(status().isConflict());
    crear(3, cancha, "20:30", "21:30").andExpect(status().isConflict());
  }

  @Test
  void unRangoContiguoSiSePuedeReservar() throws Exception {
    long cancha = CANCHA.incrementAndGet();
    crearOk(2, cancha, "21:00", "22:00");

    crear(3, cancha, "22:00", "23:00").andExpect(status().isCreated());
    crear(3, cancha, "20:00", "21:00").andExpect(status().isCreated());
  }

  @Test
  void laMismaHoraEnOtraCanchaUOtroDiaSiSePuedeReservar() throws Exception {
    long cancha = CANCHA.incrementAndGet();
    crearOk(2, cancha, "21:00", "22:00");

    crear(3, CANCHA.incrementAndGet(), "21:00", "22:00").andExpect(status().isCreated());
    crear(3, cancha, FECHA.plusDays(1), "21:00", "22:00").andExpect(status().isCreated());
  }

  @Test
  void horasInvalidasResponden400() throws Exception {
    long cancha = CANCHA.incrementAndGet();
    crear(2, cancha, "22:00", "21:00")
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.error").value("horaFin debe ser mayor a horaInicio"));
    crear(2, cancha, "21:00", "21:00").andExpect(status().isBadRequest());
    crear(2, cancha, "21:15", "22:15")
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.error").value("Las horas deben ser en punto o y media"));
    mvc.perform(conClave(post("/api/reservas")).content("{\"usuarioId\":2}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.status").value(400));
  }

  @Test
  void sinApiKeyRespondeNoAutorizado() throws Exception {
    mvc.perform(
            post("/api/reservas")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"usuarioId\":1,\"canchaId\":1}"))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.status").value(401));
    mvc.perform(get("/api/reservas").header("X-Api-Key", "otra-clave"))
        .andExpect(status().isUnauthorized());
    mvc.perform(get("/api/reservas/ocupacion?canchaId=1&fecha=" + FECHA))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void elPingNoPideClave() throws Exception {
    mvc.perform(get("/api/ping"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.servicio").value("servicio-reservas"))
        .andExpect(jsonPath("$.estado").value("ok"));
  }

  @Test
  void unaReservaQueNoExisteResponde404() throws Exception {
    mvc.perform(conClave(get("/api/reservas/999999")))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.error").value("Reserva no existe"));
    cambiarEstado(999999, "CANCELADA").andExpect(status().isNotFound());
  }

  @Test
  void cancelarLiberaElHorario() throws Exception {
    long cancha = CANCHA.incrementAndGet();
    long id = crearOk(2, cancha, "21:00", "22:00").get("id").asLong();

    cambiarEstado(id, "CANCELADA")
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.estado").value("CANCELADA"));
    assertThat(bloques.countByReservaId(id)).isZero();

    // El horario quedó libre: otro usuario lo puede reservar
    crear(3, cancha, "21:00", "22:00").andExpect(status().isCreated());
  }

  @Test
  void cancelarDosVecesRespondeConflicto409() throws Exception {
    long id = crearOk(2, CANCHA.incrementAndGet(), "21:00", "22:00").get("id").asLong();
    cambiarEstado(id, "CANCELADA").andExpect(status().isOk());

    cambiarEstado(id, "CANCELADA")
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.error").value("La reserva ya está cancelada"));
  }

  @Test
  void pagarPasaDePendienteAPagadaYSoloUnaVez() throws Exception {
    long cancha = CANCHA.incrementAndGet();
    long id = crearOk(2, cancha, "21:00", "22:00").get("id").asLong();

    cambiarEstado(id, "PAGADA")
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.estado").value("PAGADA"));
    cambiarEstado(id, "PAGADA")
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.error").value("La reserva no está pendiente"));
    // Una reserva pagada sigue ocupando la cancha
    crear(3, cancha, "21:00", "22:00").andExpect(status().isConflict());

    // PAGADA -> CANCELADA libera los bloques; una cancelada ya no se puede pagar
    cambiarEstado(id, "CANCELADA").andExpect(status().isOk());
    assertThat(bloques.countByReservaId(id)).isZero();
    cambiarEstado(id, "PAGADA").andExpect(status().isConflict());

    cambiarEstado(id, "PENDIENTE").andExpect(status().isBadRequest());
    cambiarEstado(id, "OTRO").andExpect(status().isBadRequest());
  }

  @Test
  void laOcupacionNoIncluyeLasCanceladas() throws Exception {
    long cancha = CANCHA.incrementAndGet();
    long activa = crearOk(2, cancha, "18:00", "19:30").get("id").asLong();
    long cancelada = crearOk(3, cancha, "20:00", "21:00").get("id").asLong();
    cambiarEstado(cancelada, "CANCELADA").andExpect(status().isOk());

    mvc.perform(
            conClave(get("/api/reservas/ocupacion"))
                .param("canchaId", String.valueOf(cancha))
                .param("fecha", FECHA.toString()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$", hasSize(1)))
        .andExpect(jsonPath("$[0].reservaId").value(activa))
        .andExpect(jsonPath("$[0].inicio").value("18:00"))
        .andExpect(jsonPath("$[0].fin").value("19:30"))
        .andExpect(jsonPath("$[0].estado").value("PENDIENTE"));

    mvc.perform(conClave(get("/api/reservas/ocupacion")).param("canchaId", "1"))
        .andExpect(status().isBadRequest());
  }

  @Test
  void listarPorUsuarioOrdenaPorFechaYHoraEIncluyeCanceladas() throws Exception {
    long usuario = USUARIO.incrementAndGet();
    long cancha = CANCHA.incrementAndGet();
    crear(usuario, cancha, FECHA.plusDays(1), "08:00", "09:00").andExpect(status().isCreated());
    crearOk(usuario, cancha, "19:00", "20:00");
    long primera = crearOk(usuario, cancha, "07:00", "08:00").get("id").asLong();
    cambiarEstado(primera, "CANCELADA").andExpect(status().isOk());
    crearOk(USUARIO.incrementAndGet(), cancha, "10:00", "11:00"); // de otro usuario

    mvc.perform(conClave(get("/api/reservas")).param("usuarioId", String.valueOf(usuario)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$", hasSize(3)))
        .andExpect(jsonPath("$[0].id").value(primera))
        .andExpect(jsonPath("$[0].estado").value("CANCELADA"))
        .andExpect(jsonPath("$[1].horaInicio").value("19:00:00"))
        .andExpect(jsonPath("$[2].fecha").value(FECHA.plusDays(1).toString()));
  }

  @Test
  void listarPorCanchaDesdeUnaFecha() throws Exception {
    long cancha = CANCHA.incrementAndGet();
    crearOk(2, cancha, "09:00", "10:00");
    crear(2, cancha, FECHA.plusDays(3), "09:00", "10:00").andExpect(status().isCreated());

    mvc.perform(
            conClave(get("/api/reservas"))
                .param("canchaId", String.valueOf(cancha))
                .param("desde", FECHA.plusDays(1).toString()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$", hasSize(1)))
        .andExpect(jsonPath("$[0].fecha").value(FECHA.plusDays(3).toString()));

    mvc.perform(conClave(get("/api/reservas")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(org.hamcrest.Matchers.greaterThanOrEqualTo(2)));
  }
}
