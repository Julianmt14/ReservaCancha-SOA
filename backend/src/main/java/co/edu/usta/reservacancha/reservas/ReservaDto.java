package co.edu.usta.reservacancha.reservas;

import co.edu.usta.reservacancha.reserva.EstadoReserva;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;

/**
 * Reserva tal como la guarda servicio-reservas: solo conoce los identificadores del usuario (de
 * esta aplicación) y de la cancha (de servicio-escenarios).
 */
public record ReservaDto(
    Long id,
    Long usuarioId,
    Long canchaId,
    LocalDate fecha,
    LocalTime horaInicio,
    LocalTime horaFin,
    BigDecimal valorTotal,
    EstadoReserva estado,
    Instant creadoEn,
    Instant actualizadoEn) {}
