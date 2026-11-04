package co.edu.usta.reservacancha.escenarios;

import java.time.DayOfWeek;
import java.time.LocalTime;

/** Horario semanal tal como lo entrega servicio-escenarios (solo conoce el id de la cancha). */
public record HorarioDto(
    Long id,
    Long canchaId,
    DayOfWeek diaSemana,
    LocalTime horaApertura,
    LocalTime horaCierre,
    Boolean activo) {}
