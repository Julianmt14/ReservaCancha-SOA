package co.edu.usta.serviciopagos.pago;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

/**
 * Pago de una reserva. El servicio guarda solo el id de la reserva: la reserva pertenece a
 * ReservaCancha y este servicio no lee su base de datos.
 */
@Entity
@Table(name = "pagos")
public class Pago {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false)
  private Long reservaId;

  @Column(nullable = false)
  private BigDecimal valor;

  private String moneda = "COP";

  @Column(unique = true)
  private String referencia; // RC-<reserva>-<timestamp>, la misma que viaja a Wompi

  private String wompiTransactionId;

  @Enumerated(EnumType.STRING)
  private EstadoPago estado = EstadoPago.PENDIENTE;

  private Instant creadoEn = Instant.now();
  private Instant actualizadoEn = Instant.now();

  public Pago() {}

  public Long getId() {
    return id;
  }

  public Long getReservaId() {
    return reservaId;
  }

  public void setReservaId(Long reservaId) {
    this.reservaId = reservaId;
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
