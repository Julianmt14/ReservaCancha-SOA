package co.edu.usta.reservacancha.escenarios;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;

/**
 * Respuesta de la cotización: servicio-escenarios validó las reglas de la cancha (horario, duración
 * mínima, fecha futura) y calculó el valor de la reserva.
 */
public record CotizacionDto(
    Long canchaId,
    LocalDate fecha,
    LocalTime horaInicio,
    LocalTime horaFin,
    Integer minutos,
    BigDecimal valorTotal,
    BigDecimal valorAbono,
    Integer horasCancelacion) {}
