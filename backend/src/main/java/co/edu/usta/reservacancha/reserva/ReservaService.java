package co.edu.usta.reservacancha.reserva;

import co.edu.usta.reservacancha.cancha.Cancha;
import co.edu.usta.reservacancha.cancha.CanchaRepository;
import co.edu.usta.reservacancha.horario.Horario;
import co.edu.usta.reservacancha.horario.HorarioRepository;
import co.edu.usta.reservacancha.user.Role;
import co.edu.usta.reservacancha.user.Usuario;
import jakarta.transaction.Transactional;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ReservaService {

  private final ReservaRepository reservas;
  private final CanchaRepository canchas;
  private final HorarioRepository horarios;

  public ReservaService(
      ReservaRepository reservas, CanchaRepository canchas, HorarioRepository horarios) {
    this.reservas = reservas;
    this.canchas = canchas;
    this.horarios = horarios;
  }

  @Transactional
  public Reserva crear(
      Usuario usuario, Long canchaId, LocalDate fecha, LocalTime inicio, LocalTime fin) {
    if (!fin.isAfter(inicio))
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "horaFin debe ser mayor a horaInicio");
    if (fecha.isBefore(LocalDate.now())
        || (fecha.isEqual(LocalDate.now()) && !inicio.isAfter(LocalTime.now()))) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "No se puede reservar en un horario que ya paso");
    }
    Cancha cancha =
        canchas
            .findById(canchaId)
            .orElseThrow(
                () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cancha no existe"));
    if (!cancha.isActiva())
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cancha inactiva");

    // Validar dentro del horario del día (evita reservas fuera de operación)
    List<Horario> delDia =
        horarios.findByCanchaIdAndDiaSemanaAndActivoTrue(canchaId, fecha.getDayOfWeek());
    boolean dentro =
        delDia.stream()
            .anyMatch(
                h -> !inicio.isBefore(h.getHoraApertura()) && !fin.isAfter(h.getHoraCierre()));
    if (!delDia.isEmpty() && !dentro) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Fuera del horario de operación de la cancha");
    }

    // Conflicto de horarios (trazabilidad: nunca doble reserva)
    if (reservas.existeTraslape(canchaId, fecha, inicio, fin)) {
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "Conflicto de horario: ya existe una reserva en ese rango");
    }

    long minutos = Duration.between(inicio, fin).toMinutes();
    BigDecimal horas =
        BigDecimal.valueOf(minutos)
            .divide(BigDecimal.valueOf(60), 2, java.math.RoundingMode.HALF_UP);
    BigDecimal total = cancha.getPrecioHora().multiply(horas);

    Reserva r = new Reserva();
    r.setUsuario(usuario);
    r.setCancha(cancha);
    r.setFecha(fecha);
    r.setHoraInicio(inicio);
    r.setHoraFin(fin);
    r.setValorTotal(total);
    r.setEstado(EstadoReserva.PENDIENTE);
    return reservas.save(r);
  }

  @Transactional
  public Reserva cancelar(Long id, Usuario quien) {
    Reserva r =
        reservas
            .findById(id)
            .orElseThrow(
                () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reserva no existe"));
    boolean dueño = r.getUsuario().getId().equals(quien.getId());
    boolean admin = quien.getRol() == Role.ADMIN || quien.getRol() == Role.PROPIETARIO;
    if (!dueño && !admin) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Sin permiso");
    r.setEstado(EstadoReserva.CANCELADA);
    return reservas.save(r);
  }
}
