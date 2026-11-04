package co.edu.usta.servicioescenarios.horario;

import java.time.DayOfWeek;
import java.time.LocalTime;

public record HorarioDto(
    Long id,
    Long canchaId,
    DayOfWeek diaSemana,
    LocalTime horaApertura,
    LocalTime horaCierre,
    boolean activo) {

  public static HorarioDto de(Horario h) {
    return new HorarioDto(
        h.getId(),
        h.getCancha().getId(),
        h.getDiaSemana(),
        h.getHoraApertura(),
        h.getHoraCierre(),
        h.isActivo());
  }
}
