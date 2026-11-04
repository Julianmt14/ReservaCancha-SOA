package co.edu.usta.servicioreservas.dto;

import co.edu.usta.servicioreservas.reserva.Reserva;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;

/** Reserva tal como sale del servicio. Solo transporta datos; la lógica queda en ReservaService. */
public record ReservaDto(
    Long id,
    Long usuarioId,
    Long canchaId,
    LocalDate fecha,
    LocalTime horaInicio,
    LocalTime horaFin,
    BigDecimal valorTotal,
    String estado,
    Instant creadoEn,
    Instant actualizadoEn) {

  public static ReservaDto de(Reserva r) {
    return new ReservaDto(
        r.getId(),
        r.getUsuarioId(),
        r.getCanchaId(),
        r.getFecha(),
        r.getHoraInicio(),
        r.getHoraFin(),
        r.getValorTotal(),
        r.getEstado().name(),
        r.getCreadoEn(),
        r.getActualizadoEn());
  }
}
