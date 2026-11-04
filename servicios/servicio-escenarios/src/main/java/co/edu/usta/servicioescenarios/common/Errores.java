package co.edu.usta.servicioescenarios.common;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/** Forma única de los errores del servicio: {"status": 404, "error": "mensaje", "ts": "..."}. */
public final class Errores {

  private Errores() {}

  public static Map<String, Object> cuerpo(int status, String mensaje) {
    Map<String, Object> cuerpo = new LinkedHashMap<>();
    cuerpo.put("status", status);
    cuerpo.put("error", mensaje);
    cuerpo.put("ts", Instant.now().toString());
    return cuerpo;
  }

  public static ResponseStatusException noEncontrado(String mensaje) {
    return new ResponseStatusException(HttpStatus.NOT_FOUND, mensaje);
  }

  public static ResponseStatusException solicitudInvalida(String mensaje) {
    return new ResponseStatusException(HttpStatus.BAD_REQUEST, mensaje);
  }
}
