package co.edu.usta.reservacancha.cancha;

import co.edu.usta.reservacancha.escenarios.CanchaDto;
import co.edu.usta.reservacancha.escenarios.CanchaRequest;
import co.edu.usta.reservacancha.escenarios.EscenariosClient;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpHeaders;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * Canchas: las guarda servicio-escenarios. Las lecturas se le piden tal cual; las escrituras se le
 * reenvían con el token del usuario, y además se revisa aquí el rol.
 */
@RestController
@RequestMapping("/api/canchas")
public class CanchaController {

  private final EscenariosClient escenarios;

  public CanchaController(EscenariosClient escenarios) {
    this.escenarios = escenarios;
  }

  @GetMapping
  public List<CanchaDto> listar() {
    return escenarios.canchas();
  }

  @GetMapping("/{id}")
  public CanchaDto una(@PathVariable Long id) {
    return escenarios.cancha(id);
  }

  @PostMapping
  @PreAuthorize("hasAnyRole('ADMIN','PROPIETARIO')")
  public CanchaDto crear(
      @Valid @RequestBody CanchaRequest c,
      @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization) {
    return escenarios.crearCancha(c.paraProveedor(null), authorization);
  }

  /** Lo que el frontend no envía (deporte, reglas) se conserva de la cancha actual. */
  @PutMapping("/{id}")
  @PreAuthorize("hasAnyRole('ADMIN','PROPIETARIO')")
  public CanchaDto actualizar(
      @PathVariable Long id,
      @Valid @RequestBody CanchaRequest in,
      @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization) {
    CanchaDto actual = escenarios.cancha(id);
    return escenarios.actualizarCancha(id, in.paraProveedor(actual), authorization);
  }
}
