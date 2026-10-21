package co.edu.usta.reservacancha.cancha;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/canchas")
public class CanchaController {

  private final CanchaRepository repo;

  public CanchaController(CanchaRepository repo) {
    this.repo = repo;
  }

  @GetMapping
  public List<Cancha> listar() {
    return repo.findByActivaTrue();
  }

  @GetMapping("/{id}")
  public Cancha una(@PathVariable Long id) {
    return repo.findById(id)
        .orElseThrow(
            () ->
                new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.NOT_FOUND));
  }

  @PostMapping
  @PreAuthorize("hasAnyRole('ADMIN','PROPIETARIO')")
  public Cancha crear(@Valid @RequestBody Cancha c) {
    return repo.save(c);
  }

  @PutMapping("/{id}")
  @PreAuthorize("hasAnyRole('ADMIN','PROPIETARIO')")
  public Cancha actualizar(@PathVariable Long id, @Valid @RequestBody Cancha in) {
    Cancha c = repo.findById(id).orElseThrow();
    c.setNombre(in.getNombre());
    c.setTipo(in.getTipo());
    c.setSuperficie(in.getSuperficie());
    c.setUbicacion(in.getUbicacion());
    c.setPrecioHora(in.getPrecioHora());
    c.setActiva(in.isActiva());
    return repo.save(c);
  }
}
