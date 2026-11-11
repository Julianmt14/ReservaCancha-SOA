package co.edu.usta.reservacancha.reserva;

import co.edu.usta.reservacancha.auth.AuthController.AuthResponse;
import co.edu.usta.reservacancha.reservas.ReservaDto;
import co.edu.usta.reservacancha.reservas.ReservasClient;
import co.edu.usta.reservacancha.security.JwtService;
import co.edu.usta.reservacancha.user.Clientes;
import co.edu.usta.reservacancha.user.Usuario;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * API de reservas de la consumidora. Las reservas viven en servicio-reservas y las reglas en
 * servicio-escenarios; aquí se integran y se responden con las formas JSON de siempre.
 */
@RestController
@RequestMapping("/api/reservas")
public class ReservaController {

  private final ReservaOrquestador orquestador;
  private final ReservasClient reservas;
  private final Clientes clientes;
  private final JwtService jwt;
  private final String whatsapp;

  public ReservaController(
      ReservaOrquestador orquestador,
      ReservasClient reservas,
      Clientes clientes,
      JwtService jwt,
      @Value("${app.whatsapp.numero:}") String whatsapp) {
    this.orquestador = orquestador;
    this.reservas = reservas;
    this.clientes = clientes;
    this.jwt = jwt;
    this.whatsapp = whatsapp;
  }

  @PostMapping
  public ReservaVista crear(
      @AuthenticationPrincipal Usuario usuario, @Valid @RequestBody CrearReserva req) {
    return orquestador.crear(usuario, req.canchaId(), req.fecha(), req.horaInicio(), req.horaFin());
  }

  /**
   * Reserva sin cuenta: con nombre y celular. Se crea (o se reutiliza) el jugador de ese celular y,
   * además de la reserva, se devuelve su token para ver «Mis reservas», cancelar y pagar, y el
   * WhatsApp del complejo para el botón de confirmar.
   */
  @PostMapping("/rapida")
  public ReservaRapidaVista rapida(@Valid @RequestBody ReservaRapida req) {
    Usuario u = clientes.porCelular(req.nombre(), req.celular());
    ReservaVista r =
        orquestador.crear(u, req.canchaId(), req.fecha(), req.horaInicio(), req.horaFin());
    AuthResponse sesion =
        new AuthResponse(
            jwt.generate(u), u.getEmail(), u.getRol().name(), u.getId(), u.getNombre());
    return new ReservaRapidaVista(r, sesion, whatsapp.isBlank() ? null : whatsapp);
  }

  @GetMapping("/mias")
  public List<ReservaVista> mias(@AuthenticationPrincipal Usuario usuario) {
    return orquestador.vistas(reservas.porUsuario(usuario.getId()));
  }

  @PostMapping("/{id}/cancelar")
  public ReservaVista cancelar(@PathVariable Long id, @AuthenticationPrincipal Usuario usuario) {
    return orquestador.cancelar(id, usuario);
  }

  /** Bloques ocupados de una cancha en una fecha, sin las canceladas (servicio-reservas). */
  @GetMapping("/por-cancha-fecha")
  public List<Map<String, Object>> porCanchaFecha(
      @RequestParam Long canchaId,
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha) {
    return reservas.ocupacion(canchaId, fecha).stream()
        .map(
            o -> Map.<String, Object>of("inicio", o.inicio(), "fin", o.fin(), "estado", o.estado()))
        .toList();
  }

  /**
   * Ocupacion de una cancha desde hoy. Los jugadores solo ven los bloques ocupados; administrador y
   * propietario ven ademas quien reservo y los ultimos 30 dias.
   */
  @GetMapping("/cancha/{canchaId}")
  public List<Map<String, Object>> porCancha(
      @PathVariable Long canchaId, @AuthenticationPrincipal Usuario usuario) {
    boolean gestor = ReservaOrquestador.esPersonal(usuario);
    LocalDate desde = gestor ? LocalDate.now().minusDays(30) : LocalDate.now();
    List<ReservaDto> lista = reservas.porCancha(canchaId, desde);
    Map<Long, UsuarioResumen> jugadores =
        gestor
            ? orquestador.usuarios(lista.stream().map(ReservaDto::usuarioId).toList())
            : Map.of();
    return lista.stream()
        .map(
            r -> {
              Map<String, Object> m = new LinkedHashMap<>();
              m.put("id", r.id());
              m.put("canchaId", canchaId);
              m.put("fecha", r.fecha().toString());
              m.put("horaInicio", r.horaInicio().toString());
              m.put("horaFin", r.horaFin().toString());
              m.put("estado", r.estado().name());
              m.put("usuarioId", r.usuarioId());
              if (gestor) {
                UsuarioResumen u = jugadores.get(r.usuarioId());
                m.put(
                    "jugador",
                    u != null ? u.nombre() : UsuarioResumen.desconocido(r.usuarioId()).nombre());
              }
              return m;
            })
        .toList();
  }

  public record CrearReserva(
      @NotNull Long canchaId,
      @NotNull @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha,
      @NotNull @DateTimeFormat(iso = DateTimeFormat.ISO.TIME) LocalTime horaInicio,
      @NotNull @DateTimeFormat(iso = DateTimeFormat.ISO.TIME) LocalTime horaFin) {}

  public record ReservaRapida(
      @NotBlank @Size(max = 60) String nombre,
      @NotBlank @Pattern(regexp = "3\\d{9}", message = "debe tener 10 dígitos y empezar por 3")
          String celular,
      @NotNull Long canchaId,
      @NotNull @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha,
      @NotNull @DateTimeFormat(iso = DateTimeFormat.ISO.TIME) LocalTime horaInicio,
      @NotNull @DateTimeFormat(iso = DateTimeFormat.ISO.TIME) LocalTime horaFin) {}

  public record ReservaRapidaVista(ReservaVista reserva, AuthResponse sesion, String whatsapp) {}
}
