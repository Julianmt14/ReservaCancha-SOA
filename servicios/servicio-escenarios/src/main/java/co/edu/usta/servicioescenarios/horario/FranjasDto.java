package co.edu.usta.servicioescenarios.horario;

import java.time.LocalDate;
import java.util.List;

/** Franjas de 1 h en que la cancha opera un día (sin ocupación: eso es del Proveedor 2). */
public record FranjasDto(Long canchaId, LocalDate fecha, boolean abierta, List<Franja> franjas) {

  /** inicio y fin como "HH:mm". */
  public record Franja(String inicio, String fin) {}
}
