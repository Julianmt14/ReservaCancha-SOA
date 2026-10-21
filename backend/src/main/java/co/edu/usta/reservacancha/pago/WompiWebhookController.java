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

  private final PagoService pagos;
  private final String eventsSecret;

  public WompiWebhookController(
      PagoService pagos, @Value("${app.wompi.events-secret}") String eventsSecret) {
    this.pagos = pagos;
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
    PagoConReserva p = pagos.notificar(ref, tx, status);
    return Map.of(
        "pagoId",
        p.id(),
        "estado",
        p.estado(),
        "reserva",
        p.reserva().getId(),
        "reservaEstado",
        p.reserva().getEstado().name());
  }
}
