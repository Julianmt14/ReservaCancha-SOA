package co.edu.usta.reservacancha.pago;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PagoRepository extends JpaRepository<Pago, Long> {
  List<Pago> findByReservaId(Long reservaId);

  Optional<Pago> findByReferencia(String referencia);
}
