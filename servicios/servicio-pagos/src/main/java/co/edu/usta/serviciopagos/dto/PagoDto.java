package co.edu.usta.serviciopagos.dto;

import co.edu.usta.serviciopagos.pago.Pago;
import java.math.BigDecimal;
import java.time.Instant;

/** Pago tal como sale del servicio. Solo transporta datos; la lógica queda en PagoService. */
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

  public static PagoDto de(Pago p) {
    return new PagoDto(
        p.getId(),
        p.getReservaId(),
        p.getValor(),
        p.getMoneda(),
        p.getReferencia(),
        p.getWompiTransactionId(),
        p.getEstado().name(),
        p.getCreadoEn(),
        p.getActualizadoEn());
  }
}
