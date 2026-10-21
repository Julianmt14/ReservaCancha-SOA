package co.edu.usta.reservacancha;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import co.edu.usta.reservacancha.pago.PagosClient;
import co.edu.usta.reservacancha.pago.RegistrarPagoRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.net.ServerSocket;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

/** Sin Spring: el cliente apunta a un puerto donde no hay nadie escuchando. */
class PagosClientTest {

  @Test
  void siElServicioDePagosEstaApagadoResponde503ConUnMensajeClaro() throws Exception {
    int puertoLibre;
    try (ServerSocket s = new ServerSocket(0)) {
      puertoLibre = s.getLocalPort();
    }
    String url = "http://localhost:" + puertoLibre;
    PagosClient cliente =
        new PagosClient(RestClient.builder(), new ObjectMapper(), url, "clave", 2000);

    assertThatThrownBy(() -> cliente.registrar(new RegistrarPagoRequest(1L, BigDecimal.TEN)))
        .isInstanceOfSatisfying(
            ResponseStatusException.class,
            e -> {
              assertThat(e.getStatusCode()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
              assertThat(e.getReason()).contains("no responde").contains(url);
            });
  }
}
