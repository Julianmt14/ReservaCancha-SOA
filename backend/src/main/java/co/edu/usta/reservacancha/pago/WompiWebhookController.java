package co.edu.usta.reservacancha.pago;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/wompi")
public class WompiWebhookController {

  private final WompiService wompi;
  private final String eventsSecret;

  public WompiWebhookController(
      WompiService wompi, @Value("${app.wompi.events-secret}") String eventsSecret) {
    this.wompi = wompi;
    this.eventsSecret = eventsSecret;
  }

  @PostMapping("/webhook")
  public Map<String, Object> webhook(
      @RequestHeader(value = "X-Webhook-Secret", required = false) String secreto,
      @RequestBody Map<String, Object> body) {
    // El endpoint es publico (lo llama Wompi), asi que exige un secreto compartido (SEC-01)
    if (secreto == null
        || !MessageDigest.isEqual(
            secreto.getBytes(StandardCharsets.UTF_8),
            eventsSecret.getBytes(StandardCharsets.UTF_8))) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Webhook no autorizado");
    }
    // Formato simplificado sandbox: {referencia, transactionId, status}
    String ref = String.valueOf(body.getOrDefault("referencia", ""));
    String tx = String.valueOf(body.getOrDefault("transactionId", ""));
    String status = String.valueOf(body.getOrDefault("status", "PENDING"));
    Pago p = wompi.webhook(ref, tx, status);
    return Map.of(
        "pagoId",
        p.getId(),
        "estado",
        p.getEstado().name(),
        "reserva",
        p.getReserva().getId(),
        "reservaEstado",
        p.getReserva().getEstado().name());
  }
}
