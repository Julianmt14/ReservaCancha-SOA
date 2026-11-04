package co.edu.usta.servicioescenarios.common;

import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** Para saber si el servicio está encendido; es público. */
@RestController
public class PingController {

  @GetMapping("/api/ping")
  public Map<String, String> ping() {
    return Map.of("servicio", "servicio-escenarios", "estado", "ok");
  }
}
