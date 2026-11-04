package co.edu.usta.reservacancha.reservas;

import com.fasterxml.jackson.annotation.JsonFormat;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;

/** Lo que cruza hacia servicio-reservas para crear una reserva, con el valor ya cotizado. */
public record NuevaReservaRequest(
    Long usuarioId,
    Long canchaId,
    @JsonFormat(shape = JsonFormat.Shape.STRING) LocalDate fecha,
    @JsonFormat(shape = JsonFormat.Shape.STRING) LocalTime horaInicio,
    @JsonFormat(shape = JsonFormat.Shape.STRING) LocalTime horaFin,
    BigDecimal valorTotal) {}
