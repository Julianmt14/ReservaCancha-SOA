package co.edu.usta.serviciopagos.wompi;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

/** Cliente HTTP hacia Wompi: el servicio de pagos es a su vez consumidor de la pasarela. */
@Component
public class WompiClient {

  private final ObjectMapper json;
  private final String baseUrl;
  private final HttpClient http =
      HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();

  public WompiClient(ObjectMapper json, @Value("${app.wompi.base-url}") String baseUrl) {
    this.json = json;
    this.baseUrl = baseUrl;
  }

  /** GET /transactions/{id}: devuelve el nodo "data" de la transacción. */
  public JsonNode consultarTransaccion(String transactionId) {
    try {
      HttpRequest req =
          HttpRequest.newBuilder(URI.create(baseUrl + "/transactions/" + transactionId))
              .timeout(Duration.ofSeconds(10))
              .GET()
              .build();
      HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString());
      if (res.statusCode() != 200) {
        throw new ResponseStatusException(
            HttpStatus.BAD_GATEWAY, "Wompi respondio " + res.statusCode());
      }
      return json.readTree(res.body()).path("data");
    } catch (ResponseStatusException e) {
      throw e;
    } catch (Exception e) {
      throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "No se pudo consultar a Wompi");
    }
  }
}
