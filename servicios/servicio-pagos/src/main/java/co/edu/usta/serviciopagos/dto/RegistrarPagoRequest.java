package co.edu.usta.serviciopagos.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;

/** Lo que manda ReservaCancha para registrar un pago: qué reserva se paga y cuánto vale. */
public record RegistrarPagoRequest(@NotNull Long reservaId, @NotNull @Positive BigDecimal valor) {}
