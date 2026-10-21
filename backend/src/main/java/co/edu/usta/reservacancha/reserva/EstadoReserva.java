package co.edu.usta.reservacancha.reserva;

public enum EstadoReserva {
  PENDIENTE, // creada, esperando pago
  PAGADA, // pago confirmado (Wompi sandbox en v1.0)
  CONFIRMADA, // validada por admin
  CANCELADA,
  NO_SHOW
}
