package co.edu.usta.serviciopagos.dto;

/**
 * Respuesta de registrarPago: el pago queda PENDIENTE y se devuelven los datos que necesita el
 * Widget de Wompi en el navegador (referencia, monto en centavos y firma de integridad).
 */
public record IntencionPago(
    Long pagoId,
    Long reservaId,
    String referencia,
    long valorCentavos,
    String moneda,
    String firmaIntegridad,
    String llavePublica,
    String estado) {}
