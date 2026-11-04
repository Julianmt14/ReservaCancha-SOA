package co.edu.usta.servicioreservas.dto;

import co.edu.usta.servicioreservas.reserva.Reserva;
import java.time.format.DateTimeFormatter;

/** Franja ocupada de una cancha en un día: {"reservaId":15,"inicio":"21:00","fin":"22:00",...}. */
public record OcupacionDto(Long reservaId, String inicio, String fin, String estado) {

  private static final DateTimeFormatter HH_MM = DateTimeFormatter.ofPattern("HH:mm");

  public static OcupacionDto de(Reserva r) {
    return new OcupacionDto(
        r.getId(),
        r.getHoraInicio().format(HH_MM),
        r.getHoraFin().format(HH_MM),
        r.getEstado().name());
  }
}
