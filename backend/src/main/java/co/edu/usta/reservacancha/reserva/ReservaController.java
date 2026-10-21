package co.edu.usta.reservacancha.reserva;

import co.edu.usta.reservacancha.user.Role;
import co.edu.usta.reservacancha.user.Usuario;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/reservas")
public class ReservaController {

  private final ReservaService service;
  private final ReservaRepository repo;

  public ReservaController(ReservaService service, ReservaRepository repo) {
    this.service = service;
    this.repo = repo;
  }

  @PostMapping
  public Reserva crear(
      @AuthenticationPrincipal Usuario usuario, @Valid @RequestBody CrearReserva req) {
    return service.crear(usuario, req.canchaId(), req.fecha(), req.horaInicio(), req.horaFin());
  }

  @GetMapping("/mias")
  public List<Reserva> mias(@AuthenticationPrincipal Usuario usuario) {
    return repo.findByUsuarioId(usuario.getId());
  }

  @PostMapping("/{id}/cancelar")
  public Reserva cancelar(@PathVariable Long id, @AuthenticationPrincipal Usuario usuario) {
    return service.cancelar(id, usuario);
  }

  @GetMapping("/por-cancha-fecha")
  public List<Map<String, Object>> porCanchaFecha(
      @RequestParam Long canchaId,
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha) {
    return repo.findByCanchaIdAndFecha(canchaId, fecha).stream()
        .filter(r -> r.getEstado() != EstadoReserva.CANCELADA)
        .map(
            r ->
                Map.<String, Object>of(
                    "inicio", r.getHoraInicio().toString(),
                    "fin", r.getHoraFin().toString(),
                    "estado", r.getEstado().name()))
        .toList();
  }

  /**
   * Ocupacion de una cancha desde hoy. Los jugadores solo ven los bloques ocupados; administrador y
   * propietario ven ademas quien reservo y los ultimos 30 dias.
   */
  @GetMapping("/cancha/{canchaId}")
  public List<Map<String, Object>> porCancha(
      @PathVariable Long canchaId, @AuthenticationPrincipal Usuario usuario) {
    boolean gestor = usuario.getRol() == Role.ADMIN || usuario.getRol() == Role.PROPIETARIO;
    LocalDate desde = gestor ? LocalDate.now().minusDays(30) : LocalDate.now();
    return repo
        .findByCanchaIdAndFechaGreaterThanEqualOrderByFechaAscHoraInicioAsc(canchaId, desde)
        .stream()
        .map(
            r -> {
              Map<String, Object> m = new LinkedHashMap<>();
              m.put("id", r.getId());
              m.put("canchaId", canchaId);
              m.put("fecha", r.getFecha().toString());
              m.put("horaInicio", r.getHoraInicio().toString());
              m.put("horaFin", r.getHoraFin().toString());
              m.put("estado", r.getEstado().name());
              m.put("usuarioId", r.getUsuario().getId());
              if (gestor) m.put("jugador", r.getUsuario().getNombre());
              return m;
            })
        .toList();
  }

  public record CrearReserva(
      @NotNull Long canchaId,
      @NotNull @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha,
      @NotNull @DateTimeFormat(iso = DateTimeFormat.ISO.TIME) LocalTime horaInicio,
      @NotNull @DateTimeFormat(iso = DateTimeFormat.ISO.TIME) LocalTime horaFin) {}
}
