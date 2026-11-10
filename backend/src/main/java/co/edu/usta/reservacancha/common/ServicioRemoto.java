package co.edu.usta.reservacancha.common;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.http.HttpClient;
import java.time.Duration;
import java.util.function.Supplier;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.server.ResponseStatusException;

/**
 * Apoyo común de los clientes HTTP hacia los proveedores (servicio-escenarios y servicio-reservas):
 * la fábrica de conexiones con sus tiempos de espera y la traducción de las fallas del proveedor a
 * respuestas para el usuario, con el mismo criterio que {@code PagosClient}.
 */
public final class ServicioRemoto {

  private static final Logger log = LoggerFactory.getLogger(ServicioRemoto.class);

  private ServicioRemoto() {}

  /**
   * Conexiones con el cliente HTTP del JDK (admite PATCH, que el proveedor de reservas usa para
   * cambiar el estado): {@code timeoutMs} para conectar y otro tanto para esperar la respuesta. En
   * local el proveedor apagado rechaza la conexión al instante; en Render, recién encendido, la
   * primera conexión segura puede tardar más de 2 s.
   */
  public static JdkClientHttpRequestFactory fabrica(long timeoutMs) {
    HttpClient http =
        HttpClient.newBuilder()
            .version(HttpClient.Version.HTTP_1_1)
            .connectTimeout(Duration.ofMillis(timeoutMs))
            .build();
    JdkClientHttpRequestFactory fabrica = new JdkClientHttpRequestFactory(http);
    fabrica.setReadTimeout(Duration.ofMillis(timeoutMs));
    return fabrica;
  }

  /**
   * Ejecuta la solicitud y traduce sus fallas: si el proveedor no contesta, 503; si contesta con un
   * error de negocio (400, 404, 409), el mismo código y su mensaje; si falla por dentro o rechaza
   * las credenciales de esta aplicación (5xx, 401, 403), 502.
   *
   * @param servicio nombre corto para los mensajes, p. ej. "escenarios"
   */
  public static <T> T llamar(
      String servicio, String baseUrl, ObjectMapper json, Supplier<T> solicitud) {
    try {
      return solicitud.get();
    } catch (ResourceAccessException e) {
      log.warn("El servicio de {} no responde en {}: {}", servicio, baseUrl, e.getMessage());
      throw new ResponseStatusException(
          HttpStatus.SERVICE_UNAVAILABLE,
          "El servicio de "
              + servicio
              + " no responde en "
              + baseUrl
              + ". Verifique que esté en ejecución.");
    } catch (RestClientResponseException e) {
      HttpStatusCode estado = e.getStatusCode();
      String mensaje = mensajeDe(json, e);
      if (estado.is5xxServerError() || estado.value() == 401 || estado.value() == 403) {
        throw new ResponseStatusException(
            HttpStatus.BAD_GATEWAY, "Servicio de " + servicio + ": " + mensaje);
      }
      throw new ResponseStatusException(estado, mensaje);
    }
  }

  /** Los proveedores responden {@code {"status", "error", "ts"}}: se toma el mensaje. */
  private static String mensajeDe(ObjectMapper json, RestClientResponseException e) {
    try {
      JsonNode cuerpo = json.readTree(e.getResponseBodyAsString());
      if (cuerpo.hasNonNull("error")) return cuerpo.get("error").asText();
    } catch (Exception ignorada) {
      // cuerpo que no es JSON
    }
    return e.getStatusText();
  }
}
