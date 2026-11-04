package co.edu.usta.servicioescenarios.horario;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;

/** Resultado de validar un rango contra las reglas de la cancha y calcular su valor. */
public record CotizacionDto(
    Long canchaId,
    LocalDate fecha,
    LocalTime horaInicio,
    LocalTime horaFin,
    long minutos,
    BigDecimal valorTotal,
    BigDecimal valorAbono,
    int horasCancelacion) {}
