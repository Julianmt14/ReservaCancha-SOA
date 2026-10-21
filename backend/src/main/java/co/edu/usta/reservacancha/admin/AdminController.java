package co.edu.usta.reservacancha.admin;

import co.edu.usta.reservacancha.pago.PagoRepository;
import co.edu.usta.reservacancha.reserva.ReservaRepository;
import java.util.Map;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasAnyRole('ADMIN','PROPIETARIO')")
public class AdminController {

  private final ReservaRepository reservas;
  private final PagoRepository pagos;

  public AdminController(ReservaRepository reservas, PagoRepository pagos) {
    this.reservas = reservas;
    this.pagos = pagos;
  }

  @GetMapping("/resumen")
  public Map<String, Object> resumen() {
    return Map.of(
        "totalReservas", reservas.count(),
        "totalPagos", pagos.count());
  }

  @GetMapping("/reservas")
  public Object todas() {
    return reservas.findAll();
  }

  @GetMapping("/pagos")
  public Object pagos() {
    return pagos.findAll();
  }
}
