package co.edu.usta.serviciopagos.pago;

import co.edu.usta.serviciopagos.dto.ConfirmarPagoRequest;
import co.edu.usta.serviciopagos.dto.IntencionPago;
import co.edu.usta.serviciopagos.dto.NotificacionPagoRequest;
import co.edu.usta.serviciopagos.dto.PagoDto;
import co.edu.usta.serviciopagos.dto.RegistrarPagoRequest;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

/** Puerta de entrada del servicio: traduce entre HTTP y PagoService, sin lógica de negocio. */
@RestController
@RequestMapping("/api/pagos")
public class PagoController {

  private final PagoService service;

  public PagoController(PagoService service) {
    this.service = service;
  }

  /** registrarPago: 201 con la intención de pago; 409 si la reserva ya tiene un pago aprobado. */
  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public IntencionPago registrar(@Valid @RequestBody RegistrarPagoRequest req) {
    return service.registrarPago(req.reservaId(), req.valor());
  }

  /** Pagos de una reserva (?reservaId=) o todos, para el panel del propietario. */
  @GetMapping
  public List<PagoDto> listar(@RequestParam(required = false) Long reservaId) {
    var lista = reservaId == null ? service.todos() : service.porReserva(reservaId);
    return lista.stream().map(PagoDto::de).toList();
  }

  @PostMapping("/confirmaciones")
  public PagoDto confirmar(@Valid @RequestBody ConfirmarPagoRequest req) {
    return PagoDto.de(service.confirmar(req.reservaId(), req.transactionId()));
  }

  @PostMapping("/notificaciones")
  public PagoDto notificar(@Valid @RequestBody NotificacionPagoRequest req) {
    String status = req.status() == null ? "PENDING" : req.status();
    return PagoDto.de(service.notificar(req.referencia(), req.transactionId(), status));
  }

  /** Para saber si el servicio está encendido; no pide clave. */
  @GetMapping("/ping")
  public Map<String, Object> ping() {
    return Map.of("servicio", "servicio-pagos", "estado", "OK");
  }
}
