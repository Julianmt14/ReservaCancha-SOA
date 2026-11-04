package co.edu.usta.reservacancha;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import co.edu.usta.reservacancha.escenarios.CotizacionDto;
import co.edu.usta.reservacancha.escenarios.EscenariosClient;
import co.edu.usta.reservacancha.escenarios.HorarioDto;
import co.edu.usta.reservacancha.escenarios.HorarioRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

/** Sin Spring: el cliente del Proveedor 1 contra un servidor falso o un puerto cerrado. */
class EscenariosClientTest {

  private static final LocalDate FECHA = LocalDate.of(2026, 10, 30);

  private static EscenariosClient cliente(String url) {
    return new EscenariosClient(RestClient.builder(), new ObjectMapper(), url, 2000);
  }

  @Test
  void siElServicioDeEscenariosEstaApagadoResponde503ConUnMensajeClaro() throws Exception {
    String url = ServidorFalso.urlApagada();
    assertThatThrownBy(() -> cliente(url).cancha(1L))
        .isInstanceOfSatisfying(
            ResponseStatusException.class,
            e -> {
              assertThat(e.getStatusCode()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
              assertThat(e.getReason())
                  .contains("servicio de escenarios no responde")
                  .contains(url);
            });
  }

  @Test
  void laCotizacionViajaComoConsultaYSeLeeSuRespuesta() throws Exception {
    try (ServidorFalso p1 = new ServidorFalso()) {
      p1.responder(
          200,
          """
          {"canchaId":1,"fecha":"2026-10-30","horaInicio":"21:00:00","horaFin":"22:00:00",
           "minutos":60,"valorTotal":60000.00,"valorAbono":30000.00,"horasCancelacion":3}
          """);
      CotizacionDto c =
          cliente(p1.url()).cotizar(1L, FECHA, LocalTime.of(21, 0), LocalTime.of(22, 0));

      assertThat(c.valorTotal()).isEqualByComparingTo("60000");
      assertThat(c.horaInicio()).isEqualTo(LocalTime.of(21, 0));
      assertThat(p1.ultima().metodo()).isEqualTo("GET");
      // El cliente codifica ":" como %3A; el proveedor recibe las horas decodificadas
      assertThat(URLDecoder.decode(p1.ultima().ruta(), StandardCharsets.UTF_8))
          .isEqualTo("/api/canchas/1/cotizacion?fecha=2026-10-30&horaInicio=21:00&horaFin=22:00");
    }
  }

  @Test
  void unErrorDeNegocioDelProveedorConservaSuCodigoYSuMensaje() throws Exception {
    try (ServidorFalso p1 = new ServidorFalso()) {
      p1.responder(404, "{\"status\":404,\"error\":\"Cancha no existe\",\"ts\":\"x\"}");
      assertThatThrownBy(() -> cliente(p1.url()).cancha(99L))
          .isInstanceOfSatisfying(
              ResponseStatusException.class,
              e -> {
                assertThat(e.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
                assertThat(e.getReason()).isEqualTo("Cancha no existe");
              });

      p1.responder(
          400, "{\"status\":400,\"error\":\"La reserva mínima es de 60 minutos\",\"ts\":\"x\"}");
      assertThatThrownBy(
              () -> cliente(p1.url()).cotizar(1L, FECHA, LocalTime.of(21, 0), LocalTime.of(21, 30)))
          .isInstanceOfSatisfying(
              ResponseStatusException.class,
              e -> {
                assertThat(e.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
                assertThat(e.getReason()).isEqualTo("La reserva mínima es de 60 minutos");
              });
    }
  }

  @Test
  void unaFallaInternaOUnTokenRechazadoPorElProveedorResponde502() throws Exception {
    try (ServidorFalso p1 = new ServidorFalso()) {
      p1.responder(500, "{\"status\":500,\"error\":\"Error interno\"}");
      assertThatThrownBy(() -> cliente(p1.url()).canchas())
          .isInstanceOfSatisfying(
              ResponseStatusException.class,
              e -> {
                assertThat(e.getStatusCode()).isEqualTo(HttpStatus.BAD_GATEWAY);
                assertThat(e.getReason()).isEqualTo("Servicio de escenarios: Error interno");
              });

      p1.responder(401, "{\"status\":401,\"error\":\"Token inválido\"}");
      assertThatThrownBy(() -> cliente(p1.url()).eliminarHorario(1L, "Bearer x"))
          .isInstanceOfSatisfying(
              ResponseStatusException.class,
              e -> assertThat(e.getStatusCode()).isEqualTo(HttpStatus.BAD_GATEWAY));
    }
  }

  @Test
  void lasEscriturasReenvianElTokenDelUsuarioYLasHorasComoTexto() throws Exception {
    try (ServidorFalso p1 = new ServidorFalso()) {
      p1.responder(
          201,
          """
          {"id":7,"canchaId":2,"diaSemana":"MONDAY","horaApertura":"08:00:00",
           "horaCierre":"11:00:00","activo":true}
          """);
      HorarioDto h =
          cliente(p1.url())
              .crearHorario(
                  new HorarioRequest(2L, DayOfWeek.MONDAY, LocalTime.of(8, 0), LocalTime.of(11, 0)),
                  "Bearer token-del-admin");

      assertThat(h.id()).isEqualTo(7L);
      assertThat(h.canchaId()).isEqualTo(2L);
      assertThat(p1.ultima().metodo()).isEqualTo("POST");
      assertThat(p1.ultima().ruta()).isEqualTo("/api/horarios");
      assertThat(p1.ultima().headers().getFirst("Authorization"))
          .isEqualTo("Bearer token-del-admin");
      assertThat(new ObjectMapper().readTree(p1.ultima().cuerpo()).get("horaApertura").asText())
          .isEqualTo("08:00:00");
    }
  }
}
