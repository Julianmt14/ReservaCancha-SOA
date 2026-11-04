package co.edu.usta.reservacancha.pago;

import co.edu.usta.reservacancha.reserva.ReservaVista;
import java.math.BigDecimal;
import java.time.Instant;

/**
 * Pago que ve el frontend: lo que responde servicio-pagos más la reserva (de servicio-reservas, con
 * su usuario y su cancha). Conserva la misma forma JSON que tenía el pago antes de separar los
 * servicios.
 */
public record PagoConReserva(
    Long id,
    ReservaVista reserva,
    BigDecimal valor,
    String moneda,
    String referencia,
    String wompiTransactionId,
    String estado,
    Instant creadoEn,
    Instant actualizadoEn) {

  public static PagoConReserva de(PagoDto p, ReservaVista reserva) {
    return new PagoConReserva(
        p.id(),
        reserva,
        p.valor(),
        p.moneda(),
        p.referencia(),
        p.wompiTransactionId(),
        p.estado(),
        p.creadoEn(),
        p.actualizadoEn());
  }
}
