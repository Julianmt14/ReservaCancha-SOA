package co.edu.usta.reservacancha.escenarios;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.NotNull;
import java.time.DayOfWeek;
import java.time.LocalTime;

/**
 * Cuerpo para crear o actualizar un horario; llega del frontend ("08:00" o "08:00:00") y se reenvía
 * igual a servicio-escenarios, con las horas siempre como texto.
 */
public record HorarioRequest(
    @NotNull Long canchaId,
    @NotNull DayOfWeek diaSemana,
    @NotNull @JsonFormat(shape = JsonFormat.Shape.STRING) LocalTime horaApertura,
    @NotNull @JsonFormat(shape = JsonFormat.Shape.STRING) LocalTime horaCierre) {}
