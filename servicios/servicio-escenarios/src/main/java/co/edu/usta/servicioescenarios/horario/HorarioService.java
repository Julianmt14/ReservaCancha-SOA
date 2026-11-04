package co.edu.usta.servicioescenarios.horario;

import co.edu.usta.servicioescenarios.cancha.CanchaService;
import co.edu.usta.servicioescenarios.common.Errores;
import java.time.DayOfWeek;
import java.util.Comparator;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Horarios de operación de las canchas: consulta, alta, modificación y baja lógica. */
@Service
public class HorarioService {

  private static final Comparator<Horario> POR_DIA_Y_HORA =
      Comparator.comparing(Horario::getDiaSemana).thenComparing(Horario::getHoraApertura);

  private final HorarioRepository horarios;
  private final CanchaService canchas;

  public HorarioService(HorarioRepository horarios, CanchaService canchas) {
    this.horarios = horarios;
    this.canchas = canchas;
  }

  /** Horarios activos de la cancha, de lunes a domingo; 404 si la cancha no existe. */
  @Transactional(readOnly = true)
  public List<Horario> activosDeCancha(Long canchaId) {
    canchas.buscar(canchaId);
    return horarios.findByCanchaIdAndActivoTrue(canchaId).stream().sorted(POR_DIA_Y_HORA).toList();
  }

  /** Horarios activos de la cancha para un día de la semana, ordenados por hora de apertura. */
  @Transactional(readOnly = true)
  public List<Horario> delDia(Long canchaId, DayOfWeek dia) {
    return horarios.findByCanchaIdAndDiaSemanaAndActivoTrueOrderByHoraAperturaAsc(canchaId, dia);
  }

  @Transactional
  public Horario crear(HorarioRequest in) {
    return guardar(new Horario(), in);
  }

  @Transactional
  public Horario actualizar(Long id, HorarioRequest in) {
    return guardar(buscar(id), in);
  }

  /** Baja lógica: el horario deja de aplicar pero se conserva el registro. */
  @Transactional
  public void darDeBaja(Long id) {
    Horario h = buscar(id);
    h.setActivo(false);
    horarios.save(h);
  }

  private Horario buscar(Long id) {
    return horarios.findById(id).orElseThrow(() -> Errores.noEncontrado("Horario no existe"));
  }

  private Horario guardar(Horario h, HorarioRequest in) {
    if (!in.horaCierre().isAfter(in.horaApertura())) {
      throw Errores.solicitudInvalida("horaCierre debe ser mayor a horaApertura");
    }
    h.setCancha(canchas.buscar(in.canchaId()));
    h.setDiaSemana(in.diaSemana());
    h.setHoraApertura(in.horaApertura());
    h.setHoraCierre(in.horaCierre());
    h.setActivo(true);
    return horarios.save(h);
  }
}
