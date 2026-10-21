package co.edu.usta.serviciopagos;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import co.edu.usta.serviciopagos.wompi.WompiClient;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

@SpringBootTest
@AutoConfigureMockMvc
class PagoControllerTest {

  /** Cada prueba paga una reserva distinta porque la base H2 se comparte entre pruebas. */
  private static final AtomicLong RESERVA = new AtomicLong(1000);

  @Autowired MockMvc mvc;
  @Autowired ObjectMapper json;
  @MockBean WompiClient wompi;

  @Value("${app.api-key}")
  String clave;

  private MockHttpServletRequestBuilder conClave(MockHttpServletRequestBuilder req) {
    return req.header("X-Api-Key", clave).contentType(MediaType.APPLICATION_JSON);
  }

  private ResultActions registrar(long reservaId, Object valor) throws Exception {
    return mvc.perform(
        conClave(post("/api/pagos"))
            .content(json.writeValueAsString(Map.of("reservaId", reservaId, "valor", valor))));
  }

  private JsonNode registrarOk(long reservaId, Object valor) throws Exception {
    return json.readTree(
        registrar(reservaId, valor)
            .andExpect(status().isCreated())
            .andReturn()
            .getResponse()
            .getContentAsString());
  }

  private void wompiDevuelve(String referencia, long centavos, String estado) {
    JsonNode tx =
        json.valueToTree(
            Map.of("reference", referencia, "amount_in_cents", centavos, "status", estado));
    when(wompi.consultarTransaccion(anyString())).thenReturn(tx);
  }

  @Test
  void sinClaveRespondeNoAutorizado() throws Exception {
    mvc.perform(
            post("/api/pagos")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"reservaId\":1,\"valor\":90000}"))
        .andExpect(status().isUnauthorized());
    mvc.perform(get("/api/pagos").header("X-Api-Key", "otra-clave"))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void elPingNoPideClave() throws Exception {
    mvc.perform(get("/api/pagos/ping")).andExpect(status().isOk());
  }

  @Test
  void registrarPagoDevuelve201ConLaFirmaDeIntegridad() throws Exception {
    long reserva = RESERVA.incrementAndGet();
    JsonNode intencion = registrarOk(reserva, 90000);

    assertThat(intencion.get("estado").asText()).isEqualTo("PENDIENTE");
    assertThat(intencion.get("valorCentavos").asLong()).isEqualTo(9_000_000L);
    assertThat(intencion.get("referencia").asText()).startsWith("RC-" + reserva + "-");
    assertThat(intencion.get("firmaIntegridad").asText()).hasSize(64);
  }

  @Test
  void unValorEnCeroSeRechazaCon400() throws Exception {
    registrar(RESERVA.incrementAndGet(), 0).andExpect(status().isBadRequest());
  }

  @Test
  void confirmarConWompiAprobadoDejaElPagoAprobado() throws Exception {
    long reserva = RESERVA.incrementAndGet();
    JsonNode intencion = registrarOk(reserva, 120000);
    wompiDevuelve(intencion.get("referencia").asText(), 12_000_000L, "APPROVED");

    String res =
        mvc.perform(
                conClave(post("/api/pagos/confirmaciones"))
                    .content(
                        json.writeValueAsString(
                            Map.of("reservaId", reserva, "transactionId", "tx-1"))))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    assertThat(json.readTree(res).get("estado").asText()).isEqualTo("APROBADO");
  }

  @Test
  void confirmarConUnMontoDistintoSeRechazaCon400() throws Exception {
    long reserva = RESERVA.incrementAndGet();
    JsonNode intencion = registrarOk(reserva, 120000);
    wompiDevuelve(intencion.get("referencia").asText(), 100L, "APPROVED");

    mvc.perform(
            conClave(post("/api/pagos/confirmaciones"))
                .content(
                    json.writeValueAsString(Map.of("reservaId", reserva, "transactionId", "tx-2"))))
        .andExpect(status().isBadRequest());
  }

  @Test
  void unaReservaYaPagadaNoRecibeOtroPago() throws Exception {
    long reserva = RESERVA.incrementAndGet();
    JsonNode intencion = registrarOk(reserva, 90000);
    mvc.perform(
            conClave(post("/api/pagos/notificaciones"))
                .content(
                    json.writeValueAsString(
                        Map.of(
                            "referencia",
                            intencion.get("referencia").asText(),
                            "transactionId",
                            "tx-3",
                            "status",
                            "APPROVED"))))
        .andExpect(status().isOk());

    registrar(reserva, 90000).andExpect(status().isConflict());
  }

  @Test
  void unAvisoDeUnPagoQueNoExisteResponde404() throws Exception {
    mvc.perform(
            conClave(post("/api/pagos/notificaciones"))
                .content("{\"referencia\":\"RC-no-existe\",\"status\":\"APPROVED\"}"))
        .andExpect(status().isNotFound());
  }
}
