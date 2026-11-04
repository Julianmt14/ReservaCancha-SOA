package co.edu.usta.servicioreservas.reserva;

/** Estados de una reserva: PENDIENTE -> PAGADA, y PENDIENTE/PAGADA -> CANCELADA. */
public enum EstadoReserva {
  PENDIENTE, // creada, esperando el pago
  PAGADA, // la consumidora confirmó el pago
  CANCELADA // ya no ocupa la cancha: sus bloques se borraron
}
