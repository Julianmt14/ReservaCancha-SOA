package co.edu.usta.reservacancha.pago;

import co.edu.usta.reservacancha.reserva.EstadoReserva;
import co.edu.usta.reservacancha.reserva.Reserva;
import co.edu.usta.reservacancha.reserva.ReservaRepository;
import co.edu.usta.reservacancha.user.Role;
import co.edu.usta.reservacancha.user.Usuario;
import jakarta.transaction.Transactional;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * Coordina los pagos desde ReservaCancha: revisa la reserva y los permisos (datos propios), le pide
 * la operación a servicio-pagos por HTTP y, si el pago queda aprobado, marca la reserva PAGADA. Los
 * pagos ya no viven aquí: son del servicio.
 */
@Service
public class PagoService {

  private final PagosClient pagos;
  private final ReservaRepository reservas;

  public PagoService(PagosClient pagos, ReservaRepository reservas) {
    this.pagos = pagos;
    this.reservas = reservas;
  }

  /** Inicia el pago de una reserva PENDIENTE: registrarPago en el servicio de pagos. */
  public Map<String, Object> iniciarPago(Long reservaId, Usuario quien) {
    Reserva r = reservaAutorizada(reservaId, quien);
    if (r.getEstado() == EstadoReserva.CANCELADA) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Reserva cancelada");
    }
    if (r.getEstado() != EstadoReserva.PENDIENTE) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "La reserva ya fue pagada");
    }
    IntencionPagoDto i = pagos.registrar(new RegistrarPagoRequest(r.getId(), r.getValorTotal()));
    return Map.of(
        "referencia", i.referencia(),
        "valorCentavos", i.valorCentavos(),
        "moneda", i.moneda(),
        "firmaIntegridad", i.firmaIntegridad(),
        "llavePublica", i.llavePublica(),
        "reservaId", r.getId());
  }

  /** Pagos de una reserva; solo su dueño o el personal del establecimiento. */
  public List<PagoConReserva> porReserva(Long reservaId, Usuario quien) {
    Reserva r = reservaAutorizada(reservaId, quien);
    return pagos.porReserva(reservaId).stream().map(p -> PagoConReserva.de(p, r)).toList();
  }

  /** Confirma con la transacción que devolvió el Widget; el servicio la verifica con Wompi. */
  @Transactional
  public PagoConReserva confirmar(Long reservaId, String transactionId, Usuario quien) {
    Reserva r = reservaAutorizada(reservaId, quien);
    PagoDto p = pagos.confirmar(new ConfirmarPagoRequest(reservaId, transactionId));
    return aplicar(p, r);
  }

  /** Webhook de Wompi ya validado: lo aplica el servicio y aquí se actualiza la reserva. */
  @Transactional
  public PagoConReserva notificar(String referencia, String transactionId, String status) {
    PagoDto p = pagos.notificar(new NotificacionPagoRequest(referencia, transactionId, status));
    Reserva r =
        reservas
            .findById(p.reservaId())
            .orElseThrow(
                () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reserva no existe"));
    return aplicar(p, r);
  }

  /** Todos los pagos con su reserva, para el panel de administrador y propietario. */
  public List<PagoConReserva> todos() {
    List<PagoDto> lista = pagos.todos();
    Map<Long, Reserva> porId =
        reservas.findAllById(lista.stream().map(PagoDto::reservaId).distinct().toList()).stream()
            .collect(Collectors.toMap(Reserva::getId, Function.identity()));
    return lista.stream()
        .filter(p -> porId.containsKey(p.reservaId()))
        .map(p -> PagoConReserva.de(p, porId.get(p.reservaId())))
        .toList();
  }

  private PagoConReserva aplicar(PagoDto p, Reserva r) {
    if (p.aprobado()) {
      r.setEstado(EstadoReserva.PAGADA);
      reservas.save(r);
    }
    return PagoConReserva.de(p, r);
  }

  private Reserva reservaAutorizada(Long reservaId, Usuario quien) {
    Reserva r =
        reservas
            .findById(reservaId)
            .orElseThrow(
                () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reserva no existe"));
    boolean personal = quien.getRol() == Role.ADMIN || quien.getRol() == Role.PROPIETARIO;
    if (!personal && !r.getUsuario().getId().equals(quien.getId())) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Sin permiso sobre esta reserva");
    }
    return r;
  }
}
