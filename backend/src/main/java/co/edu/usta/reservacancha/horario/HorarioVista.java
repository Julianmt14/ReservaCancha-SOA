package co.edu.usta.reservacancha.horario;

import co.edu.usta.reservacancha.escenarios.HorarioDto;
import java.time.DayOfWeek;
import java.time.LocalTime;

/**
 * Horario con la forma que espera el frontend: {@code {id, cancha:{id}, diaSemana, horaApertura,
 * horaCierre, activo}}. servicio-escenarios lo entrega con {@code canchaId} plano.
 */
public record HorarioVista(
    Long id,
    CanchaRef cancha,
    DayOfWeek diaSemana,
    LocalTime horaApertura,
    LocalTime horaCierre,
    boolean activo) {

  public record CanchaRef(Long id) {}

  public static HorarioVista de(HorarioDto h) {
    return new HorarioVista(
        h.id(),
        new CanchaRef(h.canchaId()),
        h.diaSemana(),
        h.horaApertura(),
        h.horaCierre(),
        h.activo() == null || h.activo());
  }
}
