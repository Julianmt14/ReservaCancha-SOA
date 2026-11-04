package co.edu.usta.reservacancha.escenarios;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

/**
 * Cuerpo para crear o actualizar una cancha. Acepta el cuerpo de siempre del frontend ({@code
 * nombre, tipo, superficie, ubicacion, precioHora, activa}) y también una cancha completa con sus
 * {@code reglas} anidadas (la baja lógica reenvía la cancha entera con {@code activa:false}).
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record CanchaRequest(
    Long establecimientoId,
    @NotBlank String nombre,
    String deporte,
    String tipo,
    String superficie,
    String ubicacion,
    @NotNull @DecimalMin("0") BigDecimal precioHora,
    Boolean activa,
    Integer duracionMinimaMin,
    Integer horasCancelacion,
    Integer porcentajeAbono,
    ReglasDto reglas) {

  /**
   * Cuerpo plano que espera servicio-escenarios: las reglas anidadas pasan a sus campos y lo que
   * falte se toma de la cancha actual (si se está actualizando), para que una edición desde el
   * frontend no reinicie el deporte ni las reglas.
   */
  public CanchaRequest paraProveedor(CanchaDto actual) {
    ReglasDto r = reglas;
    ReglasDto previas = actual == null ? null : actual.reglas();
    return new CanchaRequest(
        primero(establecimientoId, actual == null ? null : actual.establecimientoId()),
        nombre,
        primero(deporte, actual == null ? null : actual.deporte()),
        tipo,
        superficie,
        ubicacion,
        precioHora,
        activa,
        primero(
            duracionMinimaMin,
            r == null ? null : r.duracionMinimaMin(),
            previas == null ? null : previas.duracionMinimaMin()),
        primero(
            horasCancelacion,
            r == null ? null : r.horasCancelacion(),
            previas == null ? null : previas.horasCancelacion()),
        primero(
            porcentajeAbono,
            r == null ? null : r.porcentajeAbono(),
            previas == null ? null : previas.porcentajeAbono()),
        null);
  }

  @SafeVarargs
  private static <T> T primero(T... valores) {
    for (T v : valores) if (v != null) return v;
    return null;
  }
}
