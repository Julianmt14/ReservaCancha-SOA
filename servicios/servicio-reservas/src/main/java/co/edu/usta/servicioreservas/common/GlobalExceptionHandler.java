package co.edu.usta.servicioreservas.common;

import co.edu.usta.servicioreservas.reserva.ReservaService;
import java.time.Instant;
import java.util.Map;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.server.ResponseStatusException;

/** Errores con el mismo formato del backend de ReservaCancha: {status, error, ts}. */
@RestControllerAdvice
public class GlobalExceptionHandler {

  private static ResponseEntity<Map<String, Object>> error(HttpStatusCode status, String msg) {
    return ResponseEntity.status(status)
        .body(Map.of("status", status.value(), "error", msg, "ts", Instant.now().toString()));
  }

  @ExceptionHandler(ResponseStatusException.class)
  public ResponseEntity<Map<String, Object>> rse(ResponseStatusException e) {
    return error(
        e.getStatusCode(), e.getReason() == null ? e.getStatusCode().toString() : e.getReason());
  }

  /**
   * Red de seguridad: si la restricción UNIQUE de bloques_reservados rechaza una inserción fuera de
   * ReservaService.crear, también es un conflicto de horario (409), nunca un 500.
   */
  @ExceptionHandler(DataIntegrityViolationException.class)
  public ResponseEntity<Map<String, Object>> integridad(DataIntegrityViolationException e) {
    return error(HttpStatus.CONFLICT, ReservaService.MSG_CONFLICTO);
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<Map<String, Object>> validation(MethodArgumentNotValidException e) {
    String detalle =
        e.getFieldErrors().stream()
            .map(f -> f.getField() + " " + f.getDefaultMessage())
            .reduce((a, b) -> a + ", " + b)
            .orElse("datos inválidos");
    return error(HttpStatus.BAD_REQUEST, "Solicitud de reserva inválida: " + detalle);
  }

  @ExceptionHandler(HttpMessageNotReadableException.class)
  public ResponseEntity<Map<String, Object>> ilegible(HttpMessageNotReadableException e) {
    return error(
        HttpStatus.BAD_REQUEST,
        "El cuerpo de la solicitud no es un JSON válido (fechas YYYY-MM-DD, horas HH:mm)");
  }

  @ExceptionHandler(MissingServletRequestParameterException.class)
  public ResponseEntity<Map<String, Object>> faltaParametro(
      MissingServletRequestParameterException e) {
    return error(HttpStatus.BAD_REQUEST, "Falta el parámetro " + e.getParameterName());
  }

  @ExceptionHandler(MethodArgumentTypeMismatchException.class)
  public ResponseEntity<Map<String, Object>> parametroInvalido(
      MethodArgumentTypeMismatchException e) {
    return error(HttpStatus.BAD_REQUEST, "Parámetro inválido: " + e.getName());
  }
}
