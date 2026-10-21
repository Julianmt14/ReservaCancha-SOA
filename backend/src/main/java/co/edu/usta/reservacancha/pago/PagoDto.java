package co.edu.usta.reservacancha.pago;

import java.math.BigDecimal;
import java.time.Instant;

/** Pago tal como lo entrega servicio-pagos (solo conoce el id de la reserva). */
public record PagoDto(
    Long id,
    Long reservaId,
    BigDecimal valor,
    String moneda,
    String referencia,
    String wompiTransactionId,
    String estado,
    Instant creadoEn,
    Instant actualizadoEn) {

  public boolean aprobado() {
    return "APROBADO".equals(estado);
  }
}
