package co.edu.usta.reservacancha;

import co.edu.usta.reservacancha.user.Role;
import co.edu.usta.reservacancha.user.Usuario;
import co.edu.usta.reservacancha.user.UsuarioRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Usuarios de arranque. Las canchas y sus horarios ya no se siembran aquí: son de
 * servicio-escenarios, que los carga en su propio data.sql.
 */
@Configuration
public class SeedData {

  @Bean
  CommandLineRunner seed(UsuarioRepository usuarios, PasswordEncoder enc) {
    return args -> {
      if (!usuarios.existsByEmail("admin@reservacancha.co")) {
        usuarios.save(
            new Usuario(
                "Administrador", "admin@reservacancha.co", enc.encode("admin123"), Role.ADMIN));
      }
      // Jugador de demostración para las pruebas de Postman
      if (!usuarios.existsByEmail("jugador@reservacancha.co")) {
        usuarios.save(
            new Usuario(
                "Jugador Demo",
                "jugador@reservacancha.co",
                enc.encode("jugador123"),
                Role.JUGADOR));
      }
    };
  }
}
