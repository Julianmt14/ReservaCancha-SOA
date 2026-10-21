package co.edu.usta.reservacancha.admin;

import co.edu.usta.reservacancha.pago.PagoService;
import co.edu.usta.reservacancha.reserva.ReservaRepository;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasAnyRole('ADMIN','PROPIETARIO')")
public class AdminController {

  private final ReservaRepository reservas;
  private final PagoService pagos;

  public AdminController(ReservaRepository reservas, PagoService pagos) {
    this.reservas = reservas;
    this.pagos = pagos;
  }

  /**
   * Si servicio-pagos está apagado el resumen igual responde con las reservas: totalPagos queda en
   * null y se explica en "aviso".
   */
  @GetMapping("/resumen")
  public Map<String, Object> resumen() {
    Map<String, Object> r = new LinkedHashMap<>();
    r.put("totalReservas", reservas.count());
    try {
      r.put("totalPagos", pagos.todos().size());
    } catch (ResponseStatusException e) {
      r.put("totalPagos", null);
      r.put("aviso", e.getReason());
    }
    return r;
  }

  @GetMapping("/reservas")
  public Object todas() {
    return reservas.findAll();
  }

  @GetMapping("/pagos")
  public Object pagos() {
    return pagos.todos();
  }
}
