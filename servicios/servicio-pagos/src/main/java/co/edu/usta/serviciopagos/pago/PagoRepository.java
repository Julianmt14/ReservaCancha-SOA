package co.edu.usta.serviciopagos.pago;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PagoRepository extends JpaRepository<Pago, Long> {
  List<Pago> findByReservaIdOrderByIdAsc(Long reservaId);

  Optional<Pago> findByReferencia(String referencia);

  boolean existsByReservaIdAndEstado(Long reservaId, EstadoPago estado);
}
