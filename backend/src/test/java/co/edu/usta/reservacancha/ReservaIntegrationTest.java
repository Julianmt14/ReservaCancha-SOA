package co.edu.usta.reservacancha;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

@SpringBootTest
@AutoConfigureMockMvc
class ReservaIntegrationTest {

  /** Cada prueba usa una fecha distinta para que no choquen entre si (la base H2 se comparte). */
  private static final AtomicInteger DIA = new AtomicInteger(60);

  @Autowired MockMvc mvc;
  @Autowired ObjectMapper json;

  private static LocalDate fechaNueva() {
    return LocalDate.now().plusDays(DIA.incrementAndGet());
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

  @Test
  void jugadorCreaReservaPendienteConValorCalculado() throws Exception {
    String token = TestSupport.registrarJugador(mvc, json);
    String res =
        reservar(token, 1, fechaNueva(), "10:00:00", "12:00:00")
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    JsonNode r = json.readTree(res);
    assertThat(r.get("estado").asText()).isEqualTo("PENDIENTE");
    assertThat(r.get("valorTotal").decimalValue()).isEqualByComparingTo("120000"); // 2 h x $60.000
    assertThat(r.get("usuario").has("password")).as("la respuesta no expone el hash").isFalse();
  }

  @Test
  void reservaConTraslapeResponde409() throws Exception {
    String token = TestSupport.registrarJugador(mvc, json);
    LocalDate fecha = fechaNueva();
    reservar(token, 1, fecha, "14:00:00", "16:00:00").andExpect(status().isOk());
    reservar(token, 1, fecha, "15:00:00", "17:00:00").andExpect(status().isConflict());
    reservar(token, 1, fecha, "16:00:00", "17:00:00")
        .andExpect(status().isOk()); // contigua: no choca
  }

  @Test
  void reservaEnElPasadoResponde400() throws Exception {
    String token = TestSupport.registrarJugador(mvc, json);
    reservar(token, 1, LocalDate.now().minusDays(1), "10:00:00", "11:00:00")
        .andExpect(status().isBadRequest());
  }

  @Test
  void horaFinAnteriorAHoraInicioResponde400() throws Exception {
    String token = TestSupport.registrarJugador(mvc, json);
    reservar(token, 1, fechaNueva(), "12:00:00", "10:00:00").andExpect(status().isBadRequest());
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
  }

  @Test
  void sinTokenNoSePuedeReservar() throws Exception {
    reservar(null, 1, fechaNueva(), "10:00:00", "11:00:00").andExpect(status().is4xxClientError());
  }

  @Test
  void soloElDuenoOElPersonalCancelanUnaReserva() throws Exception {
    String dueno = TestSupport.registrarJugador(mvc, json);
    String otro = TestSupport.registrarJugador(mvc, json);
    long id =
        json.readTree(
                reservar(dueno, 1, fechaNueva(), "08:00:00", "09:00:00")
                    .andReturn()
                    .getResponse()
                    .getContentAsString())
            .get("id")
            .asLong();

    mvc.perform(post("/api/reservas/" + id + "/cancelar").header("Authorization", "Bearer " + otro))
        .andExpect(status().isForbidden());
    mvc.perform(
            post("/api/reservas/" + id + "/cancelar").header("Authorization", "Bearer " + dueno))
        .andExpect(status().isOk());
  }

  @Test
  void unaReservaCanceladaLiberaElHorario() throws Exception {
    String token = TestSupport.registrarJugador(mvc, json);
    LocalDate fecha = fechaNueva();
    long id =
        json.readTree(
                reservar(token, 1, fecha, "18:00:00", "19:00:00")
                    .andReturn()
                    .getResponse()
                    .getContentAsString())
            .get("id")
            .asLong();
    mvc.perform(
            post("/api/reservas/" + id + "/cancelar").header("Authorization", "Bearer " + token))
        .andExpect(status().isOk());
    reservar(token, 1, fecha, "18:00:00", "19:00:00").andExpect(status().isOk());
  }

  @Test
  void jugadorNoPuedeIniciarElPagoDeUnaReservaAjena() throws Exception {
    String dueno = TestSupport.registrarJugador(mvc, json);
    String otro = TestSupport.registrarJugador(mvc, json);
    long id =
        json.readTree(
                reservar(dueno, 1, fechaNueva(), "20:00:00", "21:00:00")
                    .andReturn()
                    .getResponse()
                    .getContentAsString())
            .get("id")
            .asLong();

    mvc.perform(post("/api/pagos/iniciar/" + id).header("Authorization", "Bearer " + otro))
        .andExpect(status().isForbidden());
    String res =
        mvc.perform(post("/api/pagos/iniciar/" + id).header("Authorization", "Bearer " + dueno))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    assertThat(json.readTree(res).get("firmaIntegridad").asText()).hasSize(64);
  }

  @Test
  void laDisponibilidadSigueElHorarioConfiguradoDeLaCancha() throws Exception {
    String admin = TestSupport.loginAdmin(mvc, json);
    LocalDate lunes =
        LocalDate.now().plusWeeks(40).with(TemporalAdjusters.nextOrSame(DayOfWeek.MONDAY));
    mvc.perform(
            post("/api/horarios")
                .header("Authorization", "Bearer " + admin)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    json.writeValueAsString(
                        Map.of(
                            "canchaId",
                            2,
                            "diaSemana",
                            "MONDAY",
                            "horaApertura",
                            "08:00",
                            "horaCierre",
                            "11:00"))))
        .andExpect(status().isOk());

    String res =
        mvc.perform(
                get("/api/disponibilidad").param("canchaId", "2").param("fecha", lunes.toString()))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    JsonNode libres = json.readTree(res).get("libres");
    assertThat(libres).hasSize(3); // 08-09, 09-10, 10-11
    assertThat(libres.get(0).get("inicio").asText()).startsWith("08:00");
    assertThat(libres.get(2).get("fin").asText()).startsWith("11:00");
  }
}
