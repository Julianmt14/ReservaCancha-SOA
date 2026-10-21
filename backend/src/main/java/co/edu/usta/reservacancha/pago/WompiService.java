package co.edu.usta.reservacancha.pago;

import co.edu.usta.reservacancha.reserva.EstadoReserva;
import co.edu.usta.reservacancha.reserva.Reserva;
import co.edu.usta.reservacancha.reserva.ReservaRepository;
import co.edu.usta.reservacancha.user.Role;
import co.edu.usta.reservacancha.user.Usuario;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class WompiService {

  private final PagoRepository pagos;
  private final ReservaRepository reservas;
  private final ObjectMapper json;
  private final String integritySecret;
  private final String publicKey;
  private final String baseUrl;
  private final String currency;
  private final HttpClient http =
      HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();

  public WompiService(
      PagoRepository pagos,
      ReservaRepository reservas,
      ObjectMapper json,
      @Value("${app.wompi.integrity-secret}") String integritySecret,
      @Value("${app.wompi.public-key}") String publicKey,
      @Value("${app.wompi.base-url}") String baseUrl,
      @Value("${app.wompi.currency}") String currency) {
    this.pagos = pagos;
    this.reservas = reservas;
    this.json = json;
    this.integritySecret = integritySecret;
    this.publicKey = publicKey;
    this.baseUrl = baseUrl;
    this.currency = currency;
  }

  /** Crea el pago PENDIENTE y devuelve los datos para el Widget/Checkout de Wompi (sandbox). */
  public Map<String, Object> iniciarPago(Long reservaId, Usuario quien) {
    Reserva r = reservaAutorizada(reservaId, quien);
    if (r.getEstado() == EstadoReserva.CANCELADA) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Reserva cancelada");
    }
    if (r.getEstado() != EstadoReserva.PENDIENTE) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "La reserva ya fue pagada");
    }
    String referencia = "RC-" + r.getId() + "-" + System.currentTimeMillis();
    long valorCentavos = r.getValorTotal().multiply(java.math.BigDecimal.valueOf(100)).longValue();
    String firma = firma(referencia, valorCentavos, currency);

    Pago p = new Pago();
    p.setReserva(r);
    p.setValor(r.getValorTotal());
    p.setMoneda(currency);
    p.setReferencia(referencia);
    p.setEstado(EstadoPago.PENDIENTE);
    pagos.save(p);

    return Map.of(
        "referencia", referencia,
        "valorCentavos", valorCentavos,
        "moneda", currency,
        "firmaIntegridad", firma,
        "llavePublica", publicKey,
        "reservaId", r.getId());
  }

  /** Pagos de una reserva; solo su dueño o el personal del establecimiento. */
  public List<Pago> porReserva(Long reservaId, Usuario quien) {
    reservaAutorizada(reservaId, quien);
    return pagos.findByReservaId(reservaId);
  }

  /**
   * Confirma un pago consultando la transaccion directamente a Wompi (no confiamos en lo que diga
   * el navegador): la referencia y el monto deben coincidir con el pago registrado.
   */
  public Pago confirmar(Long reservaId, String transactionId, Usuario quien) {
    reservaAutorizada(reservaId, quien);
    JsonNode tx = consultarTransaccion(transactionId);
    String referencia = tx.path("reference").asText("");
    Pago p =
        pagos
            .findByReferencia(referencia)
            .filter(x -> x.getReserva().getId().equals(reservaId))
            .orElseThrow(
                () ->
                    new ResponseStatusException(
                        HttpStatus.BAD_REQUEST, "La transaccion no corresponde a esta reserva"));
    long esperado = p.getValor().multiply(java.math.BigDecimal.valueOf(100)).longValue();
    if (tx.path("amount_in_cents").asLong(-1) != esperado) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "El monto de la transaccion no coincide");
    }
    return webhook(referencia, transactionId, tx.path("status").asText("PENDING"));
  }

  /** Webhook de Wompi: actualiza pago y marca reserva PAGADA/APROBADA. */
  public Pago webhook(String referencia, String transactionId, String status) {
    Pago p =
        pagos
            .findByReferencia(referencia)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Pago no existe"));
    if ("APPROVED".equalsIgnoreCase(status)) {
      p.setEstado(EstadoPago.APROBADO);
      p.getReserva().setEstado(EstadoReserva.PAGADA);
    } else if ("DECLINED".equalsIgnoreCase(status)) {
      p.setEstado(EstadoPago.RECHAZADO);
    } else if ("PENDING".equalsIgnoreCase(status)) {
      p.setEstado(EstadoPago.PENDIENTE);
    } else {
      p.setEstado(EstadoPago.FALLIDO);
    }
    p.setWompiTransactionId(transactionId);
    reservas.save(p.getReserva());
    return pagos.save(p);
  }

  private Reserva reservaAutorizada(Long reservaId, Usuario quien) {
    Reserva r =
        reservas
            .findById(reservaId)
            .orElseThrow(
                () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reserva no existe"));
    boolean personal = quien.getRol() == Role.ADMIN || quien.getRol() == Role.PROPIETARIO;
    if (!personal && !r.getUsuario().getId().equals(quien.getId())) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Sin permiso sobre esta reserva");
    }
    return r;
  }

  private JsonNode consultarTransaccion(String transactionId) {
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

  private String firma(String referencia, long valorCentavos, String moneda) {
    try {
      String raw = referencia + valorCentavos + moneda + integritySecret;
      MessageDigest md = MessageDigest.getInstance("SHA-256");
      return HexFormat.of().formatHex(md.digest(raw.getBytes(StandardCharsets.UTF_8)));
    } catch (Exception e) {
      throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "No se pudo firmar");
    }
  }
}
