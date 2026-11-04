package co.edu.usta.servicioescenarios.seguridad;

import co.edu.usta.servicioescenarios.common.Errores;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Set;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Las consultas (GET) son públicas. Crear, modificar o dar de baja canchas y horarios exige el JWT
 * que emite la aplicación consumidora (HS256, mismo secreto) con rol ADMIN o PROPIETARIO. Este
 * servicio no emite tokens: solo verifica la firma, la vigencia y el claim "rol".
 */
@Component
public class JwtFilter extends OncePerRequestFilter {

  private static final Set<String> ROLES_GESTION = Set.of("ROLE_ADMIN", "ROLE_PROPIETARIO");
  private static final Set<String> METODOS_LIBRES = Set.of("GET", "HEAD", "OPTIONS");

  private final SecretKey clave;
  private final ObjectMapper json;

  public JwtFilter(@Value("${app.jwt.secret}") String secreto, ObjectMapper json) {
    this.clave = Keys.hmacShaKeyFor(Decoders.BASE64.decode(secreto));
    this.json = json;
  }

  @Override
  protected boolean shouldNotFilter(HttpServletRequest req) {
    return !req.getRequestURI().startsWith("/api/") || METODOS_LIBRES.contains(req.getMethod());
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest req, HttpServletResponse res, FilterChain chain)
      throws ServletException, IOException {
    String cabecera = req.getHeader(HttpHeaders.AUTHORIZATION);
    if (cabecera == null || !cabecera.startsWith("Bearer ")) {
      responder(res, 401, "Falta el token de acceso (Authorization: Bearer)");
      return;
    }
    Claims claims;
    try {
      claims =
          Jwts.parser()
              .verifyWith(clave)
              .build()
              .parseSignedClaims(cabecera.substring(7).trim())
              .getPayload();
    } catch (JwtException | IllegalArgumentException e) {
      responder(res, 401, "Token inválido o vencido");
      return;
    }
    Object rol = claims.get("rol");
    if (rol == null || !ROLES_GESTION.contains(rol.toString())) {
      responder(res, 403, "Solo un administrador o propietario puede modificar canchas y horarios");
      return;
    }
    chain.doFilter(req, res);
  }

  private void responder(HttpServletResponse res, int status, String mensaje) throws IOException {
    res.setStatus(status);
    res.setContentType(MediaType.APPLICATION_JSON_VALUE);
    res.setCharacterEncoding(StandardCharsets.UTF_8.name());
    json.writeValue(res.getWriter(), Errores.cuerpo(status, mensaje));
  }
}
