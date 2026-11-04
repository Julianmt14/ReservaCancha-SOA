package co.edu.usta.servicioescenarios.cancha;

import co.edu.usta.servicioescenarios.establecimiento.Establecimiento;
import jakarta.persistence.*;
import java.math.BigDecimal;

/** Cancha con sus reglas de reserva (duración mínima, cancelación y abono). */
@Entity
@Table(name = "canchas")
public class Cancha {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "establecimiento_id", nullable = false)
  private Establecimiento establecimiento;

  @Column(nullable = false, length = 120)
  private String nombre;

  @Column(nullable = false, length = 30)
  private String deporte; // ej: FUTBOL

  @Column(length = 60)
  private String tipo; // ej: Fútbol 5, Fútbol 8

  @Column(length = 60)
  private String superficie; // ej: Sintética

  @Column(length = 120)
  private String ubicacion;

  @Column(nullable = false, precision = 12, scale = 2)
  private BigDecimal precioHora;

  @Column(name = "duracion_minima_min", nullable = false)
  private int duracionMinimaMin;

  @Column(nullable = false)
  private int horasCancelacion;

  @Column(nullable = false)
  private int porcentajeAbono;

  @Column(nullable = false)
  private boolean activa = true;

  public Cancha() {}

  public Long getId() {
    return id;
  }

  public Establecimiento getEstablecimiento() {
    return establecimiento;
  }

  public void setEstablecimiento(Establecimiento establecimiento) {
    this.establecimiento = establecimiento;
  }

  public String getNombre() {
    return nombre;
  }

  public void setNombre(String nombre) {
    this.nombre = nombre;
  }

  public String getDeporte() {
    return deporte;
  }

  public void setDeporte(String deporte) {
    this.deporte = deporte;
  }

  public String getTipo() {
    return tipo;
  }

  public void setTipo(String tipo) {
    this.tipo = tipo;
  }

  public String getSuperficie() {
    return superficie;
  }

  public void setSuperficie(String superficie) {
    this.superficie = superficie;
  }

  public String getUbicacion() {
    return ubicacion;
  }

  public void setUbicacion(String ubicacion) {
    this.ubicacion = ubicacion;
  }

  public BigDecimal getPrecioHora() {
    return precioHora;
  }

  public void setPrecioHora(BigDecimal precioHora) {
    this.precioHora = precioHora;
  }

  public int getDuracionMinimaMin() {
    return duracionMinimaMin;
  }

  public void setDuracionMinimaMin(int duracionMinimaMin) {
    this.duracionMinimaMin = duracionMinimaMin;
  }

  public int getHorasCancelacion() {
    return horasCancelacion;
  }

  public void setHorasCancelacion(int horasCancelacion) {
    this.horasCancelacion = horasCancelacion;
  }

  public int getPorcentajeAbono() {
    return porcentajeAbono;
  }

  public void setPorcentajeAbono(int porcentajeAbono) {
    this.porcentajeAbono = porcentajeAbono;
  }

  public boolean isActiva() {
    return activa;
  }

  public void setActiva(boolean activa) {
    this.activa = activa;
  }
}
