package co.edu.usta.reservacancha.pago;

/** Pide a servicio-pagos que verifique con Wompi la transacción de una reserva. */
public record ConfirmarPagoRequest(Long reservaId, String transactionId) {}
