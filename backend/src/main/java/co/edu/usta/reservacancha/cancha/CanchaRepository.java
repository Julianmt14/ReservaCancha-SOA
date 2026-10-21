package co.edu.usta.reservacancha.cancha;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CanchaRepository extends JpaRepository<Cancha, Long> {
  List<Cancha> findByActivaTrue();
}
