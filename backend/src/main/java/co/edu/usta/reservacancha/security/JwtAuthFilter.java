package co.edu.usta.reservacancha.security;

import co.edu.usta.reservacancha.user.UsuarioRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {

  private final JwtService jwt;
  private final UsuarioRepository usuarios;

  public JwtAuthFilter(JwtService jwt, UsuarioRepository usuarios) {
    this.jwt = jwt;
    this.usuarios = usuarios;
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest req, HttpServletResponse res, FilterChain chain)
      throws ServletException, IOException {
    String h = req.getHeader("Authorization");
    if (h != null && h.startsWith("Bearer ")) {
      String token = h.substring(7);
      try {
        String email = jwt.username(token);
        if (email != null && SecurityContextHolder.getContext().getAuthentication() == null) {
          UserDetailsService uds =
              username ->
                  usuarios
                      .findByEmail(username)
                      .orElseThrow(() -> new UsernameNotFoundException(username));
          UserDetails u = uds.loadUserByUsername(email);
          if (jwt.valid(token, u)) {
            SecurityContextHolder.getContext()
                .setAuthentication(
                    new UsernamePasswordAuthenticationToken(u, null, u.getAuthorities()));
          }
        }
      } catch (Exception ignored) {
        // Token inválido/ausente -> sigue sin autenticar (SEC-01: debe dar 401/403, nunca acceso)
      }
    }
    chain.doFilter(req, res);
  }
}
