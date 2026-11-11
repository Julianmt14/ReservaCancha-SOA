package co.edu.usta.reservacancha.admin;

import co.edu.usta.reservacancha.reserva.UsuarioResumen;
import co.edu.usta.reservacancha.user.Role;
import co.edu.usta.reservacancha.user.Usuario;
import co.edu.usta.reservacancha.user.UsuarioRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.Comparator;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

/**
 * Cuentas del personal de la cancha. Nadie se registra solo como personal: el administrador crea a
 * los empleados y los puede desactivar (una cuenta inactiva ya no inicia sesión ni usa su token).
 */
@RestController
@RequestMapping("/api/admin/empleados")
@PreAuthorize("hasAnyRole('ADMIN','PROPIETARIO')")
public class PersonalController {

  private static final List<Role> PERSONAL = List.of(Role.ADMIN, Role.PROPIETARIO, Role.EMPLEADO);

  private final UsuarioRepository usuarios;
  private final PasswordEncoder encoder;

  public PersonalController(UsuarioRepository usuarios, PasswordEncoder encoder) {
    this.usuarios = usuarios;
    this.encoder = encoder;
  }

  @GetMapping
  public List<UsuarioResumen> lista() {
    return usuarios.findByRolIn(PERSONAL).stream()
        .sorted(Comparator.comparing(Usuario::getId))
        .map(UsuarioResumen::de)
        .toList();
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public UsuarioResumen crear(@Valid @RequestBody NuevoEmpleado req) {
    String email = req.email().trim().toLowerCase();
    if (usuarios.existsByEmail(email)) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Email ya registrado");
    }
    Usuario u =
        new Usuario(req.nombre().trim(), email, encoder.encode(req.password()), Role.EMPLEADO);
    return UsuarioResumen.de(usuarios.save(u));
  }

  /** Activa o desactiva a un empleado. Las cuentas de administrador no se tocan desde aquí. */
  @PatchMapping("/{id}")
  public UsuarioResumen activar(@PathVariable Long id, @Valid @RequestBody CambioActivo req) {
    Usuario u =
        usuarios
            .findById(id)
            .orElseThrow(
                () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Empleado no encontrado"));
    if (u.getRol() != Role.EMPLEADO) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Solo se pueden activar o desactivar empleados");
    }
    u.setActivo(req.activo());
    return UsuarioResumen.de(usuarios.save(u));
  }

  public record NuevoEmpleado(
      @NotBlank @Size(max = 60) String nombre,
      @NotBlank @Email String email,
      @NotBlank @Size(min = 8, max = 72) String password) {}

  public record CambioActivo(@NotNull Boolean activo) {}
}
