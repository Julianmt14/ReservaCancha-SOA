package co.edu.usta.reservacancha.reserva;

import co.edu.usta.reservacancha.user.Usuario;
import java.time.Instant;

/**
 * Usuario que viaja anidado en una reserva: los mismos campos públicos que antes se serializaban de
 * la entidad, nunca el hash de la contraseña (SEC-01).
 */
public record UsuarioResumen(
    Long id, String nombre, String email, String rol, Boolean activo, Instant creadoEn) {

  public static UsuarioResumen de(Usuario u) {
    return new UsuarioResumen(
        u.getId(), u.getNombre(), u.getEmail(), u.getRol().name(), u.isActivo(), u.getCreadoEn());
  }

  /** La reserva menciona un usuario que ya no está en esta aplicación. */
  public static UsuarioResumen desconocido(Long id) {
    return new UsuarioResumen(id, "Usuario " + id, null, null, null, null);
  }
}
