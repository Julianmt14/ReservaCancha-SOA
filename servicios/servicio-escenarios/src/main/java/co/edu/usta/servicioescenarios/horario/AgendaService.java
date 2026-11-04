package co.edu.usta.servicioescenarios.horario;

import co.edu.usta.servicioescenarios.cancha.Cancha;
import co.edu.usta.servicioescenarios.cancha.CanchaService;
import co.edu.usta.servicioescenarios.common.Errores;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.TreeSet;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Agenda de una cancha según sus horarios: franjas de un día y cotización de un rango. Es la fuente
 * de verdad de las reglas de reserva; no sabe nada de reservas ocupadas.
 */
@Service
public class AgendaService {

  private static final DateTimeFormatter HH_MM = DateTimeFormatter.ofPattern("HH:mm");
  private static final BigDecimal SESENTA = BigDecimal.valueOf(60);
  private static final BigDecimal CIEN = BigDecimal.valueOf(100);

  private final CanchaService canchas;
  private final HorarioService horarios;
  private final Clock reloj;

  public AgendaService(CanchaService canchas, HorarioService horarios, Clock reloj) {
    this.canchas = canchas;
    this.horarios = horarios;
    this.reloj = reloj;
  }

  /** Franjas de 1 h dentro de los horarios activos del día; sin horario → cerrada y sin franjas. */
  @Transactional(readOnly = true)
  public FranjasDto franjas(Long canchaId, LocalDate fecha) {
    canchas.buscar(canchaId);
    List<Horario> delDia = horarios.delDia(canchaId, fecha.getDayOfWeek());
    TreeSet<LocalTime> inicios = new TreeSet<>(); // ordena y evita repetidas si hay traslapes
    for (Horario h : delDia) {
      LocalTime ini = h.getHoraApertura();
      LocalTime fin = ini.plusHours(1);
      while (fin.isAfter(ini) && !fin.isAfter(h.getHoraCierre())) { // fin > ini: sin medianoche
        inicios.add(ini);
        ini = fin;
        fin = ini.plusHours(1);
      }
    }
    List<FranjasDto.Franja> franjas =
        inicios.stream()
            .map(i -> new FranjasDto.Franja(i.format(HH_MM), i.plusHours(1).format(HH_MM)))
            .toList();
    return new FranjasDto(canchaId, fecha, !delDia.isEmpty(), franjas);
  }

  /** Valida el rango contra las reglas de la cancha (en el orden del contrato) y lo cotiza. */
  @Transactional(readOnly = true)
  public CotizacionDto cotizar(Long canchaId, LocalDate fecha, LocalTime inicio, LocalTime fin) {
    Cancha c = canchas.buscar(canchaId);
    if (!c.isActiva()) {
      throw Errores.solicitudInvalida("Cancha inactiva");
    }
    if (!fin.isAfter(inicio)) {
      throw Errores.solicitudInvalida("horaFin debe ser mayor a horaInicio");
    }
    if (!enPuntoOyMedia(inicio) || !enPuntoOyMedia(fin)) {
      throw Errores.solicitudInvalida("Las horas deben ser en punto o y media");
    }
    long minutos = Duration.between(inicio, fin).toMinutes();
    if (minutos < c.getDuracionMinimaMin()) {
      throw Errores.solicitudInvalida(
          "La reserva mínima es de " + c.getDuracionMinimaMin() + " minutos");
    }
    if (!LocalDateTime.of(fecha, inicio).isAfter(LocalDateTime.now(reloj))) {
      throw Errores.solicitudInvalida("No se puede reservar en un horario que ya pasó");
    }
    boolean dentro =
        horarios.delDia(canchaId, fecha.getDayOfWeek()).stream()
            .anyMatch(h -> h.contiene(inicio, fin));
    if (!dentro) {
      throw Errores.solicitudInvalida("Fuera del horario de operación de la cancha");
    }

    BigDecimal valorTotal =
        c.getPrecioHora()
            .multiply(BigDecimal.valueOf(minutos))
            .divide(SESENTA, 2, RoundingMode.HALF_UP);
    BigDecimal valorAbono =
        valorTotal
            .multiply(BigDecimal.valueOf(c.getPorcentajeAbono()))
            .divide(CIEN, 2, RoundingMode.HALF_UP);
    return new CotizacionDto(
        canchaId, fecha, inicio, fin, minutos, valorTotal, valorAbono, c.getHorasCancelacion());
  }

  private static boolean enPuntoOyMedia(LocalTime t) {
    return (t.getMinute() == 0 || t.getMinute() == 30) && t.getSecond() == 0 && t.getNano() == 0;
  }
}
