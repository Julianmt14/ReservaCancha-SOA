package co.edu.usta.reservacancha.horario;

import co.edu.usta.reservacancha.cancha.CanchaRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/horarios")
public class HorarioController {

  private final HorarioRepository repo;
  private final CanchaRepository canchas;

  public HorarioController(HorarioRepository repo, CanchaRepository canchas) {
    this.repo = repo;
    this.canchas = canchas;
  }

  @GetMapping("/cancha/{canchaId}")
  public List<Horario> porCancha(@PathVariable Long canchaId) {
    return repo.findByCanchaId(canchaId).stream().filter(Horario::isActivo).toList();
  }

  @PostMapping
  @PreAuthorize("hasAnyRole('ADMIN','PROPIETARIO')")
  public Horario crear(@Valid @RequestBody HorarioRequest in) {
    Horario h = new Horario();
    h.setCancha(
        canchas
            .findById(in.canchaId())
            .orElseThrow(
                () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cancha no existe")));
    return guardar(h, in);
  }

  @PutMapping("/{id}")
  @PreAuthorize("hasAnyRole('ADMIN','PROPIETARIO')")
  public Horario actualizar(@PathVariable Long id, @Valid @RequestBody HorarioRequest in) {
    Horario h =
        repo.findById(id)
            .orElseThrow(
                () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Horario no existe"));
    return guardar(h, in);
  }

  /** Baja logica: el horario deja de aplicar pero se conserva el historial. */
  @DeleteMapping("/{id}")
  @PreAuthorize("hasAnyRole('ADMIN','PROPIETARIO')")
  public void eliminar(@PathVariable Long id) {
    Horario h =
        repo.findById(id)
            .orElseThrow(
                () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Horario no existe"));
    h.setActivo(false);
    repo.save(h);
  }

  private Horario guardar(Horario h, HorarioRequest in) {
    if (!in.horaCierre().isAfter(in.horaApertura())) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "horaCierre debe ser mayor a horaApertura");
    }
    h.setDiaSemana(in.diaSemana());
    h.setHoraApertura(in.horaApertura());
    h.setHoraCierre(in.horaCierre());
    h.setActivo(true);
    return repo.save(h);
  }

  public record HorarioRequest(
      @NotNull Long canchaId,
      @NotNull DayOfWeek diaSemana,
      @NotNull LocalTime horaApertura,
      @NotNull LocalTime horaCierre) {}
}
