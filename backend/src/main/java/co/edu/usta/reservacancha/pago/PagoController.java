package co.edu.usta.reservacancha.pago;

import co.edu.usta.reservacancha.user.Usuario;
import java.util.List;
import java.util.Map;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/pagos")
public class PagoController {

  private final WompiService wompi;

  public PagoController(WompiService wompi) {
    this.wompi = wompi;
  }

  @PostMapping("/iniciar/{reservaId}")
  public Map<String, Object> iniciar(
      @PathVariable Long reservaId, @AuthenticationPrincipal Usuario usuario) {
    return wompi.iniciarPago(reservaId, usuario);
  }

  @GetMapping("/reserva/{reservaId}")
  public List<Pago> porReserva(
      @PathVariable Long reservaId, @AuthenticationPrincipal Usuario usuario) {
    return wompi.porReserva(reservaId, usuario);
  }

  @PostMapping("/confirmar/{reservaId}")
  public Pago confirmar(
      @PathVariable Long reservaId,
      @RequestParam String transactionId,
      @AuthenticationPrincipal Usuario usuario) {
    return wompi.confirmar(reservaId, transactionId, usuario);
  }
}
