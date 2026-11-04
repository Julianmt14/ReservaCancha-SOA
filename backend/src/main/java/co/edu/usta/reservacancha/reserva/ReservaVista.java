package co.edu.usta.reservacancha.reserva;

import co.edu.usta.reservacancha.escenarios.CanchaDto;
import co.edu.usta.reservacancha.reservas.ReservaDto;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;

/**
 * Reserva que ve el frontend, con la misma forma JSON de siempre: {@code id, usuario, cancha,
 * fecha, horaInicio, horaFin, valorTotal, estado, creadoEn}. La arma esta aplicación juntando la
 * reserva de servicio-reservas, el usuario propio y la cancha de servicio-escenarios.
 */
public record ReservaVista(
    Long id,
    UsuarioResumen usuario,
    CanchaDto cancha,
    LocalDate fecha,
    LocalTime horaInicio,
    LocalTime horaFin,
    BigDecimal valorTotal,
    EstadoReserva estado,
    Instant creadoEn) {

  public static ReservaVista de(ReservaDto r, UsuarioResumen usuario, CanchaDto cancha) {
    return new ReservaVista(
        r.id(),
        usuario,
        cancha,
        r.fecha(),
        r.horaInicio(),
        r.horaFin(),
        r.valorTotal(),
        r.estado(),
        r.creadoEn());
  }
}
