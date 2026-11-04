package co.edu.usta.servicioescenarios.horario;

import co.edu.usta.servicioescenarios.cancha.Cancha;
import jakarta.persistence.*;
import java.time.DayOfWeek;
import java.time.LocalTime;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** Horario de operación de una cancha para un día de la semana. */
@Entity
@Table(name = "horarios")
public class Horario {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "cancha_id", nullable = false)
  private Cancha cancha;

  @Enumerated(EnumType.STRING)
  @JdbcTypeCode(SqlTypes.VARCHAR) // en schema.sql es VARCHAR(10) con CHECK, no un tipo ENUM
  @Column(nullable = false, length = 10)
  private DayOfWeek diaSemana;

  @Column(nullable = false)
  private LocalTime horaApertura;

  @Column(nullable = false)
  private LocalTime horaCierre;

  @Column(nullable = false)
  private boolean activo = true;

  public Horario() {}

  public Long getId() {
    return id;
  }

  public Cancha getCancha() {
    return cancha;
  }

  public void setCancha(Cancha cancha) {
    this.cancha = cancha;
  }

  public DayOfWeek getDiaSemana() {
    return diaSemana;
  }

  public void setDiaSemana(DayOfWeek diaSemana) {
    this.diaSemana = diaSemana;
  }

  public LocalTime getHoraApertura() {
    return horaApertura;
  }

  public void setHoraApertura(LocalTime horaApertura) {
    this.horaApertura = horaApertura;
  }

  public LocalTime getHoraCierre() {
    return horaCierre;
  }

  public void setHoraCierre(LocalTime horaCierre) {
    this.horaCierre = horaCierre;
  }

  public boolean isActivo() {
    return activo;
  }

  public void setActivo(boolean activo) {
    this.activo = activo;
  }

  /** true si el rango [inicio, fin] cabe completo dentro de este horario. */
  public boolean contiene(LocalTime inicio, LocalTime fin) {
    return !inicio.isBefore(horaApertura) && !fin.isAfter(horaCierre);
  }
}
