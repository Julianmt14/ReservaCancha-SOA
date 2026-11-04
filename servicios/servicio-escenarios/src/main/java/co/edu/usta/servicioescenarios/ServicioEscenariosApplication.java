package co.edu.usta.servicioescenarios;

import java.time.Clock;
import java.time.ZoneId;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

/**
 * Proveedor 1 · Escenarios y horarios: fuente de verdad de canchas, horarios y reglas de reserva.
 */
@SpringBootApplication
public class ServicioEscenariosApplication {

  public static void main(String[] args) {
    SpringApplication.run(ServicioEscenariosApplication.class, args);
  }

  /** Reloj en la zona horaria de las canchas: decide si una franja ya pasó. */
  @Bean
  Clock reloj(@Value("${app.zona-horaria}") String zona) {
    return Clock.system(ZoneId.of(zona));
  }
}
