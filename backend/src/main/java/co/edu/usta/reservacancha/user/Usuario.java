package co.edu.usta.reservacancha.user;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

// Usuario viaja anidado en Reserva/Pago: nunca se serializan el hash ni los datos de UserDetails
// (SEC-01).
@JsonIgnoreProperties({
  "password",
  "authorities",
  "username",
  "accountNonExpired",
  "accountNonLocked",
  "credentialsNonExpired",
  "enabled"
})
@Entity
@Table(name = "usuarios", uniqueConstraints = @UniqueConstraint(columnNames = "email"))
public class Usuario implements UserDetails {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @NotBlank private String nombre;

  @Email
  @NotBlank
  @Column(nullable = false, unique = true)
  private String email;

  @Column(nullable = false)
  private String password;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private Role rol = Role.JUGADOR;

  private boolean activo = true;
  private Instant creadoEn = Instant.now();

  public Usuario() {}

  public Usuario(String nombre, String email, String password, Role rol) {
    this.nombre = nombre;
    this.email = email;
    this.password = password;
    this.rol = rol;
  }

  // --- UserDetails (SEC-01: 0 accesos no autorizados; todo recurso protegido exige rol) ---
  @Override
  public Collection<? extends GrantedAuthority> getAuthorities() {
    return List.of(new SimpleGrantedAuthority("ROLE_" + rol.name()));
  }

  @Override
  public String getPassword() {
    return password;
  }

  @Override
  public String getUsername() {
    return email;
  }

  @Override
  public boolean isAccountNonExpired() {
    return true;
  }

  @Override
  public boolean isAccountNonLocked() {
    return true;
  }

  @Override
  public boolean isCredentialsNonExpired() {
    return true;
  }

  @Override
  public boolean isEnabled() {
    return activo;
  }

  public Long getId() {
    return id;
  }

  public String getNombre() {
    return nombre;
  }

  public void setNombre(String nombre) {
    this.nombre = nombre;
  }

  public String getEmail() {
    return email;
  }

  public void setEmail(String email) {
    this.email = email;
  }

  public void setPassword(String password) {
    this.password = password;
  }

  public Role getRol() {
    return rol;
  }

  public void setRol(Role rol) {
    this.rol = rol;
  }

  public boolean isActivo() {
    return activo;
  }

  public void setActivo(boolean activo) {
    this.activo = activo;
  }

  public Instant getCreadoEn() {
    return creadoEn;
  }
}
