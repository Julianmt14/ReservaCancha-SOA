package co.edu.usta.reservacancha.admin;

import co.edu.usta.reservacancha.pago.PagoService;
import co.edu.usta.reservacancha.reserva.ReservaOrquestador;
import co.edu.usta.reservacancha.reservas.ReservasClient;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasAnyRole('ADMIN','PROPIETARIO')")
public class AdminController {

  private final ReservasClient reservas;
  private final ReservaOrquestador orquestador;
  private final PagoService pagos;
  private final MetricasService metricas;

  public AdminController(
      ReservasClient reservas,
      ReservaOrquestador orquestador,
      PagoService pagos,
      MetricasService metricas) {
    this.reservas = reservas;
    this.orquestador = orquestador;
    this.pagos = pagos;
    this.metricas = metricas;
  }

  /**
   * Totales de servicio-reservas y servicio-pagos. Si alguno está apagado el resumen igual
   * responde: su total queda en null y se explica en "aviso".
   */
  @GetMapping("/resumen")
  public Map<String, Object> resumen() {
    Map<String, Object> r = new LinkedHashMap<>();
    StringBuilder aviso = new StringBuilder();
    try {
      r.put("totalReservas", reservas.todas().size());
    } catch (ResponseStatusException e) {
      r.put("totalReservas", null);
      aviso.append(e.getReason());
    }
    try {
      r.put("totalPagos", pagos.totalPagos());
    } catch (ResponseStatusException e) {
      r.put("totalPagos", null);
      aviso.append(aviso.isEmpty() ? "" : " ").append(e.getReason());
    }
    if (!aviso.isEmpty()) r.put("aviso", aviso.toString());
    return r;
  }

  /** Agenda: la ven también los empleados (quién reservó, su celular y el estado del pago). */
  @GetMapping("/reservas")
  @PreAuthorize("hasAnyRole('ADMIN','PROPIETARIO','EMPLEADO')")
  public Object todas() {
    return orquestador.vistas(reservas.todas());
  }

  /** Reservas, ingresos, abonos cobrados, ocupación por cancha y horas más pedidas. */
  @GetMapping("/metricas")
  public MetricasService.Metricas metricas(
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
          LocalDate desde,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
          LocalDate hasta) {
    LocalDate hoy = LocalDate.now();
    return metricas.calcular(
        desde != null ? desde : hoy.minusDays(6), hasta != null ? hasta : hoy.plusDays(7));
  }

  @GetMapping("/pagos")
  public Object pagos() {
    return pagos.todos();
  }
}
