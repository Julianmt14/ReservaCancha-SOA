package co.edu.usta.servicioescenarios.cancha;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CanchaRepository extends JpaRepository<Cancha, Long> {

  /** Canchas activas; cada filtro se ignora cuando llega en null. */
  @Query(
      """
      select c from Cancha c
      where c.activa = true
        and (:deporte is null or c.deporte = :deporte)
        and (:establecimientoId is null or c.establecimiento.id = :establecimientoId)
      order by c.id
      """)
  List<Cancha> buscarActivas(
      @Param("deporte") String deporte, @Param("establecimientoId") Long establecimientoId);
}
