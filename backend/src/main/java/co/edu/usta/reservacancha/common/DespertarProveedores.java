package co.edu.usta.reservacancha.common;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * En el plan gratis de Render los servicios se duermen tras 15 minutos sin uso. Al arrancar, la
 * consumidora llama al ping de cada proveedor para que despierten mientras el usuario abre la
 * página. Solo se activa con {@code app.despertar-proveedores=true} (en local no hace falta).
 */
@Component
@ConditionalOnProperty(name = "app.despertar-proveedores", havingValue = "true")
public class DespertarProveedores {

  private static final Logger log = LoggerFactory.getLogger(DespertarProveedores.class);

  private final List<String> pings;

  public DespertarProveedores(
      @Value("${app.servicio-escenarios.url}") String escenarios,
      @Value("${app.servicio-reservas.url}") String reservas,
      @Value("${app.servicio-pagos.url}") String pagos) {
    this.pings =
        List.of(escenarios + "/api/ping", reservas + "/api/ping", pagos + "/api/pagos/ping");
  }

  /** Los tres pings van en paralelo y no detienen el arranque. */
  @EventListener(ApplicationReadyEvent.class)
  public void despertar() {
    HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(30)).build();
    for (String url : pings) {
      HttpRequest ping =
          HttpRequest.newBuilder(URI.create(url)).timeout(Duration.ofMinutes(3)).build();
      http.sendAsync(ping, HttpResponse.BodyHandlers.discarding())
          .whenComplete(
              (r, e) -> log.info("Ping a {}: {}", url, e == null ? r.statusCode() : e.toString()));
    }
  }
}
