package co.edu.usta.serviciopagos.seguridad;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Solo la aplicación consumidora (el backend de ReservaCancha) puede usar el servicio: cada
 * solicitud a /api/pagos trae la clave compartida en X-Api-Key. El ping queda abierto.
 */
@Component
public class ApiKeyFilter extends OncePerRequestFilter {

  private final byte[] clave;
  private final ObjectMapper json;

  public ApiKeyFilter(@Value("${app.api-key}") String clave, ObjectMapper json) {
    this.clave = clave.getBytes(StandardCharsets.UTF_8);
    this.json = json;
  }

  @Override
  protected boolean shouldNotFilter(HttpServletRequest req) {
    String ruta = req.getRequestURI();
    return !ruta.startsWith("/api/pagos") || ruta.equals("/api/pagos/ping");
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest req, HttpServletResponse res, FilterChain chain)
      throws ServletException, IOException {
    String enviada = req.getHeader("X-Api-Key");
    if (enviada == null
        || !MessageDigest.isEqual(enviada.getBytes(StandardCharsets.UTF_8), clave)) {
      res.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
      res.setContentType(MediaType.APPLICATION_JSON_VALUE);
      res.setCharacterEncoding(StandardCharsets.UTF_8.name());
      json.writeValue(
          res.getWriter(),
          Map.of(
              "error",
              "Aplicación no autorizada para usar el servicio de pagos",
              "status",
              401,
              "ts",
              Instant.now().toString()));
      return;
    }
    chain.doFilter(req, res);
  }
}
