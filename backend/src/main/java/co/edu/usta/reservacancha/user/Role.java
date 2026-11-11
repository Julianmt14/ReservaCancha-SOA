package co.edu.usta.reservacancha.user;

public enum Role {
  ADMIN, // Administrador: canchas, horarios, métricas y cuentas del personal
  JUGADOR, // Jugador o equipo: consulta disponibilidad y reserva
  PROPIETARIO, // Propietario: mismo panel que el administrador (seguimiento e ingresos)
  EMPLEADO // Trabajador de la cancha: agenda del día, reservas por teléfono y cancelaciones
}
