package co.edu.usta.servicioescenarios.common;

import java.util.Map;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.server.ResponseStatusException;

/** Errores con el mismo formato del backend de ReservaCancha y de servicio-pagos. */
@RestControllerAdvice
public class GlobalExceptionHandler {

  @ExceptionHandler(ResponseStatusException.class)
  public ResponseEntity<Map<String, Object>> rse(ResponseStatusException e) {
    String mensaje = e.getReason() == null ? e.getStatusCode().toString() : e.getReason();
    return ResponseEntity.status(e.getStatusCode())
        .body(Errores.cuerpo(e.getStatusCode().value(), mensaje));
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<Map<String, Object>> validacion(MethodArgumentNotValidException e) {
    String detalle =
        e.getFieldErrors().stream()
            .map(f -> f.getField() + " " + f.getDefaultMessage())
            .reduce((a, b) -> a + ", " + b)
            .orElse("datos inválidos");
    return malo("Solicitud inválida: " + detalle);
  }

  @ExceptionHandler(HttpMessageNotReadableException.class)
  public ResponseEntity<Map<String, Object>> ilegible(HttpMessageNotReadableException e) {
    return malo("El cuerpo de la solicitud no es un JSON válido");
  }

  @ExceptionHandler(MissingServletRequestParameterException.class)
  public ResponseEntity<Map<String, Object>> faltaParametro(
      MissingServletRequestParameterException e) {
    return malo("Falta el parámetro " + e.getParameterName());
  }

  /** Fechas u horas mal escritas: fecha=YYYY-MM-DD, horas HH:mm o HH:mm:ss. */
  @ExceptionHandler(MethodArgumentTypeMismatchException.class)
  public ResponseEntity<Map<String, Object>> tipoInvalido(MethodArgumentTypeMismatchException e) {
    return malo("Valor inválido para " + e.getName() + ": " + e.getValue());
  }

  /** Un CHECK o una FK de schema.sql rechazó los datos. */
  @ExceptionHandler(DataIntegrityViolationException.class)
  public ResponseEntity<Map<String, Object>> integridad(DataIntegrityViolationException e) {
    return ResponseEntity.status(HttpStatus.CONFLICT)
        .body(Errores.cuerpo(409, "Los datos violan una restricción de la base de datos"));
  }

  private static ResponseEntity<Map<String, Object>> malo(String mensaje) {
    return ResponseEntity.badRequest().body(Errores.cuerpo(400, mensaje));
  }
}
