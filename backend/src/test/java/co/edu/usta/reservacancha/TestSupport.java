package co.edu.usta.reservacancha;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

/** Utilidades compartidas por las pruebas de integracion. */
public final class TestSupport {

  public static final String CLAVE = "Clave-segura-1";

  private TestSupport() {}

  public static String correoUnico() {
    return "t" + UUID.randomUUID().toString().substring(0, 8) + "@prueba.test";
  }

  /** Registra un jugador nuevo y devuelve su token JWT. */
  public static String registrarJugador(MockMvc mvc, ObjectMapper json) throws Exception {
    String body =
        json.writeValueAsString(
            Map.of("nombre", "Jugador Prueba", "email", correoUnico(), "password", CLAVE));
    String res =
        mvc.perform(
                post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    return json.readTree(res).get("token").asText();
  }

  /** Inicia sesion con el administrador semilla y devuelve su token JWT. */
  public static String loginAdmin(MockMvc mvc, ObjectMapper json) throws Exception {
    String body =
        json.writeValueAsString(Map.of("email", "admin@reservacancha.co", "password", "admin123"));
    String res =
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    JsonNode n = json.readTree(res);
    return n.get("token").asText();
  }
}
