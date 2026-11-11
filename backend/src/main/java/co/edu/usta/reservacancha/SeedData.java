package co.edu.usta.reservacancha;

import co.edu.usta.reservacancha.user.Role;
import co.edu.usta.reservacancha.user.Usuario;
import co.edu.usta.reservacancha.user.UsuarioRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Usuarios de arranque. Las canchas y sus horarios ya no se siembran aquí: son de
 * servicio-escenarios, que los carga en su propio data.sql.
 */
@Configuration
public class SeedData {

  private static final Logger log = LoggerFactory.getLogger(SeedData.class);

  @Bean
  CommandLineRunner seed(UsuarioRepository usuarios, PasswordEncoder enc, JdbcTemplate jdbc) {
    return args -> {
      permitirRolesNuevos(jdbc);
      if (!usuarios.existsByEmail("admin@reservacancha.co")) {
        usuarios.save(
            new Usuario(
                "Administrador", "admin@reservacancha.co", enc.encode("admin123"), Role.ADMIN));
      }
      // Empleado de demostración: ve la agenda, reserva por teléfono y cancela
      if (!usuarios.existsByEmail("empleado@reservacancha.co")) {
        usuarios.save(
            new Usuario(
                "Empleado Demo",
                "empleado@reservacancha.co",
                enc.encode("empleado123"),
                Role.EMPLEADO));
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

  /**
   * Una base creada antes de existir el rol EMPLEADO guarda «rol» como un ENUM (H2) o con un CHECK
   * (Postgres) que no lo acepta, y ddl-auto=update no lo cambia. Se deja como texto; en una base
   * nueva no hace nada.
   */
  private static void permitirRolesNuevos(JdbcTemplate jdbc) {
    for (String sql :
        new String[] {
          "ALTER TABLE usuarios ALTER COLUMN rol SET DATA TYPE VARCHAR(20)",
          "ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_check"
        }) {
      try {
        jdbc.execute(sql);
      } catch (RuntimeException e) {
        log.debug("Sin cambio en la columna rol: {}", e.getMessage());
      }
    }
  }
}
