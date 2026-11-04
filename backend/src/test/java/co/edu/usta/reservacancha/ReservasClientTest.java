package co.edu.usta.reservacancha;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import co.edu.usta.reservacancha.reserva.EstadoReserva;
import co.edu.usta.reservacancha.reservas.NuevaReservaRequest;
import co.edu.usta.reservacancha.reservas.ReservaDto;
import co.edu.usta.reservacancha.reservas.ReservasClient;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

/** Sin Spring: el cliente del Proveedor 2 contra un servidor falso o un puerto cerrado. */
class ReservasClientTest {

  private static final String RESERVA =
      """
      {"id":15,"usuarioId":2,"canchaId":2,"fecha":"2026-10-30","horaInicio":"21:00:00",
       "horaFin":"22:00:00","valorTotal":90000.00,"estado":"%s",
       "creadoEn":"2026-10-27T15:00:00Z","actualizadoEn":"2026-10-27T15:00:00Z"}
      """;

  private static ReservasClient cliente(String url) {
    return new ReservasClient(RestClient.builder(), new ObjectMapper(), url, "clave-portal", 2000);
  }

  private static NuevaReservaRequest nueva() {
    return new NuevaReservaRequest(
        2L,
        2L,
        LocalDate.of(2026, 10, 30),
        LocalTime.of(21, 0),
        LocalTime.of(22, 0),
        new BigDecimal("90000.00"));
  }

  @Test
  void siElServicioDeReservasEstaApagadoResponde503ConUnMensajeClaro() throws Exception {
    String url = ServidorFalso.urlApagada();
    assertThatThrownBy(() -> cliente(url).crear(nueva()))
        .isInstanceOfSatisfying(
            ResponseStatusException.class,
            e -> {
              assertThat(e.getStatusCode()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
              assertThat(e.getReason()).contains("servicio de reservas no responde").contains(url);
            });
  }

  @Test
  void crearEnviaLaClaveYElCuerpoDelContrato() throws Exception {
    try (ServidorFalso p2 = new ServidorFalso()) {
      p2.responder(201, RESERVA.formatted("PENDIENTE"));
      ReservaDto r = cliente(p2.url()).crear(nueva());

      assertThat(r.id()).isEqualTo(15L);
      assertThat(r.estado()).isEqualTo(EstadoReserva.PENDIENTE);
      assertThat(r.horaInicio()).isEqualTo(LocalTime.of(21, 0));
      assertThat(p2.ultima().headers().getFirst("X-Api-Key")).isEqualTo("clave-portal");
      JsonNode cuerpo = new ObjectMapper().readTree(p2.ultima().cuerpo());
      assertThat(cuerpo.get("usuarioId").asLong()).isEqualTo(2L);
      assertThat(cuerpo.get("fecha").asText()).isEqualTo("2026-10-30");
      assertThat(cuerpo.get("horaInicio").asText()).isEqualTo("21:00:00");
      assertThat(cuerpo.get("valorTotal").decimalValue()).isEqualByComparingTo("90000");
    }
  }

  @Test
  void elConflictoDeHorarioSePropagaComo409ConSuMensaje() throws Exception {
    try (ServidorFalso p2 = new ServidorFalso()) {
      p2.responder(
          409,
          "{\"status\":409,\"error\":\"Conflicto de horario: ya existe una reserva en ese"
              + " rango\",\"ts\":\"x\"}");
      assertThatThrownBy(() -> cliente(p2.url()).crear(nueva()))
          .isInstanceOfSatisfying(
              ResponseStatusException.class,
              e -> {
                assertThat(e.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
                assertThat(e.getReason())
                    .isEqualTo("Conflicto de horario: ya existe una reserva en ese rango");
              });
    }
  }

  @Test
  void cambiarEstadoUsaPatch() throws Exception {
    try (ServidorFalso p2 = new ServidorFalso()) {
      p2.responder(200, RESERVA.formatted("CANCELADA"));
      ReservaDto r = cliente(p2.url()).cambiarEstado(15L, EstadoReserva.CANCELADA);

      assertThat(r.estado()).isEqualTo(EstadoReserva.CANCELADA);
      assertThat(p2.ultima().metodo()).isEqualTo("PATCH");
      assertThat(p2.ultima().ruta()).isEqualTo("/api/reservas/15/estado");
      assertThat(new ObjectMapper().readTree(p2.ultima().cuerpo()).get("estado").asText())
          .isEqualTo("CANCELADA");
    }
  }

  @Test
  void unaClaveRechazadaPorElProveedorResponde502() throws Exception {
    try (ServidorFalso p2 = new ServidorFalso()) {
      p2.responder(401, "{\"status\":401,\"error\":\"Clave de API inválida\"}");
      assertThatThrownBy(() -> cliente(p2.url()).una(15L))
          .isInstanceOfSatisfying(
              ResponseStatusException.class,
              e -> {
                assertThat(e.getStatusCode()).isEqualTo(HttpStatus.BAD_GATEWAY);
                assertThat(e.getReason()).isEqualTo("Servicio de reservas: Clave de API inválida");
              });
    }
  }
}
