package co.edu.usta.reservacancha.pago;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Duration;
import java.util.List;
import java.util.function.Supplier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.server.ResponseStatusException;

/**
 * Cliente HTTP hacia servicio-pagos. Aquí sale la solicitud de ReservaCancha (aplicación
 * consumidora) hacia el proveedor: es el límite entre las dos aplicaciones.
 */
@Component
public class PagosClient {

  private static final ParameterizedTypeReference<List<PagoDto>> LISTA =
      new ParameterizedTypeReference<>() {};

  private final RestClient rest;
  private final ObjectMapper json;
  private final String baseUrl;

  public PagosClient(
      RestClient.Builder builder,
      ObjectMapper json,
      @Value("${app.servicio-pagos.url}") String baseUrl,
      @Value("${app.servicio-pagos.api-key}") String apiKey,
      @Value("${app.servicio-pagos.timeout-ms:15000}") long timeoutMs) {
    SimpleClientHttpRequestFactory http = new SimpleClientHttpRequestFactory();
    http.setConnectTimeout(Duration.ofSeconds(2));
    http.setReadTimeout(Duration.ofMillis(timeoutMs));
    this.json = json;
    this.baseUrl = baseUrl;
    this.rest =
        builder.baseUrl(baseUrl).requestFactory(http).defaultHeader("X-Api-Key", apiKey).build();
  }

  /** registrarPago: POST /api/pagos. */
  public IntencionPagoDto registrar(RegistrarPagoRequest req) {
    return llamar(
        () -> rest.post().uri("/api/pagos").body(req).retrieve().body(IntencionPagoDto.class));
  }

  public List<PagoDto> porReserva(Long reservaId) {
    return llamar(
        () -> rest.get().uri("/api/pagos?reservaId={id}", reservaId).retrieve().body(LISTA));
  }

  public List<PagoDto> todos() {
    return llamar(() -> rest.get().uri("/api/pagos").retrieve().body(LISTA));
  }

  public PagoDto confirmar(ConfirmarPagoRequest req) {
    return llamar(
        () ->
            rest.post().uri("/api/pagos/confirmaciones").body(req).retrieve().body(PagoDto.class));
  }

  public PagoDto notificar(NotificacionPagoRequest req) {
    return llamar(
        () ->
            rest.post().uri("/api/pagos/notificaciones").body(req).retrieve().body(PagoDto.class));
  }

  /**
   * Traduce las fallas del proveedor a respuestas para el usuario: si no contesta, 503; si contesta
   * con un error de negocio (400, 404, 409), el mismo código y su mensaje; si falla por dentro o
   * rechaza la clave de esta aplicación, 502.
   */
  private <T> T llamar(Supplier<T> solicitud) {
    try {
      return solicitud.get();
    } catch (ResourceAccessException e) {
      throw new ResponseStatusException(
          HttpStatus.SERVICE_UNAVAILABLE,
          "El servicio de pagos no responde en " + baseUrl + ". Verifique que esté en ejecución.");
    } catch (RestClientResponseException e) {
      HttpStatusCode estado = e.getStatusCode();
      String mensaje = mensajeDe(e);
      if (estado.is5xxServerError() || estado.value() == 401 || estado.value() == 403) {
        throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Servicio de pagos: " + mensaje);
      }
      throw new ResponseStatusException(estado, mensaje);
    }
  }

  private String mensajeDe(RestClientResponseException e) {
    try {
      JsonNode cuerpo = json.readTree(e.getResponseBodyAsString());
      if (cuerpo.hasNonNull("error")) return cuerpo.get("error").asText();
    } catch (Exception ignorada) {
      // cuerpo que no es JSON
    }
    return e.getStatusText();
  }
}
