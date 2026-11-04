package co.edu.usta.reservacancha.escenarios;

import co.edu.usta.reservacancha.common.ServicioRemoto;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.function.Supplier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/**
 * Cliente HTTP hacia el Proveedor 1, servicio-escenarios (:8081): canchas, horarios, franjas de
 * operación y cotización de una reserva. Las lecturas son públicas; las escrituras reenvían el
 * {@code Authorization} del usuario, porque el proveedor valida el mismo JWT que emite esta
 * aplicación.
 */
@Component
public class EscenariosClient {

  private static final String SERVICIO = "escenarios";

  private static final ParameterizedTypeReference<List<CanchaDto>> CANCHAS =
      new ParameterizedTypeReference<>() {};

  private static final ParameterizedTypeReference<List<HorarioDto>> HORARIOS =
      new ParameterizedTypeReference<>() {};

  private final RestClient rest;
  private final ObjectMapper json;
  private final String baseUrl;

  public EscenariosClient(
      RestClient.Builder builder,
      ObjectMapper json,
      @Value("${app.servicio-escenarios.url}") String baseUrl,
      @Value("${app.servicio-escenarios.timeout-ms:5000}") long timeoutMs) {
    this.json = json;
    this.baseUrl = baseUrl;
    this.rest = builder.baseUrl(baseUrl).requestFactory(ServicioRemoto.fabrica(timeoutMs)).build();
  }

  /** Canchas activas. */
  public List<CanchaDto> canchas() {
    return llamar(() -> rest.get().uri("/api/canchas").retrieve().body(CANCHAS));
  }

  /** Una cancha, aunque esté inactiva; 404 «Cancha no existe». */
  public CanchaDto cancha(Long id) {
    return llamar(() -> rest.get().uri("/api/canchas/{id}", id).retrieve().body(CanchaDto.class));
  }

  public CanchaDto crearCancha(CanchaRequest req, String authorization) {
    return llamar(
        () ->
            rest.post()
                .uri("/api/canchas")
                .headers(h -> autorizacion(h, authorization))
                .body(req)
                .retrieve()
                .body(CanchaDto.class));
  }

  public CanchaDto actualizarCancha(Long id, CanchaRequest req, String authorization) {
    return llamar(
        () ->
            rest.put()
                .uri("/api/canchas/{id}", id)
                .headers(h -> autorizacion(h, authorization))
                .body(req)
                .retrieve()
                .body(CanchaDto.class));
  }

  /** Horarios activos de una cancha; 404 si la cancha no existe. */
  public List<HorarioDto> horarios(Long canchaId) {
    return llamar(
        () -> rest.get().uri("/api/canchas/{id}/horarios", canchaId).retrieve().body(HORARIOS));
  }

  public HorarioDto crearHorario(HorarioRequest req, String authorization) {
    return llamar(
        () ->
            rest.post()
                .uri("/api/horarios")
                .headers(h -> autorizacion(h, authorization))
                .body(req)
                .retrieve()
                .body(HorarioDto.class));
  }

  public HorarioDto actualizarHorario(Long id, HorarioRequest req, String authorization) {
    return llamar(
        () ->
            rest.put()
                .uri("/api/horarios/{id}", id)
                .headers(h -> autorizacion(h, authorization))
                .body(req)
                .retrieve()
                .body(HorarioDto.class));
  }

  /** Baja lógica del horario en el proveedor (204). */
  public void eliminarHorario(Long id, String authorization) {
    llamar(
        () ->
            rest.delete()
                .uri("/api/horarios/{id}", id)
                .headers(h -> autorizacion(h, authorization))
                .retrieve()
                .toBodilessEntity());
  }

  /** Franjas de 1 h dentro del horario de la cancha ese día (sin ocupación). */
  public FranjasDto franjas(Long canchaId, LocalDate fecha) {
    return llamar(
        () ->
            rest.get()
                .uri("/api/canchas/{id}/franjas?fecha={fecha}", canchaId, fecha)
                .retrieve()
                .body(FranjasDto.class));
  }

  /**
   * Valida la reserva contra las reglas de la cancha y calcula su valor. 400 con el mensaje de la
   * regla incumplida; 404 si la cancha no existe.
   */
  public CotizacionDto cotizar(Long canchaId, LocalDate fecha, LocalTime inicio, LocalTime fin) {
    return llamar(
        () ->
            rest.get()
                .uri(
                    "/api/canchas/{id}/cotizacion?fecha={fecha}&horaInicio={inicio}&horaFin={fin}",
                    canchaId,
                    fecha,
                    inicio,
                    fin)
                .retrieve()
                .body(CotizacionDto.class));
  }

  private static void autorizacion(HttpHeaders h, String authorization) {
    if (authorization != null) h.set(HttpHeaders.AUTHORIZATION, authorization);
  }

  private <T> T llamar(Supplier<T> solicitud) {
    return ServicioRemoto.llamar(SERVICIO, baseUrl, json, solicitud);
  }
}
