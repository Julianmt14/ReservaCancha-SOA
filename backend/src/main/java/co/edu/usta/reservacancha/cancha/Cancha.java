package co.edu.usta.reservacancha.cancha;

import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;

@Entity
@Table(name = "canchas")
public class Cancha {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @NotBlank
  @Column(nullable = false)
  private String nombre;

  private String tipo; // ej: Fútbol 5, Fútbol 8, Voleibol
  private String superficie; // ej: Sintética
  private String ubicacion;

  @Min(0)
  private BigDecimal precioHora;

  private boolean activa = true;

  public Cancha() {}

  public Long getId() {
    return id;
  }

  public String getNombre() {
    return nombre;
  }

  public void setNombre(String nombre) {
    this.nombre = nombre;
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

  public boolean isActiva() {
    return activa;
  }

  public void setActiva(boolean activa) {
    this.activa = activa;
  }
}
