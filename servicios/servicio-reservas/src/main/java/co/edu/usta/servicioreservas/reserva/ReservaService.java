package co.edu.usta.servicioreservas.reserva;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Lógica del Proveedor 2. Es la fuente de verdad de los horarios ocupados: quien garantiza que una
 * cancha no se reserve dos veces en el mismo horario es la restricción UNIQUE de
 * bloques_reservados, no un "consultar y luego guardar".
 */
@Service
public class ReservaService {

  public static final String MSG_CONFLICTO =
      "Conflicto de horario: ya existe una reserva en ese rango";
  static final int MINUTOS_BLOQUE = 30;

  private final ReservaRepository reservas;
  private final BloqueReservadoRepository bloques;

  public ReservaService(ReservaRepository reservas, BloqueReservadoRepository bloques) {
    this.reservas = reservas;
    this.bloques = bloques;
  }

  /**
   * Crea la reserva PENDIENTE y ocupa sus bloques de 30 min en una sola transacción. Si otra
   * solicitud simultánea ya tomó alguno de esos bloques, la base de datos rechaza la inserción
   * (UNIQUE), se deshace todo (ni la reserva ni sus bloques quedan guardados) y se responde 409.
   */
  @Transactional
  public Reserva crear(
      Long usuarioId,
      Long canchaId,
      LocalDate fecha,
      LocalTime inicio,
      LocalTime fin,
      BigDecimal valorTotal) {
    validarHoras(inicio, fin);

    // Consulta previa: en el caso normal (sin carrera) responde 409 sin intentar insertar.
    if (reservas.existeTraslape(canchaId, fecha, inicio, fin)) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, MSG_CONFLICTO);
    }

    Reserva r = new Reserva();
    r.setUsuarioId(usuarioId);
    r.setCanchaId(canchaId);
    r.setFecha(fecha);
    r.setHoraInicio(inicio);
    r.setHoraFin(fin);
    r.setValorTotal(valorTotal.setScale(2, RoundingMode.HALF_UP));
    r.setEstado(EstadoReserva.PENDIENTE);
    try {
      reservas.saveAndFlush(r);
      // Los bloques se insertan en orden de hora: dos solicitudes que compiten chocan siempre en
      // el primer bloque común, así una espera a la otra y no se bloquean mutuamente.
      bloques.saveAllAndFlush(bloquesDe(r));
    } catch (DataIntegrityViolationException e) {
      // uk_bloque (cancha_id, fecha, hora_inicio): otra solicitud ganó ese horario. Al salir con
      // una excepción la transacción se revierte completa.
      throw new ResponseStatusException(HttpStatus.CONFLICT, MSG_CONFLICTO, e);
    }
    return r;
  }

  @Transactional(readOnly = true)
  public Reserva buscar(Long id) {
    return reservas
        .findById(id)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reserva no existe"));
  }

  /** Lista ordenada por fecha y hora de inicio, incluidas las canceladas. */
  @Transactional(readOnly = true)
  public List<Reserva> listar(Long usuarioId, Long canchaId, LocalDate desde) {
    if (usuarioId != null) {
      return reservas.findByUsuarioIdOrderByFechaAscHoraInicioAscIdAsc(usuarioId);
    }
    if (canchaId != null) {
      return desde == null
          ? reservas.findByCanchaIdOrderByFechaAscHoraInicioAscIdAsc(canchaId)
          : reservas.findByCanchaIdAndFechaGreaterThanEqualOrderByFechaAscHoraInicioAscIdAsc(
              canchaId, desde);
    }
    return desde == null
        ? reservas.findAllByOrderByFechaAscHoraInicioAscIdAsc()
        : reservas.findByFechaGreaterThanEqualOrderByFechaAscHoraInicioAscIdAsc(desde);
  }

  /** Reservas que ocupan la cancha ese día (sin las canceladas). */
  @Transactional(readOnly = true)
  public List<Reserva> ocupacion(Long canchaId, LocalDate fecha) {
    return reservas.findByCanchaIdAndFechaAndEstadoNotOrderByHoraInicioAsc(
        canchaId, fecha, EstadoReserva.CANCELADA);
  }

  /** PENDIENTE -> PAGADA; PENDIENTE/PAGADA -> CANCELADA (borra los bloques y libera el horario). */
  @Transactional
  public Reserva cambiarEstado(Long id, EstadoReserva nuevo) {
    Reserva r = buscar(id);
    switch (nuevo) {
      case PAGADA -> {
        if (r.getEstado() != EstadoReserva.PENDIENTE) {
          throw new ResponseStatusException(HttpStatus.CONFLICT, "La reserva no está pendiente");
        }
        r.setEstado(EstadoReserva.PAGADA);
      }
      case CANCELADA -> {
        if (r.getEstado() == EstadoReserva.CANCELADA) {
          throw new ResponseStatusException(HttpStatus.CONFLICT, "La reserva ya está cancelada");
        }
        r.setEstado(EstadoReserva.CANCELADA);
        bloques.borrarDeReserva(r.getId());
      }
      default ->
          throw new ResponseStatusException(
              HttpStatus.BAD_REQUEST, "Estado no válido: use PAGADA o CANCELADA");
    }
    return reservas.saveAndFlush(r);
  }

  private static void validarHoras(LocalTime inicio, LocalTime fin) {
    if (!fin.isAfter(inicio)) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "horaFin debe ser mayor a horaInicio");
    }
    if (!enPuntoOYMedia(inicio) || !enPuntoOYMedia(fin)) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Las horas deben ser en punto o y media");
    }
  }

  private static boolean enPuntoOYMedia(LocalTime h) {
    return h.getMinute() % MINUTOS_BLOQUE == 0 && h.getSecond() == 0 && h.getNano() == 0;
  }

  /** 21:00–22:00 ocupa los bloques 21:00 y 21:30. */
  private static List<BloqueReservado> bloquesDe(Reserva r) {
    List<BloqueReservado> lista = new ArrayList<>();
    for (LocalTime h = r.getHoraInicio();
        h.isBefore(r.getHoraFin());
        h = h.plusMinutes(MINUTOS_BLOQUE)) {
      lista.add(new BloqueReservado(r, h));
    }
    return lista;
  }
}
