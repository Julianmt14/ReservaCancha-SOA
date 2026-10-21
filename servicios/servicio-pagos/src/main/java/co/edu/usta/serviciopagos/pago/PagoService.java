package co.edu.usta.serviciopagos.pago;

import co.edu.usta.serviciopagos.dto.IntencionPago;
import co.edu.usta.serviciopagos.wompi.WompiClient;
import com.fasterxml.jackson.databind.JsonNode;
import jakarta.transaction.Transactional;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/** Lógica de los pagos: registrar, verificar con Wompi y aplicar los avisos de la pasarela. */
@Service
public class PagoService {

  private final PagoRepository pagos;
  private final WompiClient wompi;
  private final String integritySecret;
  private final String publicKey;
  private final String currency;

  public PagoService(
      PagoRepository pagos,
      WompiClient wompi,
      @Value("${app.wompi.integrity-secret}") String integritySecret,
      @Value("${app.wompi.public-key}") String publicKey,
      @Value("${app.wompi.currency}") String currency) {
    this.pagos = pagos;
    this.wompi = wompi;
    this.integritySecret = integritySecret;
    this.publicKey = publicKey;
    this.currency = currency;
  }

  /** registrarPago: crea el pago PENDIENTE y firma los datos para el Widget de Wompi. */
  @Transactional
  public IntencionPago registrarPago(Long reservaId, BigDecimal valor) {
    if (pagos.existsByReservaIdAndEstado(reservaId, EstadoPago.APROBADO)) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "La reserva ya tiene un pago aprobado");
    }
    String referencia = "RC-" + reservaId + "-" + System.currentTimeMillis();
    long valorCentavos = centavos(valor);

    Pago p = new Pago();
    p.setReservaId(reservaId);
    p.setValor(valor);
    p.setMoneda(currency);
    p.setReferencia(referencia);
    p.setEstado(EstadoPago.PENDIENTE);
    pagos.save(p);

    return new IntencionPago(
        p.getId(),
        reservaId,
        referencia,
        valorCentavos,
        currency,
        firma(referencia, valorCentavos, currency),
        publicKey,
        p.getEstado().name());
  }

  public List<Pago> porReserva(Long reservaId) {
    return pagos.findByReservaIdOrderByIdAsc(reservaId);
  }

  public List<Pago> todos() {
    return pagos.findAll();
  }

  /**
   * Confirma un pago consultando la transaccion directamente a Wompi (no confiamos en lo que diga
   * el navegador): la referencia y el monto deben coincidir con el pago registrado.
   */
  @Transactional
  public Pago confirmar(Long reservaId, String transactionId) {
    JsonNode tx = wompi.consultarTransaccion(transactionId);
    String referencia = tx.path("reference").asText("");
    Pago p =
        pagos
            .findByReferencia(referencia)
            .filter(x -> x.getReservaId().equals(reservaId))
            .orElseThrow(
                () ->
                    new ResponseStatusException(
                        HttpStatus.BAD_REQUEST, "La transaccion no corresponde a esta reserva"));
    if (tx.path("amount_in_cents").asLong(-1) != centavos(p.getValor())) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "El monto de la transaccion no coincide");
    }
    return aplicarEstado(p, transactionId, tx.path("status").asText("PENDING"));
  }

  /** Aviso de Wompi reenviado por ReservaCancha: actualiza el estado del pago. */
  @Transactional
  public Pago notificar(String referencia, String transactionId, String status) {
    Pago p =
        pagos
            .findByReferencia(referencia)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Pago no existe"));
    return aplicarEstado(p, transactionId, status);
  }

  private Pago aplicarEstado(Pago p, String transactionId, String status) {
    if ("APPROVED".equalsIgnoreCase(status)) {
      p.setEstado(EstadoPago.APROBADO);
    } else if ("DECLINED".equalsIgnoreCase(status)) {
      p.setEstado(EstadoPago.RECHAZADO);
    } else if ("PENDING".equalsIgnoreCase(status)) {
      p.setEstado(EstadoPago.PENDIENTE);
    } else {
      p.setEstado(EstadoPago.FALLIDO);
    }
    p.setWompiTransactionId(transactionId);
    return pagos.save(p);
  }

  private static long centavos(BigDecimal valor) {
    return valor.multiply(BigDecimal.valueOf(100)).longValue();
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
