package co.edu.usta.servicioescenarios.cancha;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

/**
 * Cuerpo para crear o modificar una cancha. Solo nombre y precioHora son obligatorios, así el
 * backend puede seguir mandando su cuerpo viejo {nombre, tipo, superficie, ubicacion, precioHora,
 * activa}. Al crear, lo que falte toma el valor por defecto (establecimiento 1, FUTBOL, 60/3/50,
 * activa); al modificar, lo que falte conserva el valor actual.
 */
public record CanchaRequest(
    Long establecimientoId,
    @NotBlank String nombre,
    String deporte,
    String tipo,
    String superficie,
    String ubicacion,
    @NotNull @DecimalMin("0") BigDecimal precioHora,
    Boolean activa,
    @Min(1) Integer duracionMinimaMin,
    @Min(0) Integer horasCancelacion,
    @Min(0) @Max(100) Integer porcentajeAbono) {}
