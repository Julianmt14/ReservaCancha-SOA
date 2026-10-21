package co.edu.usta.reservacancha.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

  private final SecretKey key;
  private final long expirationMs;

  public JwtService(
      @Value("${app.jwt.secret}") String secret,
      @Value("${app.jwt.expiration-ms}") long expirationMs) {
    this.key = Keys.hmacShaKeyFor(Decoders.BASE64.decode(secret));
    this.expirationMs = expirationMs;
  }

  public String generate(UserDetails user) {
    String rol =
        user.getAuthorities().stream().findFirst().map(Object::toString).orElse("ROLE_JUGADOR");
    return Jwts.builder()
        .subject(user.getUsername())
        .claim("rol", rol)
        .issuedAt(new Date())
        .expiration(new Date(System.currentTimeMillis() + expirationMs))
        .signWith(key)
        .compact();
  }

  public String username(String token) {
    return claims(token).getSubject();
  }

  public boolean valid(String token, UserDetails user) {
    return username(token).equals(user.getUsername())
        && claims(token).getExpiration().after(new Date());
  }

  private Claims claims(String token) {
    return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
  }
}
