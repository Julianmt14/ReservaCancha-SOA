package co.edu.usta.reservacancha.reservas;

import co.edu.usta.reservacancha.common.ServicioRemoto;
import co.edu.usta.reservacancha.reserva.EstadoReserva;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDate;
import java.util.List;
import java.util.function.Supplier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/**
 * Cliente HTTP hacia el Proveedor 2, servicio-reservas (:8082): reservas y horarios ocupados. El
 * proveedor solo atiende a esta aplicación, que se identifica con {@code X-Api-Key}.
 */
@Component
public class ReservasClient {

  private static final String SERVICIO = "reservas";

  private static final ParameterizedTypeReference<List<ReservaDto>> RESERVAS =
      new ParameterizedTypeReference<>() {};

  private static final ParameterizedTypeReference<List<OcupacionDto>> OCUPACION =
      new ParameterizedTypeReference<>() {};

  private final RestClient rest;
  private final ObjectMapper json;
  private final String baseUrl;

  public ReservasClient(
      RestClient.Builder builder,
      ObjectMapper json,
      @Value("${app.servicio-reservas.url}") String baseUrl,
      @Value("${app.servicio-reservas.api-key}") String apiKey,
      @Value("${app.servicio-reservas.timeout-ms:5000}") long timeoutMs) {
    this.json = json;
    this.baseUrl = baseUrl;
    this.rest =
        builder
            .baseUrl(baseUrl)
            .requestFactory(ServicioRemoto.fabrica(timeoutMs))
            .defaultHeader("X-Api-Key", apiKey)
            .build();
  }

  /** Crea la reserva PENDIENTE; 409 si el horario ya está ocupado. */
  public ReservaDto crear(NuevaReservaRequest req) {
    return llamar(
        () -> rest.post().uri("/api/reservas").body(req).retrieve().body(ReservaDto.class));
  }

  /** Una reserva; 404 «Reserva no existe». */
  public ReservaDto una(Long id) {
    return llamar(() -> rest.get().uri("/api/reservas/{id}", id).retrieve().body(ReservaDto.class));
  }

  /** Todas las reservas, ordenadas por fecha y hora (incluye canceladas). */
  public List<ReservaDto> todas() {
    return llamar(() -> rest.get().uri("/api/reservas").retrieve().body(RESERVAS));
  }

  public List<ReservaDto> porUsuario(Long usuarioId) {
    return llamar(
        () -> rest.get().uri("/api/reservas?usuarioId={u}", usuarioId).retrieve().body(RESERVAS));
  }

  /** Reservas de una cancha desde una fecha (incluye canceladas). */
  public List<ReservaDto> porCancha(Long canchaId, LocalDate desde) {
    return llamar(
        () ->
            rest.get()
                .uri("/api/reservas?canchaId={c}&desde={d}", canchaId, desde)
                .retrieve()
                .body(RESERVAS));
  }

  /** Bloques ocupados de una cancha en una fecha, sin las canceladas. */
  public List<OcupacionDto> ocupacion(Long canchaId, LocalDate fecha) {
    return llamar(
        () ->
            rest.get()
                .uri("/api/reservas/ocupacion?canchaId={c}&fecha={f}", canchaId, fecha)
                .retrieve()
                .body(OCUPACION));
  }

  /** PENDIENTE → PAGADA o → CANCELADA (libera el horario); 409 si la transición no aplica. */
  public ReservaDto cambiarEstado(Long id, EstadoReserva estado) {
    return llamar(
        () ->
            rest.patch()
                .uri("/api/reservas/{id}/estado", id)
                .body(new CambioEstadoRequest(estado))
                .retrieve()
                .body(ReservaDto.class));
  }

  private <T> T llamar(Supplier<T> solicitud) {
    return ServicioRemoto.llamar(SERVICIO, baseUrl, json, solicitud);
  }
}
