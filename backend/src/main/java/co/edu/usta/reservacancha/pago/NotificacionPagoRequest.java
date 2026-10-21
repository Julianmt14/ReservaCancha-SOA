package co.edu.usta.reservacancha.pago;

/** Aviso de Wompi ya validado por el webhook, reenviado a servicio-pagos. */
public record NotificacionPagoRequest(String referencia, String transactionId, String status) {}
