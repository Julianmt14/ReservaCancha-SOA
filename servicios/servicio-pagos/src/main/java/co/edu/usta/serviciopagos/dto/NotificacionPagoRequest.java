package co.edu.usta.serviciopagos.dto;

import jakarta.validation.constraints.NotBlank;

/** Aviso de Wompi (formato simplificado del sandbox) que ReservaCancha reenvía tras validarlo. */
public record NotificacionPagoRequest(
    @NotBlank String referencia, String transactionId, String status) {}
