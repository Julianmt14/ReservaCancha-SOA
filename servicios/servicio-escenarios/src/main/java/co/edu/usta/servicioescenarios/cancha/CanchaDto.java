package co.edu.usta.servicioescenarios.cancha;

import java.math.BigDecimal;

/** Cancha tal como la ven las demás aplicaciones, con sus reglas de reserva agrupadas. */
public record CanchaDto(
    Long id,
    Long establecimientoId,
    String nombre,
    String deporte,
    String tipo,
    String superficie,
    String ubicacion,
    BigDecimal precioHora,
    boolean activa,
    Reglas reglas) {

  public record Reglas(int duracionMinimaMin, int horasCancelacion, int porcentajeAbono) {}

  public static CanchaDto de(Cancha c) {
    return new CanchaDto(
        c.getId(),
        c.getEstablecimiento().getId(),
        c.getNombre(),
        c.getDeporte(),
        c.getTipo(),
        c.getSuperficie(),
        c.getUbicacion(),
        c.getPrecioHora(),
        c.isActiva(),
        new Reglas(c.getDuracionMinimaMin(), c.getHorasCancelacion(), c.getPorcentajeAbono()));
  }
}
