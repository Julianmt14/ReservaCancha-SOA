package co.edu.usta.reservacancha.reservas;

import co.edu.usta.reservacancha.reserva.EstadoReserva;

/** Cuerpo del PATCH de estado en servicio-reservas: PAGADA o CANCELADA. */
public record CambioEstadoRequest(EstadoReserva estado) {}
