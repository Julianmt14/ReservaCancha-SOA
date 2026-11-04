package co.edu.usta.servicioreservas.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;

/**
 * Lo que manda la consumidora para reservar. El valor ya viene cotizado por el Proveedor 1; las
 * horas se aceptan como "HH:mm" o "HH:mm:ss".
 */
public record CrearReservaRequest(
    @NotNull Long usuarioId,
    @NotNull Long canchaId,
    @NotNull LocalDate fecha,
    @NotNull LocalTime horaInicio,
    @NotNull LocalTime horaFin,
    @NotNull @PositiveOrZero BigDecimal valorTotal) {}
