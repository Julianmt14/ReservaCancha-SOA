package co.edu.usta.reservacancha;

import co.edu.usta.reservacancha.cancha.Cancha;
import co.edu.usta.reservacancha.cancha.CanchaRepository;
import co.edu.usta.reservacancha.user.Role;
import co.edu.usta.reservacancha.user.Usuario;
import co.edu.usta.reservacancha.user.UsuarioRepository;
import java.math.BigDecimal;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class SeedData {

  @Bean
  CommandLineRunner seed(
      UsuarioRepository usuarios, CanchaRepository canchas, PasswordEncoder enc) {
    return args -> {
      if (!usuarios.existsByEmail("admin@reservacancha.co")) {
        usuarios.save(
            new Usuario(
                "Administrador", "admin@reservacancha.co", enc.encode("admin123"), Role.ADMIN));
      }
      if (canchas.count() == 0) {
        Cancha c1 = new Cancha();
        c1.setNombre("Cancha 1 — Sintética F5");
        c1.setTipo("Fútbol 5");
        c1.setSuperficie("Sintética");
        c1.setUbicacion("Villavicencio");
        c1.setPrecioHora(new BigDecimal("60000"));
        canchas.save(c1);

        Cancha c2 = new Cancha();
        c2.setNombre("Cancha 2 — Sintética F8");
        c2.setTipo("Fútbol 8");
        c2.setSuperficie("Sintética");
        c2.setUbicacion("Villavicencio");
        c2.setPrecioHora(new BigDecimal("90000"));
        canchas.save(c2);
      }
    };
  }
}
