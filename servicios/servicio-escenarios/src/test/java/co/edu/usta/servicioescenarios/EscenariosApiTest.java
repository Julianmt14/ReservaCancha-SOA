package co.edu.usta.servicioescenarios;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasItems;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import co.edu.usta.servicioescenarios.horario.HorarioRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import java.time.LocalDate;
import java.util.Date;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

/**
 * Pruebas del contrato del Proveedor 1. La base H2 se comparte entre pruebas: las que escriben usan
 * canchas nuevas para no cambiar la semilla (canchas 1 a 6; la 1 y la 2 abren todos los días 06:00-22:00).
 */
@SpringBootTest
@AutoConfigureMockMvc
class EscenariosApiTest {

  /** Fecha futura calculada: las pruebas no dependen del día en que se ejecutan. */
  private static final String FECHA = LocalDate.now().plusDays(3).toString();

  @Autowired MockMvc mvc;
  @Autowired ObjectMapper json;
  @Autowired HorarioRepository horarios;

  @Value("${app.jwt.secret}")
  String secreto;

  // ---------- utilidades ----------

  /** Token como el que emite el backend: HS256, mismo secreto, claim "rol". */
  private String token(String rol, long vigenciaMs) {
    return Jwts.builder()
        .subject("prueba@usta.edu.co")
        .claim("rol", rol)
        .issuedAt(new Date())
        .expiration(new Date(System.currentTimeMillis() + vigenciaMs))
        .signWith(Keys.hmacShaKeyFor(Decoders.BASE64.decode(secreto)))
        .compact();
  }

  private String bearer(String rol) {
    return "Bearer " + token(rol, 60_000);
  }

  private ResultActions postCancha(String authorization, Map<String, Object> cuerpo)
      throws Exception {
    var req =
        post("/api/canchas")
            .contentType(MediaType.APPLICATION_JSON)
            .content(json.writeValueAsString(cuerpo));
    if (authorization != null) req.header("Authorization", authorization);
    return mvc.perform(req);
  }

  /** Crea una cancha nueva (sin horarios) como ADMIN y devuelve su id. */
  private long canchaNueva(String nombre, boolean activa) throws Exception {
    String body =
        postCancha(
                bearer("ROLE_ADMIN"),
                Map.of("nombre", nombre, "tipo", "Fútbol 5", "precioHora", 50000, "activa", activa))
            .andExpect(status().isCreated())
            .andReturn()
            .getResponse()
            .getContentAsString();
    return json.readTree(body).get("id").asLong();
  }

  private ResultActions cotizar(long canchaId, String fecha, String inicio, String fin)
      throws Exception {
    return mvc.perform(
        get("/api/canchas/{id}/cotizacion", canchaId)
            .param("fecha", fecha)
            .param("horaInicio", inicio)
            .param("horaFin", fin));
  }

  // ---------- consultas públicas ----------

  @Test
  void pingPublico() throws Exception {
    mvc.perform(get("/api/ping"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.servicio").value("servicio-escenarios"))
        .andExpect(jsonPath("$.estado").value("ok"));
  }

  @Test
  void listaLosEstablecimientosActivos() throws Exception {
    mvc.perform(get("/api/establecimientos"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].id").value(1))
        .andExpect(jsonPath("$[0].nombre").value("ReservaCancha Villavicencio"))
        .andExpect(jsonPath("$[0].ciudad").value("Villavicencio"));
  }

  @Test
  void listaLasCanchasConLaFormaDelContrato() throws Exception {
    String body =
        mvc.perform(get("/api/canchas"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[*].id", hasItems(1, 2, 3, 4, 5, 6)))
            .andExpect(jsonPath("$[*].activa", not(hasItem(false))))
            .andExpect(jsonPath("$[0].establecimientoId").value(1))
            .andExpect(jsonPath("$[0].nombre").value("Cancha 1 — Sintética F5"))
            .andExpect(jsonPath("$[0].deporte").value("FUTBOL"))
            .andExpect(jsonPath("$[0].tipo").value("Fútbol 5"))
            .andExpect(jsonPath("$[0].superficie").value("Sintética"))
            .andExpect(jsonPath("$[0].ubicacion").value("Villavicencio"))
            .andExpect(jsonPath("$[0].reglas.duracionMinimaMin").value(60))
            .andExpect(jsonPath("$[0].reglas.horasCancelacion").value(3))
            .andExpect(jsonPath("$[0].reglas.porcentajeAbono").value(50))
            .andReturn()
            .getResponse()
            .getContentAsString();
    assertThat(body).contains("\"precioHora\":60000.00");

    mvc.perform(get("/api/canchas").param("deporte", "futbol").param("establecimientoId", "1"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[*].id", hasItems(1, 2)));
    mvc.perform(get("/api/canchas").param("establecimientoId", "99"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$", hasSize(0)));
  }

  @Test
  void canchaInexistenteResponde404() throws Exception {
    mvc.perform(get("/api/canchas/9999"))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.status").value(404))
        .andExpect(jsonPath("$.error").value("Cancha no existe"))
        .andExpect(jsonPath("$.ts").exists());
    mvc.perform(get("/api/canchas/9999/horarios")).andExpect(status().isNotFound());
    cotizar(9999, FECHA, "21:00", "22:00").andExpect(status().isNotFound());
  }

  @Test
  void horariosActivosDeLaCancha() throws Exception {
    mvc.perform(get("/api/canchas/1/horarios"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].id").value(1))
        .andExpect(jsonPath("$[0].canchaId").value(1))
        .andExpect(jsonPath("$[0].diaSemana").value("MONDAY"))
        .andExpect(jsonPath("$[0].horaApertura").value("06:00:00"))
        .andExpect(jsonPath("$[0].horaCierre").value("22:00:00"))
        .andExpect(jsonPath("$[0].activo").value(true));
  }

  // ---------- franjas ----------

  @Test
  void franjasDeUnDiaConHorario() throws Exception {
    mvc.perform(get("/api/canchas/1/franjas").param("fecha", FECHA))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.canchaId").value(1))
        .andExpect(jsonPath("$.fecha").value(FECHA))
        .andExpect(jsonPath("$.abierta").value(true))
        .andExpect(jsonPath("$.franjas", hasSize(16)))
        .andExpect(jsonPath("$.franjas[0].inicio").value("06:00"))
        .andExpect(jsonPath("$.franjas[0].fin").value("07:00"))
        .andExpect(jsonPath("$.franjas[15].inicio").value("21:00"))
        .andExpect(jsonPath("$.franjas[15].fin").value("22:00"));
  }

  @Test
  void franjasDeUnDiaSinHorario() throws Exception {
    long id = canchaNueva("Cancha sin horario", true);
    mvc.perform(get("/api/canchas/{id}/franjas", id).param("fecha", FECHA))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.abierta").value(false))
        .andExpect(jsonPath("$.franjas", hasSize(0)));
  }

  // ---------- cotización ----------

  @Test
  void cotizacionValidaCalculaValorYAbono() throws Exception {
    String body =
        cotizar(1, FECHA, "21:00", "22:00")
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.canchaId").value(1))
            .andExpect(jsonPath("$.fecha").value(FECHA))
            .andExpect(jsonPath("$.horaInicio").value("21:00:00"))
            .andExpect(jsonPath("$.horaFin").value("22:00:00"))
            .andExpect(jsonPath("$.minutos").value(60))
            .andExpect(jsonPath("$.horasCancelacion").value(3))
            .andReturn()
            .getResponse()
            .getContentAsString();
    assertThat(body).contains("\"valorTotal\":60000.00").contains("\"valorAbono\":30000.00");

    // 90 minutos en la cancha 2 (90.000/h), horas con segundos: 135.000 y abono de 67.500
    String body2 =
        cotizar(2, FECHA, "20:30:00", "22:00:00")
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.minutos").value(90))
            .andReturn()
            .getResponse()
            .getContentAsString();
    assertThat(body2).contains("\"valorTotal\":135000.00").contains("\"valorAbono\":67500.00");
  }

  @Test
  void cotizacionFueraDeHorarioResponde400() throws Exception {
    cotizar(1, FECHA, "21:00", "23:00")
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.error").value("Fuera del horario de operación de la cancha"));
    long sinHorario = canchaNueva("Cancha cerrada", true);
    cotizar(sinHorario, FECHA, "10:00", "11:00")
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.error").value("Fuera del horario de operación de la cancha"));
  }

  @Test
  void horasQueNoSonEnPuntoNiYMediaResponden400() throws Exception {
    cotizar(1, FECHA, "21:15", "22:15")
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.error").value("Las horas deben ser en punto o y media"));
  }

  @Test
  void duracionMenorALaMinimaResponde400() throws Exception {
    cotizar(1, FECHA, "21:00", "21:30")
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.error").value("La reserva mínima es de 60 minutos"));
  }

  @Test
  void otrasReglasDeLaCotizacion() throws Exception {
    cotizar(1, FECHA, "22:00", "21:00")
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.error").value("horaFin debe ser mayor a horaInicio"));
    cotizar(1, LocalDate.now().minusDays(2).toString(), "10:00", "11:00")
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.error").value("No se puede reservar en un horario que ya pasó"));
    long inactiva = canchaNueva("Cancha inactiva", false);
    cotizar(inactiva, FECHA, "10:00", "11:00")
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.error").value("Cancha inactiva"));
    mvc.perform(get("/api/canchas/1/cotizacion").param("fecha", FECHA))
        .andExpect(status().isBadRequest());
  }

  // ---------- seguridad y escritura ----------

  @Test
  void crearCanchaExigeTokenDeAdministrador() throws Exception {
    Map<String, Object> cuerpoViejo =
        Map.of(
            "nombre", "Cancha 3 — Sintética F5",
            "tipo", "Fútbol 5",
            "superficie", "Sintética",
            "ubicacion", "Villavicencio",
            "precioHora", 70000,
            "activa", true);

    postCancha(null, cuerpoViejo)
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.status").value(401));
    postCancha("Bearer no-es-un-jwt", cuerpoViejo).andExpect(status().isUnauthorized());
    postCancha("Bearer " + token("ROLE_ADMIN", -60_000), cuerpoViejo)
        .andExpect(status().isUnauthorized());
    postCancha(bearer("ROLE_JUGADOR"), cuerpoViejo)
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.status").value(403));

    postCancha(bearer("ROLE_ADMIN"), cuerpoViejo)
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.id").isNumber())
        .andExpect(jsonPath("$.establecimientoId").value(1))
        .andExpect(jsonPath("$.deporte").value("FUTBOL"))
        .andExpect(jsonPath("$.precioHora").value(70000.0))
        .andExpect(jsonPath("$.activa").value(true))
        .andExpect(jsonPath("$.reglas.duracionMinimaMin").value(60))
        .andExpect(jsonPath("$.reglas.horasCancelacion").value(3))
        .andExpect(jsonPath("$.reglas.porcentajeAbono").value(50));

    postCancha(bearer("ROLE_PROPIETARIO"), Map.of("nombre", "Cancha prop", "precioHora", 1))
        .andExpect(status().isCreated());
    postCancha(bearer("ROLE_ADMIN"), Map.of("nombre", "Sin precio"))
        .andExpect(status().isBadRequest());
  }

  @Test
  void putConActivaFalseEsBajaLogicaDeLaCancha() throws Exception {
    long id = canchaNueva("Cancha para baja", true);
    mvc.perform(
            put("/api/canchas/{id}", id)
                .header("Authorization", bearer("ROLE_ADMIN"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    json.writeValueAsString(
                        Map.of(
                            "nombre", "Cancha para baja", "precioHora", 50000, "activa", false))))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.activa").value(false));
    mvc.perform(get("/api/canchas")).andExpect(jsonPath("$[*].id", not(hasItem((int) id))));
    mvc.perform(get("/api/canchas/{id}", id))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.activa").value(false));
    mvc.perform(
            put("/api/canchas/9999")
                .header("Authorization", bearer("ROLE_ADMIN"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"nombre\":\"x\",\"precioHora\":1}"))
        .andExpect(status().isNotFound());
  }

  @Test
  void deleteHorarioEsBajaLogica() throws Exception {
    long cancha = canchaNueva("Cancha con horario", true);
    String creado =
        mvc.perform(
                post("/api/horarios")
                    .header("Authorization", bearer("ROLE_ADMIN"))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        json.writeValueAsString(
                            Map.of(
                                "canchaId", cancha,
                                "diaSemana", "MONDAY",
                                "horaApertura", "08:00",
                                "horaCierre", "12:00"))))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.canchaId").value(cancha))
            .andExpect(jsonPath("$.horaApertura").value("08:00:00"))
            .andExpect(jsonPath("$.activo").value(true))
            .andReturn()
            .getResponse()
            .getContentAsString();
    JsonNode horario = json.readTree(creado);
    long id = horario.get("id").asLong();
    mvc.perform(get("/api/canchas/{id}/horarios", cancha)).andExpect(jsonPath("$", hasSize(1)));

    mvc.perform(delete("/api/horarios/{id}", id)).andExpect(status().isUnauthorized());
    mvc.perform(delete("/api/horarios/{id}", id).header("Authorization", bearer("ROLE_ADMIN")))
        .andExpect(status().isNoContent())
        .andExpect(content().string(""));

    mvc.perform(get("/api/canchas/{id}/horarios", cancha)).andExpect(jsonPath("$", hasSize(0)));
    assertThat(horarios.findById(id)).hasValueSatisfying(h -> assertThat(h.isActivo()).isFalse());
    mvc.perform(delete("/api/horarios/9999").header("Authorization", bearer("ROLE_ADMIN")))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.error").value("Horario no existe"));
  }

  @Test
  void validacionesDeHorario() throws Exception {
    mvc.perform(
            post("/api/horarios")
                .header("Authorization", bearer("ROLE_ADMIN"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"canchaId\":1,\"diaSemana\":\"MONDAY\",\"horaApertura\":\"22:00\",\"horaCierre\":\"06:00\"}"))
        .andExpect(status().isBadRequest());
    mvc.perform(
            post("/api/horarios")
                .header("Authorization", bearer("ROLE_ADMIN"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"canchaId\":9999,\"diaSemana\":\"MONDAY\",\"horaApertura\":\"06:00\",\"horaCierre\":\"07:00\"}"))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.error").value("Cancha no existe"));
    mvc.perform(
            put("/api/horarios/9999")
                .header("Authorization", bearer("ROLE_ADMIN"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"canchaId\":1,\"diaSemana\":\"MONDAY\",\"horaApertura\":\"06:00\",\"horaCierre\":\"07:00\"}"))
        .andExpect(status().isNotFound());
  }
}
