package co.edu.usta.serviciopagos.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/** Pide verificar con Wompi la transacción que devolvió el Widget para una reserva. */
public record ConfirmarPagoRequest(@NotNull Long reservaId, @NotBlank String transactionId) {}
