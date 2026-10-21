package co.edu.usta.reservacancha.horario;

import co.edu.usta.reservacancha.cancha.Cancha;
import jakarta.persistence.*;
import java.time.DayOfWeek;
import java.time.LocalTime;

@Entity
@Table(name = "horarios")
public class Horario {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(optional = false)
  private Cancha cancha;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private DayOfWeek diaSemana;

  @Column(nullable = false)
  private LocalTime horaApertura;

  @Column(nullable = false)
  private LocalTime horaCierre;

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
}
