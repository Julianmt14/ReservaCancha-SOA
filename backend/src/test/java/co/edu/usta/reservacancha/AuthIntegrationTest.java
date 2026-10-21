package co.edu.usta.reservacancha;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class AuthIntegrationTest {

  @Autowired MockMvc mvc;
  @Autowired ObjectMapper json;

  private String registro(Map<String, ?> datos) throws Exception {
    return mvc.perform(
            post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(datos)))
        .andReturn()
        .getResponse()
        .getContentAsString();
  }

  @Test
  void registroCreaJugadorYEntregaToken() throws Exception {
    String res =
        registro(
            Map.of(
                "nombre",
                "Ana",
                "email",
                TestSupport.correoUnico(),
                "password",
                TestSupport.CLAVE));
    assertThat(json.readTree(res).get("rol").asText()).isEqualTo("JUGADOR");
    assertThat(json.readTree(res).get("token").asText()).isNotBlank();
  }

  @Test
  void registroPublicoNoPuedeCrearAdministradores() throws Exception {
    mvc.perform(
            post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    json.writeValueAsString(
                        Map.of(
                            "nombre",
                            "Intruso",
                            "email",
                            TestSupport.correoUnico(),
                            "password",
                            TestSupport.CLAVE,
                            "rol",
                            "ADMIN"))))
        .andExpect(status().isForbidden());
  }

  @Test
  void registroRechazaContrasenasCortas() throws Exception {
    mvc.perform(
            post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    json.writeValueAsString(
                        Map.of(
                            "nombre",
                            "Ana",
                            "email",
                            TestSupport.correoUnico(),
                            "password",
                            "corta"))))
        .andExpect(status().isBadRequest());
  }

  @Test
  void registroRechazaCorreoRepetido() throws Exception {
    String correo = TestSupport.correoUnico();
    Map<String, String> datos =
        Map.of("nombre", "Ana", "email", correo, "password", TestSupport.CLAVE);
    mvc.perform(
            post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(datos)))
        .andExpect(status().isOk());
    mvc.perform(
            post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(datos)))
        .andExpect(status().isConflict());
  }

  @Test
  void loginRespondeUnauthorizedConClaveIncorrecta() throws Exception {
    mvc.perform(
            post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    json.writeValueAsString(
                        Map.of("email", "admin@reservacancha.co", "password", "clave-equivocada"))))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void adminSemillaPuedeIniciarSesionYConsultarElResumen() throws Exception {
    String token = TestSupport.loginAdmin(mvc, json);
    mvc.perform(get("/api/admin/resumen").header("Authorization", "Bearer " + token))
        .andExpect(status().isOk());
  }

  @Test
  void jugadorNoAccedeALasRutasDeAdministracion() throws Exception {
    String token = TestSupport.registrarJugador(mvc, json);
    mvc.perform(get("/api/admin/resumen").header("Authorization", "Bearer " + token))
        .andExpect(status().isForbidden());
  }
}
