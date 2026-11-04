package co.edu.usta.reservacancha.reserva;

import co.edu.usta.reservacancha.escenarios.EscenariosClient;
import co.edu.usta.reservacancha.escenarios.FranjasDto;
import co.edu.usta.reservacancha.reservas.OcupacionDto;
import co.edu.usta.reservacancha.reservas.ReservasClient;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

/**
 * Operación que integra los dos proveedores: las franjas en que opera la cancha
 * (servicio-escenarios) menos los horarios ya ocupados (servicio-reservas).
 */
@RestController
@RequestMapping("/api/disponibilidad")
public class DisponibilidadController {

  private final EscenariosClient escenarios;
  private final ReservasClient reservas;

  public DisponibilidadController(EscenariosClient escenarios, ReservasClient reservas) {
    this.escenarios = escenarios;
    this.reservas = reservas;
  }

  /**
   * Consulta habitual de disponibilidad (RNF-01: < 2,0 s). Devuelve los bloques ocupados y los
   * libres de 1 h dentro del horario de la cancha para ese dia.
   */
  @GetMapping
  public Map<String, Object> disponibilidad(
      @RequestParam Long canchaId,
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha) {
    FranjasDto franjas = escenarios.franjas(canchaId, fecha);
    List<OcupacionDto> ocupacion = reservas.ocupacion(canchaId, fecha);

    var ocupadas =
        ocupacion.stream().map(o -> Map.of("inicio", o.inicio(), "fin", o.fin())).toList();
    var libres =
        (franjas.franjas() == null ? List.<FranjasDto.Franja>of() : franjas.franjas())
            .stream()
                .filter(f -> ocupacion.stream().noneMatch(o -> traslapa(f, o)))
                .map(f -> Map.of("inicio", f.inicio(), "fin", f.fin()))
                .toList();
    return Map.of(
        "canchaId", canchaId, "fecha", fecha.toString(), "ocupadas", ocupadas, "libres", libres);
  }

  /** Dos rangos se cruzan si cada uno empieza antes de que termine el otro. */
  private static boolean traslapa(FranjasDto.Franja f, OcupacionDto o) {
    return LocalTime.parse(f.inicio()).isBefore(LocalTime.parse(o.fin()))
        && LocalTime.parse(o.inicio()).isBefore(LocalTime.parse(f.fin()));
  }
}
