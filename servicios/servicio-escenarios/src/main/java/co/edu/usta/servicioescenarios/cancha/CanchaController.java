package co.edu.usta.servicioescenarios.cancha;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

/** GET públicos; POST y PUT pasan antes por el JwtFilter (rol ADMIN o PROPIETARIO). */
@RestController
@RequestMapping("/api/canchas")
public class CanchaController {

  private final CanchaService service;

  public CanchaController(CanchaService service) {
    this.service = service;
  }

  /** Solo canchas activas; filtros opcionales ?deporte=&establecimientoId=. */
  @GetMapping
  public List<CanchaDto> listar(
      @RequestParam(required = false) String deporte,
      @RequestParam(required = false) Long establecimientoId) {
    return service.activas(deporte, establecimientoId).stream().map(CanchaDto::de).toList();
  }

  @GetMapping("/{id}")
  public CanchaDto una(@PathVariable Long id) {
    return CanchaDto.de(service.buscar(id));
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public CanchaDto crear(@Valid @RequestBody CanchaRequest in) {
    return CanchaDto.de(service.crear(in));
  }

  @PutMapping("/{id}")
  public CanchaDto actualizar(@PathVariable Long id, @Valid @RequestBody CanchaRequest in) {
    return CanchaDto.de(service.actualizar(id, in));
  }
}
