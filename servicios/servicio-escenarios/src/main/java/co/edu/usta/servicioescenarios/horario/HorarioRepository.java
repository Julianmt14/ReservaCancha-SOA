package co.edu.usta.servicioescenarios.horario;

import java.time.DayOfWeek;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HorarioRepository extends JpaRepository<Horario, Long> {

  List<Horario> findByCanchaIdAndActivoTrue(Long canchaId);

  List<Horario> findByCanchaIdAndDiaSemanaAndActivoTrueOrderByHoraAperturaAsc(
      Long canchaId, DayOfWeek diaSemana);
}
