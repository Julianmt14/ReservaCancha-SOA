package co.edu.usta.serviciopagos.common;

import java.time.Instant;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

/** Errores con el mismo formato del backend de ReservaCancha: {error, status, ts}. */
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

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<Map<String, Object>> validation(MethodArgumentNotValidException e) {
    String detalle =
        e.getFieldErrors().stream()
            .map(f -> f.getField() + " " + f.getDefaultMessage())
            .reduce((a, b) -> a + ", " + b)
            .orElse("datos inválidos");
    return ResponseEntity.badRequest()
        .body(
            Map.of(
                "error",
                "Solicitud de pago inválida: " + detalle,
                "status",
                400,
                "ts",
                Instant.now().toString()));
  }

  @ExceptionHandler(HttpMessageNotReadableException.class)
  public ResponseEntity<Map<String, Object>> ilegible(HttpMessageNotReadableException e) {
    return ResponseEntity.badRequest()
        .body(
            Map.of(
                "error",
                "El cuerpo de la solicitud no es un JSON válido",
                "status",
                400,
                "ts",
                Instant.now().toString()));
  }
}
