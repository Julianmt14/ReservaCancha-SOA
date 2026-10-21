package co.edu.usta.reservacancha.common;

import java.time.Instant;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class GlobalExceptionHandler {

  @ExceptionHandler(ResponseStatusException.class)
  public ResponseEntity<Map<String, Object>> rse(ResponseStatusException e) {
    return ResponseEntity.status(e.getStatusCode())
        .body(
            Map.of(
                "error", e.getReason() == null ? e.getStatusCode().toString() : e.getReason(),
                "status", e.getStatusCode().value(),
                "ts", Instant.now().toString()));
  }

  /** Credenciales invalidas o cuenta deshabilitada: 401 con un mensaje que no revela cual fallo. */
  @ExceptionHandler(AuthenticationException.class)
  public ResponseEntity<Map<String, Object>> autenticacion(AuthenticationException e) {
    return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
        .body(
            Map.of(
                "error", "Credenciales inválidas", "status", 401, "ts", Instant.now().toString()));
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<Map<String, Object>> validation(MethodArgumentNotValidException e) {
    var fields =
        e.getFieldErrors().stream()
            .map(
                f ->
                    Map.of(
                        "campo",
                        f.getField(),
                        "msg",
                        f.getDefaultMessage() == null ? "inválido" : f.getDefaultMessage()))
            .toList();
    return ResponseEntity.badRequest().body(Map.of("error", "Validación", "detalles", fields));
  }
}
