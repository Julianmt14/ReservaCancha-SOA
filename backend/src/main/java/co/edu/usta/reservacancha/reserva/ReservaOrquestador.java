package co.edu.usta.reservacancha.reserva;

import co.edu.usta.reservacancha.escenarios.CanchaDto;
import co.edu.usta.reservacancha.escenarios.CotizacionDto;
import co.edu.usta.reservacancha.escenarios.EscenariosClient;
import co.edu.usta.reservacancha.reservas.NuevaReservaRequest;
import co.edu.usta.reservacancha.reservas.ReservaDto;
import co.edu.usta.reservacancha.reservas.ReservasClient;
import co.edu.usta.reservacancha.user.Role;
import co.edu.usta.reservacancha.user.Usuario;
import co.edu.usta.reservacancha.user.UsuarioRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * Servicio de aplicación de la consumidora: integra el Proveedor 1 (servicio-escenarios: reglas y
 * valor) con el Proveedor 2 (servicio-reservas: horarios ocupados) y arma la reserva con la forma
 * que espera el frontend, agregando el usuario, que es de esta aplicación.
 */
@Service
public class ReservaOrquestador {

  static final String ESCENARIOS_CAIDO =
      "No se pudo verificar la cancha: el servicio de escenarios no responde. La reserva no se"
          + " creó.";

  private static final Logger log = LoggerFactory.getLogger(ReservaOrquestador.class);

  private final EscenariosClient escenarios;
  private final ReservasClient reservas;
  private final UsuarioRepository usuarios;

  public ReservaOrquestador(
      EscenariosClient escenarios, ReservasClient reservas, UsuarioRepository usuarios) {
    this.escenarios = escenarios;
    this.reservas = reservas;
    this.usuarios = usuarios;
  }

  /**
   * 1) El proveedor 1 valida las reglas de la cancha y cotiza; 2) el proveedor 2 guarda la reserva
   * con ese valor (409 si el horario ya está ocupado); 3) se responde con la forma Reserva. Si el
   * proveedor 1 no contesta no se llega al proveedor 2: sin cotización no hay reserva.
   */
  public ReservaVista crear(
      Usuario usuario, Long canchaId, LocalDate fecha, LocalTime inicio, LocalTime fin) {
    CotizacionDto cotizacion;
    try {
      cotizacion = escenarios.cotizar(canchaId, fecha, inicio, fin);
    } catch (ResponseStatusException e) {
      if (e.getStatusCode().value() == HttpStatus.SERVICE_UNAVAILABLE.value()) {
        throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, ESCENARIOS_CAIDO);
      }
      throw e;
    }
    ReservaDto r =
        reservas.crear(
            new NuevaReservaRequest(
                usuario.getId(), canchaId, fecha, inicio, fin, cotizacion.valorTotal()));
    return ReservaVista.de(r, UsuarioResumen.de(usuario), canchaSegura(canchaId));
  }

  /**
   * Cancela una reserva: solo su dueño o el personal (ADMIN/PROPIETARIO). Un jugador solo puede
   * hasta {@code horasCancelacion} antes del inicio, regla que pone el proveedor 1; el personal
   * puede siempre. Luego el proveedor 2 la marca CANCELADA y libera el horario.
   */
  public ReservaVista cancelar(Long id, Usuario quien) {
    ReservaDto r = reservas.una(id);
    boolean personal = esPersonal(quien);
    if (!personal && !r.usuarioId().equals(quien.getId())) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Sin permiso");
    }
    CanchaDto cancha;
    if (personal) {
      cancha = canchaSegura(r.canchaId());
    } else {
      cancha = escenarios.cancha(r.canchaId());
      int horas = cancha.horasCancelacion();
      LocalDateTime inicio = LocalDateTime.of(r.fecha(), r.horaInicio());
      if (LocalDateTime.now().plusHours(horas).isAfter(inicio)) {
        throw new ResponseStatusException(
            HttpStatus.BAD_REQUEST,
            "Solo se puede cancelar hasta " + horas + " horas antes del partido");
      }
    }
    ReservaDto cancelada = reservas.cambiarEstado(id, EstadoReserva.CANCELADA);
    return ReservaVista.de(cancelada, usuarioDe(cancelada.usuarioId()), cancha);
  }

  /** Una reserva en la forma del frontend. */
  public ReservaVista vista(ReservaDto r) {
    return ReservaVista.de(r, usuarioDe(r.usuarioId()), canchaSegura(r.canchaId()));
  }

  /** Varias reservas: cada cancha y los usuarios se buscan una sola vez. */
  public List<ReservaVista> vistas(List<ReservaDto> lista) {
    Map<Long, UsuarioResumen> porUsuario =
        usuarios(lista.stream().map(ReservaDto::usuarioId).toList());
    Map<Long, CanchaDto> porCancha = new HashMap<>();
    return lista.stream()
        .map(
            r ->
                ReservaVista.de(
                    r,
                    porUsuario.getOrDefault(
                        r.usuarioId(), UsuarioResumen.desconocido(r.usuarioId())),
                    porCancha.computeIfAbsent(r.canchaId(), this::canchaSegura)))
        .toList();
  }

  /** Usuarios locales por id (los nombres que se muestran en las reservas). */
  public Map<Long, UsuarioResumen> usuarios(Collection<Long> ids) {
    return usuarios.findAllById(new HashSet<>(ids)).stream()
        .collect(Collectors.toMap(Usuario::getId, UsuarioResumen::de));
  }

  public static boolean esPersonal(Usuario u) {
    return u.getRol() == Role.ADMIN || u.getRol() == Role.PROPIETARIO;
  }

  private UsuarioResumen usuarioDe(Long id) {
    return usuarios
        .findById(id)
        .map(UsuarioResumen::de)
        .orElseGet(() -> UsuarioResumen.desconocido(id));
  }

  /**
   * Datos de la cancha para mostrar una reserva que ya existe. Si el proveedor 1 no responde la
   * reserva se muestra igual, con la cancha solo por su id.
   */
  private CanchaDto canchaSegura(Long canchaId) {
    try {
      return escenarios.cancha(canchaId);
    } catch (ResponseStatusException e) {
      log.warn("Cancha {} sin datos de servicio-escenarios: {}", canchaId, e.getReason());
      return CanchaDto.sinDatos(canchaId);
    }
  }
}
