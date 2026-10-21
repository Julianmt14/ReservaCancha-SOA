package co.edu.usta.reservacancha.reserva;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ReservaRepository extends JpaRepository<Reserva, Long> {

  List<Reserva> findByUsuarioId(Long usuarioId);

  List<Reserva> findByCanchaIdAndFecha(Long canchaId, LocalDate fecha);

  List<Reserva> findByCanchaIdAndFechaGreaterThanEqualOrderByFechaAscHoraInicioAsc(
      Long canchaId, LocalDate desde);

  // Conflicto de horarios: (inicio < finExistente) AND (fin > inicioExistente)
  @Query(
      """
      SELECT CASE WHEN COUNT(r) > 0 THEN TRUE ELSE FALSE END FROM Reserva r
      WHERE r.cancha.id = :canchaId AND r.fecha = :fecha
        AND r.estado <> co.edu.usta.reservacancha.reserva.EstadoReserva.CANCELADA
        AND r.horaInicio < :horaFin AND r.horaFin > :horaInicio
      """)
  boolean existeTraslape(Long canchaId, LocalDate fecha, LocalTime horaInicio, LocalTime horaFin);
}
