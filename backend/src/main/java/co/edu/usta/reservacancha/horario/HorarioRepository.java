package co.edu.usta.reservacancha.horario;

import java.time.DayOfWeek;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HorarioRepository extends JpaRepository<Horario, Long> {
  List<Horario> findByCanchaIdAndDiaSemanaAndActivoTrue(Long canchaId, DayOfWeek diaSemana);

  List<Horario> findByCanchaId(Long canchaId);
}
