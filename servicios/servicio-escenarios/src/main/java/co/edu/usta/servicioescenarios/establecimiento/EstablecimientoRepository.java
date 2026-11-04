package co.edu.usta.servicioescenarios.establecimiento;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EstablecimientoRepository extends JpaRepository<Establecimiento, Long> {

  List<Establecimiento> findByActivoTrueOrderByIdAsc();
}
