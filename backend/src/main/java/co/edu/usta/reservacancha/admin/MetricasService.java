package co.edu.usta.reservacancha.admin;

import co.edu.usta.reservacancha.escenarios.CanchaDto;
import co.edu.usta.reservacancha.escenarios.EscenariosClient;
import co.edu.usta.reservacancha.escenarios.HorarioDto;
import co.edu.usta.reservacancha.pago.PagoDto;
import co.edu.usta.reservacancha.pago.PagosClient;
import co.edu.usta.reservacancha.reserva.EstadoReserva;
import co.edu.usta.reservacancha.reservas.ReservaDto;
import co.edu.usta.reservacancha.reservas.ReservasClient;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * Métricas del administrador en un rango de fechas: junta las reservas del Proveedor 2, las canchas
 * y horarios del Proveedor 1 y los pagos de servicio-pagos.
 */
@Service
public class MetricasService {

  private static final int MAX_DIAS = 92;

  private final ReservasClient reservas;
  private final EscenariosClient escenarios;
  private final PagosClient pagos;

  public MetricasService(ReservasClient reservas, EscenariosClient escenarios, PagosClient pagos) {
    this.reservas = reservas;
    this.escenarios = escenarios;
    this.pagos = pagos;
  }

  public Metricas calcular(LocalDate desde, LocalDate hasta) {
    if (hasta.isBefore(desde)) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "«hasta» debe ser después de «desde»");
    }
    long dias = ChronoUnit.DAYS.between(desde, hasta) + 1;
    if (dias > MAX_DIAS) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "El rango máximo es de " + MAX_DIAS + " días");
    }

    List<ReservaDto> delRango =
        reservas.todas().stream()
            .filter(r -> !r.fecha().isBefore(desde) && !r.fecha().isAfter(hasta))
            .toList();
    List<ReservaDto> activas =
        delRango.stream().filter(r -> r.estado() != EstadoReserva.CANCELADA).toList();
    Set<Long> idsActivas = activas.stream().map(ReservaDto::id).collect(Collectors.toSet());

    BigDecimal ingresos =
        activas.stream().map(ReservaDto::valorTotal).reduce(BigDecimal.ZERO, BigDecimal::add);
    // Pagos de servicio-pagos: si está apagado, las métricas salen igual sin el dato del abono
    BigDecimal abonos = null;
    try {
      abonos =
          pagos.todos().stream()
              .filter(p -> p.aprobado() && idsActivas.contains(p.reservaId()))
              .map(PagoDto::valor)
              .reduce(BigDecimal.ZERO, BigDecimal::add);
    } catch (ResponseStatusException e) {
      // abonos queda en null y la web lo explica
    }

    // Por cancha: reservas, horas reservadas y ocupación sobre las horas que abre en el rango
    List<PorCancha> porCancha = new ArrayList<>();
    for (CanchaDto c : escenarios.canchas()) {
      List<ReservaDto> deLaCancha =
          activas.stream().filter(r -> r.canchaId().equals(c.id())).toList();
      long minutos = deLaCancha.stream().mapToLong(MetricasService::minutos).sum();
      long abiertos = minutosAbiertos(escenarios.horarios(c.id()), desde, dias);
      porCancha.add(
          new PorCancha(
              c.id(),
              c.nombre(),
              deLaCancha.size(),
              minutos / 60.0,
              abiertos == 0 ? 0 : Math.round(minutos * 1000.0 / abiertos) / 10.0));
    }

    // Por día (todos los días del rango, aunque no tengan reservas)
    Map<LocalDate, Long> conteoDia =
        activas.stream().collect(Collectors.groupingBy(ReservaDto::fecha, Collectors.counting()));
    List<PorDia> porDia = new ArrayList<>();
    for (LocalDate d = desde; !d.isAfter(hasta); d = d.plusDays(1)) {
      porDia.add(new PorDia(d, conteoDia.getOrDefault(d, 0L)));
    }

    // Horas más pedidas: cada hora que ocupa una reserva cuenta una vez
    Map<Integer, Long> conteoHora = new TreeMap<>();
    for (ReservaDto r : activas) {
      for (int h = r.horaInicio().getHour(); h < r.horaFin().getHour(); h++) {
        conteoHora.merge(h, 1L, Long::sum);
      }
    }
    List<PorHora> porHora =
        conteoHora.entrySet().stream().map(e -> new PorHora(e.getKey(), e.getValue())).toList();

    long jugadores = activas.stream().map(ReservaDto::usuarioId).distinct().count();
    return new Metricas(
        desde,
        hasta,
        activas.size(),
        delRango.size() - activas.size(),
        jugadores,
        ingresos,
        abonos,
        porCancha,
        porDia,
        porHora);
  }

  private static long minutos(ReservaDto r) {
    return Duration.between(r.horaInicio(), r.horaFin()).toMinutes();
  }

  /**
   * Minutos que la cancha abre en el rango, según sus horarios activos de cada día de la semana.
   */
  private static long minutosAbiertos(List<HorarioDto> horarios, LocalDate desde, long dias) {
    long total = 0;
    for (int i = 0; i < dias; i++) {
      var dia = desde.plusDays(i).getDayOfWeek();
      for (HorarioDto h : horarios) {
        if (!Boolean.FALSE.equals(h.activo()) && h.diaSemana() == dia) {
          total += Duration.between(h.horaApertura(), h.horaCierre()).toMinutes();
        }
      }
    }
    return total;
  }

  public record Metricas(
      LocalDate desde,
      LocalDate hasta,
      long reservas,
      long canceladas,
      long jugadores,
      BigDecimal ingresos,
      BigDecimal abonosCobrados,
      List<PorCancha> porCancha,
      List<PorDia> porDia,
      List<PorHora> porHora) {}

  public record PorCancha(
      Long canchaId, String nombre, long reservas, double horas, double ocupacion) {}

  public record PorDia(LocalDate fecha, long reservas) {}

  public record PorHora(int hora, long reservas) {}
}
