package co.edu.usta.reservacancha.reservas;

/** Bloque ocupado de una cancha en una fecha (sin las reservas canceladas). */
public record OcupacionDto(Long reservaId, String inicio, String fin, String estado) {}
