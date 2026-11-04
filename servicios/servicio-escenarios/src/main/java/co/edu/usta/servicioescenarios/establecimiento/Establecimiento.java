package co.edu.usta.servicioescenarios.establecimiento;

import jakarta.persistence.*;

/** Sede que agrupa canchas (en la semilla, un establecimiento simulado en Villavicencio). */
@Entity
@Table(name = "establecimientos")
public class Establecimiento {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, length = 120)
  private String nombre;

  @Column(length = 200)
  private String direccion;

  @Column(nullable = false, length = 80)
  private String ciudad;

  @Column(length = 30)
  private String telefono;

  @Column(nullable = false)
  private boolean activo = true;

  public Establecimiento() {}

  public Long getId() {
    return id;
  }

  public String getNombre() {
    return nombre;
  }

  public String getDireccion() {
    return direccion;
  }

  public String getCiudad() {
    return ciudad;
  }

  public String getTelefono() {
    return telefono;
  }

  public boolean isActivo() {
    return activo;
  }
}
