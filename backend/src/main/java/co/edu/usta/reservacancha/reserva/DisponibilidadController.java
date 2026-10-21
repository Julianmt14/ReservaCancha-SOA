package co.edu.usta.reservacancha.reserva;

import co.edu.usta.reservacancha.horario.Horario;
import co.edu.usta.reservacancha.horario.HorarioRepository;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/disponibilidad")
public class DisponibilidadController {

  /** Ventana por defecto cuando la cancha aun no tiene horario configurado para ese dia. */
  private static final int APERTURA_POR_DEFECTO = 6;

  private static final int CIERRE_POR_DEFECTO = 22;

  private final ReservaRepository reservas;
  private final HorarioRepository horarios;

  public DisponibilidadController(ReservaRepository reservas, HorarioRepository horarios) {
    this.reservas = reservas;
    this.horarios = horarios;
  }

  /**
   * Consulta habitual de disponibilidad (RNF-01: < 2,0 s). Devuelve los bloques ocupados y los
   * libres de 1 h, dentro del horario de la cancha para ese dia (06:00-22:00 si no tiene horario
   * configurado).
   */
  @GetMapping
  public Map<String, Object> disponibilidad(
      @RequestParam Long canchaId,
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha) {
    var ocupadas =
        reservas.findByCanchaIdAndFecha(canchaId, fecha).stream()
            .filter(r -> r.getEstado() != EstadoReserva.CANCELADA)
            .map(
                r ->
                    Map.of(
                        "inicio", r.getHoraInicio().toString(), "fin", r.getHoraFin().toString()))
            .toList();

    List<Horario> delDia =
        horarios.findByCanchaIdAndDiaSemanaAndActivoTrue(canchaId, fecha.getDayOfWeek());
    List<Map<String, String>> libres = new ArrayList<>();
    for (int h = 0; h < 23; h++) {
      LocalTime ini = LocalTime.of(h, 0);
      LocalTime fin = LocalTime.of(h + 1, 0);
      if (!dentroDeHorario(delDia, ini, fin, h)) continue;
      if (!reservas.existeTraslape(canchaId, fecha, ini, fin)) {
        libres.add(Map.of("inicio", ini.toString(), "fin", fin.toString()));
      }
    }
    return Map.of(
        "canchaId", canchaId, "fecha", fecha.toString(), "ocupadas", ocupadas, "libres", libres);
  }

  private boolean dentroDeHorario(List<Horario> delDia, LocalTime ini, LocalTime fin, int hora) {
    if (delDia.isEmpty()) return hora >= APERTURA_POR_DEFECTO && hora < CIERRE_POR_DEFECTO;
    return delDia.stream()
        .anyMatch(h -> !ini.isBefore(h.getHoraApertura()) && !fin.isAfter(h.getHoraCierre()));
  }
}
