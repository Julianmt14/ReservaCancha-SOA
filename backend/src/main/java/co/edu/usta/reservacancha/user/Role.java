package co.edu.usta.reservacancha.user;

public enum Role {
  ADMIN, // Administrador: valida operación, horarios, reservas (aceptación semana 14)
  JUGADOR, // Jugador o equipo: consulta disponibilidad y reserva
  PROPIETARIO // Propietario: seguimiento de funcionamiento e ingresos
}
