package co.edu.usta.reservacancha.escenarios;

/** Reglas de una cancha que decide el proveedor de escenarios. */
public record ReglasDto(
    Integer duracionMinimaMin, Integer horasCancelacion, Integer porcentajeAbono) {}
