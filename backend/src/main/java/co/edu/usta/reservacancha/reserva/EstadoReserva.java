package co.edu.usta.reservacancha.reserva;

/** Estados de una reserva en servicio-reservas, que es quien los cambia. */
public enum EstadoReserva {
  PENDIENTE, // creada, esperando pago
  PAGADA, // pago aprobado (Wompi sandbox)
  CANCELADA // cancelada: el horario queda libre
}
