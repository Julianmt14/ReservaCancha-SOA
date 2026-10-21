package co.edu.usta.reservacancha.pago;

import java.math.BigDecimal;

/** Lo que cruza hacia servicio-pagos para registrar un pago: la reserva y su valor. */
public record RegistrarPagoRequest(Long reservaId, BigDecimal valor) {}
