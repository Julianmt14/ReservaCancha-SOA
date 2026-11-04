package co.edu.usta.reservacancha.escenarios;

import java.math.BigDecimal;

/**
 * Cancha tal como la entrega servicio-escenarios. Se reenvía al frontend sin cambios: conserva los
 * campos de siempre ({@code id, nombre, tipo, superficie, ubicacion, precioHora, activa}) y agrega
 * {@code establecimientoId}, {@code deporte} y {@code reglas}.
 */
public record CanchaDto(
    Long id,
    Long establecimientoId,
    String nombre,
    String deporte,
    String tipo,
    String superficie,
    String ubicacion,
    BigDecimal precioHora,
    Boolean activa,
    ReglasDto reglas) {

  /**
   * Cancha mínima para mostrar una reserva cuando el proveedor de escenarios no responde: la
   * reserva se ve igual, solo que sin los datos de la cancha.
   */
  public static CanchaDto sinDatos(Long id) {
    return new CanchaDto(id, null, "Cancha " + id, null, null, null, null, null, null, null);
  }

  /** Horas antes del inicio hasta las que un jugador puede cancelar (3 si no viene la regla). */
  public int horasCancelacion() {
    return reglas != null && reglas.horasCancelacion() != null ? reglas.horasCancelacion() : 3;
  }
}
