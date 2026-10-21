package co.edu.usta.reservacancha.security;

import co.edu.usta.reservacancha.user.UsuarioRepository;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

  private final JwtAuthFilter jwtFilter;

  public SecurityConfig(JwtAuthFilter jwtFilter) {
    this.jwtFilter = jwtFilter;
  }

  @Bean
  SecurityFilterChain chain(HttpSecurity http) throws Exception {
    return http.csrf(csrf -> csrf.disable())
        .cors(Customizer.withDefaults())
        .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(
            a ->
                a.requestMatchers("/api/auth/**", "/api/wompi/webhook", "/error")
                    .permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/canchas/**", "/api/disponibilidad/**")
                    .permitAll()
                    .requestMatchers("/api/admin/**")
                    .hasAnyRole("ADMIN", "PROPIETARIO")
                    .anyRequest()
                    .authenticated())
        .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
        .build();
  }

  /** Origenes del frontend permitidos (separados por coma). Por defecto, Next.js en desarrollo. */
  @Bean
  CorsConfigurationSource corsConfigurationSource(
      @Value("${app.cors.origins:http://localhost:3000}") List<String> origins) {
    CorsConfiguration cfg = new CorsConfiguration();
    cfg.setAllowedOrigins(origins);
    cfg.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
    cfg.setAllowedHeaders(List.of("Authorization", "Content-Type"));
    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/api/**", cfg);
    return source;
  }

  @Bean
  PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
  }

  /**
   * Gestor de autenticacion propio: pedirselo a AuthenticationConfiguration cuando ya existe un
   * bean AuthenticationManager lo hace delegar en si mismo y desborda la pila al iniciar sesion.
   */
  @Bean
  AuthenticationManager authenticationManager(UsuarioRepository usuarios, PasswordEncoder encoder) {
    DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
    provider.setUserDetailsService(
        email ->
            usuarios.findByEmail(email).orElseThrow(() -> new UsernameNotFoundException(email)));
    provider.setPasswordEncoder(encoder);
    return new ProviderManager(provider);
  }
}
