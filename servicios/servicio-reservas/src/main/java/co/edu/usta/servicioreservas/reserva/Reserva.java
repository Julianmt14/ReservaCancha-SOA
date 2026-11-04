package co.edu.usta.servicioreservas.reserva;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;

/**
 * Reserva de una cancha. Guarda solo los ids del usuario y de la cancha: el usuario pertenece a la
 * consumidora y la cancha al Proveedor 1; este servicio no lee sus bases de datos.
 */
@Entity
@Table(name = "reservas")
public class Reserva {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false)
  private Long usuarioId;

  @Column(nullable = false)
  private Long canchaId;

  @Column(nullable = false)
  private LocalDate fecha;

  @Column(nullable = false)
  private LocalTime horaInicio;

  @Column(nullable = false)
  private LocalTime horaFin;

  @Column(nullable = false, precision = 12, scale = 2)
  private BigDecimal valorTotal;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private EstadoReserva estado = EstadoReserva.PENDIENTE;

  @Column(nullable = false)
  private Instant creadoEn = ahora();

  @Column(nullable = false)
  private Instant actualizadoEn = creadoEn;

  public Reserva() {}

  /** Microsegundos: la misma precisión con la que la base de datos guarda la fecha. */
  private static Instant ahora() {
    return Instant.now().truncatedTo(ChronoUnit.MICROS);
  }

  public Long getId() {
    return id;
  }

  public Long getUsuarioId() {
    return usuarioId;
  }

  public void setUsuarioId(Long usuarioId) {
    this.usuarioId = usuarioId;
  }

  public Long getCanchaId() {
    return canchaId;
  }

  public void setCanchaId(Long canchaId) {
    this.canchaId = canchaId;
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
    this.actualizadoEn = ahora();
  }

  public Instant getCreadoEn() {
    return creadoEn;
  }

  public Instant getActualizadoEn() {
    return actualizadoEn;
  }
}
