package co.edu.usta.servicioreservas.reserva;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ReservaRepository extends JpaRepository<Reserva, Long> {

  List<Reserva> findAllByOrderByFechaAscHoraInicioAscIdAsc();

  List<Reserva> findByUsuarioIdOrderByFechaAscHoraInicioAscIdAsc(Long usuarioId);

  List<Reserva> findByCanchaIdOrderByFechaAscHoraInicioAscIdAsc(Long canchaId);

  List<Reserva> findByCanchaIdAndFechaGreaterThanEqualOrderByFechaAscHoraInicioAscIdAsc(
      Long canchaId, LocalDate desde);

  List<Reserva> findByFechaGreaterThanEqualOrderByFechaAscHoraInicioAscIdAsc(LocalDate desde);

  List<Reserva> findByCanchaIdAndFechaAndEstadoNotOrderByHoraInicioAsc(
      Long canchaId, LocalDate fecha, EstadoReserva estado);

  /**
   * Consulta previa de traslape, para responder 409 rápido en el caso normal: hay choque si (inicio
   * < finExistente) y (fin > inicioExistente). No basta sola ante solicitudes simultáneas; eso lo
   * garantiza la restricción UNIQUE de bloques_reservados.
   */
  @Query(
      """
      SELECT CASE WHEN COUNT(r) > 0 THEN TRUE ELSE FALSE END FROM Reserva r
      WHERE r.canchaId = :canchaId AND r.fecha = :fecha
        AND r.estado <> co.edu.usta.servicioreservas.reserva.EstadoReserva.CANCELADA
        AND r.horaInicio < :horaFin AND r.horaFin > :horaInicio
      """)
  boolean existeTraslape(
      @Param("canchaId") Long canchaId,
      @Param("fecha") LocalDate fecha,
      @Param("horaInicio") LocalTime horaInicio,
      @Param("horaFin") LocalTime horaFin);
}
