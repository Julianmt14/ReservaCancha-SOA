package co.edu.usta.reservacancha.pago;

import co.edu.usta.reservacancha.escenarios.CanchaDto;
import co.edu.usta.reservacancha.escenarios.EscenariosClient;
import co.edu.usta.reservacancha.reserva.EstadoReserva;
import co.edu.usta.reservacancha.reserva.ReservaOrquestador;
import co.edu.usta.reservacancha.reserva.ReservaVista;
import co.edu.usta.reservacancha.reservas.ReservaDto;
import co.edu.usta.reservacancha.reservas.ReservasClient;
import co.edu.usta.reservacancha.user.Usuario;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * Coordina los pagos desde ReservaCancha: toma la reserva de servicio-reservas y revisa los
 * permisos (el usuario es de esta aplicación), le pide la operación a servicio-pagos por HTTP y, si
 * el pago queda aprobado, le pide a servicio-reservas marcar la reserva PAGADA.
 */
@Service
public class PagoService {

  private final PagosClient pagos;
  private final ReservasClient reservas;
  private final ReservaOrquestador orquestador;
  private final EscenariosClient escenarios;

  public PagoService(
      PagosClient pagos,
      ReservasClient reservas,
      ReservaOrquestador orquestador,
      EscenariosClient escenarios) {
    this.escenarios = escenarios;
    this.pagos = pagos;
    this.reservas = reservas;
    this.orquestador = orquestador;
  }

  /**
   * Inicia el pago del abono de una reserva PENDIENTE: el porcentaje lo pone el proveedor 1 en las
   * reglas de la cancha. Si la cancha no pide abono (0 %), no hay nada que pagar en línea.
   */
  public Map<String, Object> iniciarPago(Long reservaId, Usuario quien) {
    ReservaDto r = reservaAutorizada(reservaId, quien);
    if (r.estado() == EstadoReserva.CANCELADA) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Reserva cancelada");
    }
    if (r.estado() != EstadoReserva.PENDIENTE) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "La reserva ya fue pagada");
    }
    BigDecimal abono = abono(r);
    IntencionPagoDto i = pagos.registrar(new RegistrarPagoRequest(r.id(), abono));
    return Map.of(
        "valor", abono,
        "referencia", i.referencia(),
        "valorCentavos", i.valorCentavos(),
        "moneda", i.moneda(),
        "firmaIntegridad", i.firmaIntegridad(),
        "llavePublica", i.llavePublica(),
        "reservaId", r.id());
  }

  /** Valor del abono: porcentaje de la cancha sobre el valor total, redondeado a pesos. */
  private BigDecimal abono(ReservaDto r) {
    CanchaDto cancha = escenarios.cancha(r.canchaId());
    int porcentaje = cancha.reglas() == null ? 100 : cancha.reglas().porcentajeAbono();
    if (porcentaje <= 0) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Esta cancha no pide abono: se paga completo en la cancha");
    }
    return r.valorTotal()
        .multiply(BigDecimal.valueOf(porcentaje))
        .divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP);
  }

  /** Pagos de una reserva; solo su dueño o el personal del establecimiento. */
  public List<PagoConReserva> porReserva(Long reservaId, Usuario quien) {
    ReservaVista r = orquestador.vista(reservaAutorizada(reservaId, quien));
    return pagos.porReserva(reservaId).stream().map(p -> PagoConReserva.de(p, r)).toList();
  }

  /** Confirma con la transacción que devolvió el Widget; el servicio la verifica con Wompi. */
  public PagoConReserva confirmar(Long reservaId, String transactionId, Usuario quien) {
    ReservaDto r = reservaAutorizada(reservaId, quien);
    PagoDto p = pagos.confirmar(new ConfirmarPagoRequest(reservaId, transactionId));
    return aplicar(p, r);
  }

  /** Webhook de Wompi ya validado: lo aplica el servicio de pagos y se actualiza la reserva. */
  public PagoConReserva notificar(String referencia, String transactionId, String status) {
    PagoDto p = pagos.notificar(new NotificacionPagoRequest(referencia, transactionId, status));
    return aplicar(p, reservas.una(p.reservaId()));
  }

  /** Todos los pagos con su reserva, para el panel de administrador y propietario. */
  public List<PagoConReserva> todos() {
    List<PagoDto> lista = pagos.todos();
    if (lista.isEmpty()) return List.of();
    Map<Long, ReservaVista> porId =
        orquestador.vistas(reservas.todas()).stream()
            .collect(Collectors.toMap(ReservaVista::id, Function.identity()));
    return lista.stream()
        .filter(p -> porId.containsKey(p.reservaId()))
        .map(p -> PagoConReserva.de(p, porId.get(p.reservaId())))
        .toList();
  }

  /** Cuántos pagos hay (solo le pregunta a servicio-pagos). */
  public int totalPagos() {
    return pagos.todos().size();
  }

  /** Si el pago quedó aprobado y la reserva sigue PENDIENTE, servicio-reservas la marca PAGADA. */
  private PagoConReserva aplicar(PagoDto p, ReservaDto r) {
    ReservaDto actual = r;
    if (p.aprobado() && r.estado() == EstadoReserva.PENDIENTE) {
      actual = reservas.cambiarEstado(r.id(), EstadoReserva.PAGADA);
    }
    return PagoConReserva.de(p, orquestador.vista(actual));
  }

  private ReservaDto reservaAutorizada(Long reservaId, Usuario quien) {
    ReservaDto r = reservas.una(reservaId);
    if (!ReservaOrquestador.esPersonal(quien) && !r.usuarioId().equals(quien.getId())) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Sin permiso sobre esta reserva");
    }
    return r;
  }
}
