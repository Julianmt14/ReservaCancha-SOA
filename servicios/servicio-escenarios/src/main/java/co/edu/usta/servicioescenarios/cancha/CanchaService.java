package co.edu.usta.servicioescenarios.cancha;

import co.edu.usta.servicioescenarios.common.Errores;
import co.edu.usta.servicioescenarios.establecimiento.Establecimiento;
import co.edu.usta.servicioescenarios.establecimiento.EstablecimientoRepository;
import java.util.List;
import java.util.Locale;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Reglas de negocio de las canchas: consulta, alta y modificación (incluida la baja lógica). */
@Service
public class CanchaService {

  static final long ESTABLECIMIENTO_POR_DEFECTO = 1L;
  static final String DEPORTE_POR_DEFECTO = "FUTBOL";
  static final int DURACION_MINIMA_POR_DEFECTO = 60;
  static final int HORAS_CANCELACION_POR_DEFECTO = 3;
  static final int PORCENTAJE_ABONO_POR_DEFECTO = 50;

  private final CanchaRepository canchas;
  private final EstablecimientoRepository establecimientos;

  public CanchaService(CanchaRepository canchas, EstablecimientoRepository establecimientos) {
    this.canchas = canchas;
    this.establecimientos = establecimientos;
  }

  @Transactional(readOnly = true)
  public List<Cancha> activas(String deporte, Long establecimientoId) {
    String filtro =
        deporte == null || deporte.isBlank() ? null : deporte.trim().toUpperCase(Locale.ROOT);
    return canchas.buscarActivas(filtro, establecimientoId);
  }

  /** La cancha aunque esté inactiva; 404 si no existe. */
  @Transactional(readOnly = true)
  public Cancha buscar(Long id) {
    return canchas.findById(id).orElseThrow(() -> Errores.noEncontrado("Cancha no existe"));
  }

  @Transactional
  public Cancha crear(CanchaRequest in) {
    Cancha c = new Cancha();
    c.setEstablecimiento(
        establecimiento(
            in.establecimientoId() == null ? ESTABLECIMIENTO_POR_DEFECTO : in.establecimientoId()));
    c.setDeporte(DEPORTE_POR_DEFECTO);
    c.setDuracionMinimaMin(DURACION_MINIMA_POR_DEFECTO);
    c.setHorasCancelacion(HORAS_CANCELACION_POR_DEFECTO);
    c.setPorcentajeAbono(PORCENTAJE_ABONO_POR_DEFECTO);
    c.setActiva(true);
    return canchas.save(aplicar(c, in));
  }

  /** Modifica la cancha; con activa=false queda dada de baja (baja lógica). */
  @Transactional
  public Cancha actualizar(Long id, CanchaRequest in) {
    Cancha c = buscar(id);
    if (in.establecimientoId() != null) {
      c.setEstablecimiento(establecimiento(in.establecimientoId()));
    }
    return canchas.save(aplicar(c, in));
  }

  /** Copia los campos que llegaron; los opcionales en null no cambian el valor que ya tiene. */
  private Cancha aplicar(Cancha c, CanchaRequest in) {
    c.setNombre(in.nombre().trim());
    c.setTipo(in.tipo());
    c.setSuperficie(in.superficie());
    c.setUbicacion(in.ubicacion());
    c.setPrecioHora(in.precioHora());
    if (in.deporte() != null && !in.deporte().isBlank()) {
      c.setDeporte(in.deporte().trim().toUpperCase(Locale.ROOT));
    }
    if (in.activa() != null) c.setActiva(in.activa());
    if (in.duracionMinimaMin() != null) c.setDuracionMinimaMin(in.duracionMinimaMin());
    if (in.horasCancelacion() != null) c.setHorasCancelacion(in.horasCancelacion());
    if (in.porcentajeAbono() != null) c.setPorcentajeAbono(in.porcentajeAbono());
    return c;
  }

  private Establecimiento establecimiento(Long id) {
    return establecimientos
        .findById(id)
        .orElseThrow(() -> Errores.noEncontrado("Establecimiento no existe"));
  }
}
