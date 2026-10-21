# ReservaCancha - Backend

API REST en **Spring Boot 3.3** con **Java 21**, JPA y Spring Security (JWT). Puerto 8080. Los pagos los
resuelve [servicio-pagos](../servicios/README.md) (puerto 8085), que es otra aplicación.

## Arranque

```bash
mvn spring-boot:run          # H2 en memoria por defecto
```

Con Postgres: levantar `docker compose up -d db` en la raíz y definir `SPRING_DATASOURCE_URL`,
`SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD` y `SPRING_DATASOURCE_DRIVER`.

## Pruebas

```bash
mvn test
```

Pruebas de integración con MockMvc y H2 (`src/test`):

| Clase | Qué verifica |
|---|---|
| `AuthIntegrationTest` | registro (sin rol `ADMIN`, contraseña de 8 a 72 caracteres, correo repetido), login 401, acceso por rol |
| `ReservaIntegrationTest` | valor calculado, traslapes (409), fechas pasadas (400), cancelación por dueño, pagos ajenos (403, sin llegar a servicio-pagos), webhook aprobado que deja la reserva `PAGADA`, disponibilidad según el horario de la cancha. `PagosClient` se simula |
| `PagosClientTest` | con servicio-pagos apagado, el cliente responde 503 con un mensaje claro |

Las pruebas de seguridad contra el servidor en ejecución están en [`../tests/security`](../tests/security/README.md).

## Paquetes

```
auth/      registro e inicio de sesión
security/  JWT, filtro y reglas de acceso
user/      usuarios y roles (ADMIN, PROPIETARIO, JUGADOR)
cancha/    canchas
horario/   horarios semanales por cancha
reserva/   reservas, estados y disponibilidad
pago/      pagos: PagoService revisa la reserva y PagosClient llama a servicio-pagos por HTTP; webhook de Wompi
admin/     consultas para administrador y propietario
common/    manejo global de errores
```

## Códigos de respuesta

| Código | Cuándo |
|---|---|
| 400 | datos inválidos, `horaFin` anterior a `horaInicio`, reserva en el pasado o fuera del horario |
| 401 | credenciales inválidas o webhook sin secreto |
| 403 | token ausente o inválido, rol insuficiente, recurso de otro usuario |
| 409 | correo ya registrado o traslape de horario |
