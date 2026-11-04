package co.edu.usta.reservacancha.escenarios;

import java.time.LocalDate;
import java.util.List;

/**
 * Franjas de 1 h en que la cancha opera ese día, según servicio-escenarios. No dice cuáles están
 * ocupadas: eso lo sabe servicio-reservas.
 */
public record FranjasDto(Long canchaId, LocalDate fecha, boolean abierta, List<Franja> franjas) {

  /** Una franja {@code {"inicio":"06:00","fin":"07:00"}}. */
  public record Franja(String inicio, String fin) {}
}
