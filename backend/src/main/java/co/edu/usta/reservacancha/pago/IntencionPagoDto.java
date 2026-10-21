package co.edu.usta.reservacancha.pago;

/** Respuesta de servicio-pagos al registrar un pago: datos firmados para el Widget de Wompi. */
public record IntencionPagoDto(
    Long pagoId,
    Long reservaId,
    String referencia,
    long valorCentavos,
    String moneda,
    String firmaIntegridad,
    String llavePublica,
    String estado) {}
