package co.edu.usta.servicioreservas.reserva;

import co.edu.usta.servicioreservas.dto.CambiarEstadoRequest;
import co.edu.usta.servicioreservas.dto.CrearReservaRequest;
import co.edu.usta.servicioreservas.dto.OcupacionDto;
import co.edu.usta.servicioreservas.dto.ReservaDto;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

/**
 * Puerta de entrada del Proveedor 2: traduce entre HTTP y ReservaService, sin lógica de negocio.
 */
@RestController
@RequestMapping("/api/reservas")
public class ReservaController {

  private final ReservaService service;

  public ReservaController(ReservaService service) {
    this.service = service;
  }

  /**
   * 201 con la reserva PENDIENTE; 409 si el horario ya está ocupado; 400 si las horas no sirven.
   */
  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public ReservaDto crear(@Valid @RequestBody CrearReservaRequest req) {
    return ReservaDto.de(
        service.crear(
            req.usuarioId(),
            req.canchaId(),
            req.fecha(),
            req.horaInicio(),
            req.horaFin(),
            req.valorTotal()));
  }

  @GetMapping("/{id}")
  public ReservaDto buscar(@PathVariable Long id) {
    return ReservaDto.de(service.buscar(id));
  }

  /** ?usuarioId= · ?canchaId=&desde=YYYY-MM-DD · sin parámetros (todas). Incluye canceladas. */
  @GetMapping
  public List<ReservaDto> listar(
      @RequestParam(required = false) Long usuarioId,
      @RequestParam(required = false) Long canchaId,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
          LocalDate desde) {
    return service.listar(usuarioId, canchaId, desde).stream().map(ReservaDto::de).toList();
  }

  /** Horarios ocupados de una cancha en un día, sin las canceladas. */
  @GetMapping("/ocupacion")
  public List<OcupacionDto> ocupacion(
      @RequestParam Long canchaId,
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha) {
    return service.ocupacion(canchaId, fecha).stream().map(OcupacionDto::de).toList();
  }

  /** {"estado":"PAGADA"} o {"estado":"CANCELADA"}; cualquier otro valor es 400. */
  @PatchMapping("/{id}/estado")
  public ReservaDto cambiarEstado(
      @PathVariable Long id, @Valid @RequestBody CambiarEstadoRequest req) {
    EstadoReserva nuevo;
    try {
      nuevo = EstadoReserva.valueOf(req.estado().trim().toUpperCase());
    } catch (IllegalArgumentException e) {
      nuevo = null;
    }
    if (nuevo != EstadoReserva.PAGADA && nuevo != EstadoReserva.CANCELADA) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Estado no válido: use PAGADA o CANCELADA");
    }
    return ReservaDto.de(service.cambiarEstado(id, nuevo));
  }
}
