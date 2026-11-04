package co.edu.usta.servicioreservas.reserva;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalTime;

/**
 * Un bloque de 30 minutos ocupado por una reserva activa. La tabla tiene UNIQUE (cancha_id, fecha,
 * hora_inicio): la base de datos no deja que dos reservas ocupen el mismo bloque de la misma
 * cancha.
 */
@Entity
@Table(name = "bloques_reservados")
public class BloqueReservado {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "reserva_id", nullable = false)
  private Reserva reserva;

  @Column(nullable = false)
  private Long canchaId;

  @Column(nullable = false)
  private LocalDate fecha;

  @Column(nullable = false)
  private LocalTime horaInicio;

  protected BloqueReservado() {}

  public BloqueReservado(Reserva reserva, LocalTime horaInicio) {
    this.reserva = reserva;
    this.canchaId = reserva.getCanchaId();
    this.fecha = reserva.getFecha();
    this.horaInicio = horaInicio;
  }

  public Long getId() {
    return id;
  }

  public Reserva getReserva() {
    return reserva;
  }

  public Long getCanchaId() {
    return canchaId;
  }

  public LocalDate getFecha() {
    return fecha;
  }

  public LocalTime getHoraInicio() {
    return horaInicio;
  }
}
