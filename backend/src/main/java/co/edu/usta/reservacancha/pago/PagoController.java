package co.edu.usta.reservacancha.pago;

import co.edu.usta.reservacancha.user.Usuario;
import java.util.List;
import java.util.Map;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/pagos")
public class PagoController {

  private final PagoService pagos;

  public PagoController(PagoService pagos) {
    this.pagos = pagos;
  }

  @PostMapping("/iniciar/{reservaId}")
  public Map<String, Object> iniciar(
      @PathVariable Long reservaId, @AuthenticationPrincipal Usuario usuario) {
    return pagos.iniciarPago(reservaId, usuario);
  }

  @GetMapping("/reserva/{reservaId}")
  public List<PagoConReserva> porReserva(
      @PathVariable Long reservaId, @AuthenticationPrincipal Usuario usuario) {
    return pagos.porReserva(reservaId, usuario);
  }

  @PostMapping("/confirmar/{reservaId}")
  public PagoConReserva confirmar(
      @PathVariable Long reservaId,
      @RequestParam String transactionId,
      @AuthenticationPrincipal Usuario usuario) {
    return pagos.confirmar(reservaId, transactionId, usuario);
  }
}
