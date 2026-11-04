package co.edu.usta.servicioescenarios.establecimiento;

import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/establecimientos")
public class EstablecimientoController {

  private final EstablecimientoRepository repo;

  public EstablecimientoController(EstablecimientoRepository repo) {
    this.repo = repo;
  }

  /** Establecimientos activos; público. */
  @GetMapping
  public List<EstablecimientoDto> activos() {
    return repo.findByActivoTrueOrderByIdAsc().stream().map(EstablecimientoDto::de).toList();
  }
}
