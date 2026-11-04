package co.edu.usta.servicioescenarios.horario;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

/** GET público; POST, PUT y DELETE pasan antes por el JwtFilter (rol ADMIN o PROPIETARIO). */
@RestController
@RequestMapping("/api")
public class HorarioController {

  private final HorarioService service;

  public HorarioController(HorarioService service) {
    this.service = service;
  }

  @GetMapping("/canchas/{canchaId}/horarios")
  public List<HorarioDto> deCancha(@PathVariable Long canchaId) {
    return service.activosDeCancha(canchaId).stream().map(HorarioDto::de).toList();
  }

  @PostMapping("/horarios")
  @ResponseStatus(HttpStatus.CREATED)
  public HorarioDto crear(@Valid @RequestBody HorarioRequest in) {
    return HorarioDto.de(service.crear(in));
  }

  @PutMapping("/horarios/{id}")
  public HorarioDto actualizar(@PathVariable Long id, @Valid @RequestBody HorarioRequest in) {
    return HorarioDto.de(service.actualizar(id, in));
  }

  @DeleteMapping("/horarios/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void eliminar(@PathVariable Long id) {
    service.darDeBaja(id);
  }
}
