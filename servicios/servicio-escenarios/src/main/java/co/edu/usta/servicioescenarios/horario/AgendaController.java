package co.edu.usta.servicioescenarios.horario;

import java.time.LocalDate;
import java.time.LocalTime;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.format.annotation.DateTimeFormat.ISO;
import org.springframework.web.bind.annotation.*;

/** Consultas públicas que usa la consumidora para disponibilidad y para crear reservas. */
@RestController
@RequestMapping("/api/canchas/{canchaId}")
public class AgendaController {

  private final AgendaService service;

  public AgendaController(AgendaService service) {
    this.service = service;
  }

  /** ?fecha=YYYY-MM-DD */
  @GetMapping("/franjas")
  public FranjasDto franjas(
      @PathVariable Long canchaId, @RequestParam @DateTimeFormat(iso = ISO.DATE) LocalDate fecha) {
    return service.franjas(canchaId, fecha);
  }

  /** ?fecha=YYYY-MM-DD&horaInicio=HH:mm[:ss]&horaFin=HH:mm[:ss] */
  @GetMapping("/cotizacion")
  public CotizacionDto cotizacion(
      @PathVariable Long canchaId,
      @RequestParam @DateTimeFormat(iso = ISO.DATE) LocalDate fecha,
      @RequestParam @DateTimeFormat(iso = ISO.TIME) LocalTime horaInicio,
      @RequestParam @DateTimeFormat(iso = ISO.TIME) LocalTime horaFin) {
    return service.cotizar(canchaId, fecha, horaInicio, horaFin);
  }
}
