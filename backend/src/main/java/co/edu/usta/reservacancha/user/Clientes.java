package co.edu.usta.reservacancha.user;

import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

/**
 * Jugadores que reservan sin crear cuenta: se identifican con su nombre y su celular. La consumidora
 * les guarda un usuario interno (el proveedor 2 necesita un usuarioId) con un correo que sale del
 * celular y una contraseña al azar que nadie usa: entran con el token que reciben al reservar.
 */
@Service
public class Clientes {

  static final String DOMINIO = "@celular.reservacancha.co";

  private final UsuarioRepository usuarios;
  private final PasswordEncoder encoder;

  public Clientes(UsuarioRepository usuarios, PasswordEncoder encoder) {
    this.usuarios = usuarios;
    this.encoder = encoder;
  }

  /** El jugador de ese celular; si es la primera vez, se crea. El nombre queda el último que dio. */
  public Usuario porCelular(String nombre, String celular) {
    String email = celular + DOMINIO;
    Usuario u = usuarios.findByEmail(email).orElseGet(() -> nuevo(nombre, email));
    u.setNombre(nombre.trim());
    u.setCelular(celular);
    try {
      return usuarios.save(u);
    } catch (DataIntegrityViolationException e) {
      // Dos reservas del mismo celular al mismo tiempo: la otra ya lo creó
      return usuarios.findByEmail(email).orElseThrow(() -> e);
    }
  }

  private Usuario nuevo(String nombre, String email) {
    return new Usuario(
        nombre.trim(), email, encoder.encode(UUID.randomUUID().toString()), Role.JUGADOR);
  }
}
