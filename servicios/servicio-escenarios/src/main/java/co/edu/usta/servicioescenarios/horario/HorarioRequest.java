package co.edu.usta.servicioescenarios.horario;

import jakarta.validation.constraints.NotNull;
import java.time.DayOfWeek;
import java.time.LocalTime;

/** Cuerpo para crear o modificar un horario; las horas llegan como "HH:mm" o "HH:mm:ss". */
public record HorarioRequest(
    @NotNull Long canchaId,
    @NotNull DayOfWeek diaSemana,
    @NotNull LocalTime horaApertura,
    @NotNull LocalTime horaCierre) {}
