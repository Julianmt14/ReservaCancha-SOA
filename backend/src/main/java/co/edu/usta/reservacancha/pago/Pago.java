package co.edu.usta.reservacancha.pago;

import co.edu.usta.reservacancha.reserva.Reserva;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "pagos")
public class Pago {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(optional = false)
  private Reserva reserva;

  @Column(nullable = false)
  private BigDecimal valor;

  private String moneda = "COP";
  private String referencia; // referencia interna (reserva-N-timestamp)
  private String wompiTransactionId;

  @Enumerated(EnumType.STRING)
  private EstadoPago estado = EstadoPago.PENDIENTE;

  private Instant creadoEn = Instant.now();
  private Instant actualizadoEn = Instant.now();

  public Pago() {}

  public Long getId() {
    return id;
  }

  public Reserva getReserva() {
    return reserva;
  }

  public void setReserva(Reserva reserva) {
    this.reserva = reserva;
  }

  public BigDecimal getValor() {
    return valor;
  }

  public void setValor(BigDecimal valor) {
    this.valor = valor;
  }

  public String getMoneda() {
    return moneda;
  }

  public void setMoneda(String moneda) {
    this.moneda = moneda;
  }

  public String getReferencia() {
    return referencia;
  }

  public void setReferencia(String referencia) {
    this.referencia = referencia;
  }

  public String getWompiTransactionId() {
    return wompiTransactionId;
  }

  public void setWompiTransactionId(String id) {
    this.wompiTransactionId = id;
  }

  public EstadoPago getEstado() {
    return estado;
  }

  public void setEstado(EstadoPago estado) {
    this.estado = estado;
    this.actualizadoEn = Instant.now();
  }

  public Instant getCreadoEn() {
    return creadoEn;
  }

  public Instant getActualizadoEn() {
    return actualizadoEn;
  }
}
