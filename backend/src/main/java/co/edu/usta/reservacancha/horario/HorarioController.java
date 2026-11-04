package co.edu.usta.reservacancha.horario;

import co.edu.usta.reservacancha.escenarios.EscenariosClient;
import co.edu.usta.reservacancha.escenarios.HorarioRequest;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpHeaders;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * Horarios semanales: los guarda servicio-escenarios. Las escrituras se le reenvían con el token
 * del usuario (el proveedor también valida el rol).
 */
@RestController
@RequestMapping("/api/horarios")
public class HorarioController {

  private final EscenariosClient escenarios;

  public HorarioController(EscenariosClient escenarios) {
    this.escenarios = escenarios;
  }

  @GetMapping("/cancha/{canchaId}")
  public List<HorarioVista> porCancha(@PathVariable Long canchaId) {
    return escenarios.horarios(canchaId).stream().map(HorarioVista::de).toList();
  }

  @PostMapping
  @PreAuthorize("hasAnyRole('ADMIN','PROPIETARIO')")
  public HorarioVista crear(
      @Valid @RequestBody HorarioRequest in,
      @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization) {
    return HorarioVista.de(escenarios.crearHorario(in, authorization));
  }

  @PutMapping("/{id}")
  @PreAuthorize("hasAnyRole('ADMIN','PROPIETARIO')")
  public HorarioVista actualizar(
      @PathVariable Long id,
      @Valid @RequestBody HorarioRequest in,
      @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization) {
    return HorarioVista.de(escenarios.actualizarHorario(id, in, authorization));
  }

  /** Baja logica en el proveedor: el horario deja de aplicar pero se conserva el historial. */
  @DeleteMapping("/{id}")
  @PreAuthorize("hasAnyRole('ADMIN','PROPIETARIO')")
  public void eliminar(
      @PathVariable Long id,
      @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization) {
    escenarios.eliminarHorario(id, authorization);
  }
}
