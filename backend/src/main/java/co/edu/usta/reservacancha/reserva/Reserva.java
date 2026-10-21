package co.edu.usta.reservacancha.reserva;

import co.edu.usta.reservacancha.cancha.Cancha;
import co.edu.usta.reservacancha.user.Usuario;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Table(
    name = "reservas",
    indexes = {
      @Index(columnList = "cancha_id, fecha, horaInicio, horaFin"),
      @Index(columnList = "usuario_id")
    })
public class Reserva {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(optional = false)
  private Usuario usuario;

  @ManyToOne(optional = false)
  private Cancha cancha;

  @Column(nullable = false)
  private LocalDate fecha;

  @Column(nullable = false)
  private LocalTime horaInicio;

  @Column(nullable = false)
  private LocalTime horaFin;

  @Column(nullable = false)
  private BigDecimal valorTotal;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private EstadoReserva estado = EstadoReserva.PENDIENTE;

  private Instant creadoEn = Instant.now();

  public Reserva() {}

  public Long getId() {
    return id;
  }

  public Usuario getUsuario() {
    return usuario;
  }

  public void setUsuario(Usuario usuario) {
    this.usuario = usuario;
  }

  public Cancha getCancha() {
    return cancha;
  }

  public void setCancha(Cancha cancha) {
    this.cancha = cancha;
  }

  public LocalDate getFecha() {
    return fecha;
  }

  public void setFecha(LocalDate fecha) {
    this.fecha = fecha;
  }

  public LocalTime getHoraInicio() {
    return horaInicio;
  }

  public void setHoraInicio(LocalTime horaInicio) {
    this.horaInicio = horaInicio;
  }

  public LocalTime getHoraFin() {
    return horaFin;
  }

  public void setHoraFin(LocalTime horaFin) {
    this.horaFin = horaFin;
  }

  public BigDecimal getValorTotal() {
    return valorTotal;
  }

  public void setValorTotal(BigDecimal valorTotal) {
    this.valorTotal = valorTotal;
  }

  public EstadoReserva getEstado() {
    return estado;
  }

  public void setEstado(EstadoReserva estado) {
    this.estado = estado;
  }

  public Instant getCreadoEn() {
    return creadoEn;
  }
}
