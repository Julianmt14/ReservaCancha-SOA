package co.edu.usta.servicioreservas.common;

import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** Para saber si el servicio está encendido; no pide clave. */
@RestController
public class PingController {

  @GetMapping("/api/ping")
  public Map<String, Object> ping() {
    return Map.of("servicio", "servicio-reservas", "estado", "ok");
  }
}
