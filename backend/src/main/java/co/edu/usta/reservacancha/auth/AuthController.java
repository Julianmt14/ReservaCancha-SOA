package co.edu.usta.reservacancha.auth;

import co.edu.usta.reservacancha.security.JwtService;
import co.edu.usta.reservacancha.user.Role;
import co.edu.usta.reservacancha.user.Usuario;
import co.edu.usta.reservacancha.user.UsuarioRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

  private final UsuarioRepository usuarios;
  private final PasswordEncoder encoder;
  private final AuthenticationManager authManager;
  private final JwtService jwt;

  public AuthController(
      UsuarioRepository usuarios,
      PasswordEncoder encoder,
      AuthenticationManager authManager,
      JwtService jwt) {
    this.usuarios = usuarios;
    this.encoder = encoder;
    this.authManager = authManager;
    this.jwt = jwt;
  }

  @PostMapping("/register")
  public AuthResponse register(@Valid @RequestBody RegisterRequest r) {
    if (usuarios.existsByEmail(r.email()))
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Email ya registrado");
    Role rol = r.rol() == null ? Role.JUGADOR : r.rol();
    // El registro publico nunca crea administradores (SEC-01: escalada de privilegios)
    if (rol == Role.ADMIN)
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Rol no permitido en el registro");
    Usuario u = new Usuario(r.nombre(), r.email(), encoder.encode(r.password()), rol);
    usuarios.save(u);
    return respuesta(u);
  }

  @PostMapping("/login")
  public AuthResponse login(@Valid @RequestBody LoginRequest r) {
    authManager.authenticate(new UsernamePasswordAuthenticationToken(r.email(), r.password()));
    Usuario u = usuarios.findByEmail(r.email()).orElseThrow();
    return respuesta(u);
  }

  private AuthResponse respuesta(Usuario u) {
    return new AuthResponse(
        jwt.generate(u), u.getEmail(), u.getRol().name(), u.getId(), u.getNombre());
  }

  public record AuthResponse(String token, String email, String rol, Long id, String nombre) {}
}
