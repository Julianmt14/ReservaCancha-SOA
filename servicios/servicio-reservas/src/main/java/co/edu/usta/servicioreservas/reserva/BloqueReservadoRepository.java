package co.edu.usta.servicioreservas.reserva;

import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BloqueReservadoRepository extends JpaRepository<BloqueReservado, Long> {

  List<BloqueReservado> findByCanchaIdAndFechaOrderByHoraInicioAsc(Long canchaId, LocalDate fecha);

  long countByReservaId(Long reservaId);

  /** Al cancelar: borra los bloques de la reserva y el horario vuelve a quedar libre. */
  @Modifying(flushAutomatically = true)
  @Query("DELETE FROM BloqueReservado b WHERE b.reserva.id = :reservaId")
  int borrarDeReserva(@Param("reservaId") Long reservaId);
}
