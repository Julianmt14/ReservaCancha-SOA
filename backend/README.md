# ReservaCancha - Backend (aplicación consumidora)

API REST en **Spring Boot 3.3** con **Java 21**, JPA y Spring Security (JWT). Puerto 8080. Es la
**aplicación consumidora** de la arquitectura SOA: guarda solo los usuarios y emite el JWT; las canchas,
horarios y reservas se los pide por HTTP (`RestClient`) a los proveedores, y conserva su API pública y sus
formas JSON para que el frontend no cambie.

| Proveedor | Puerto | Qué le pide el backend | Propiedades |
|---|---|---|---|
| servicio-escenarios (Proveedor 1) | 8081 | canchas, horarios, franjas de operación, cotización y reglas | `SERVICIO_ESCENARIOS_URL` |
| servicio-reservas (Proveedor 2) | 8082 | reservas, ocupación y cambios de estado (`X-Api-Key`) | `SERVICIO_RESERVAS_URL`, `RESERVAS_API_KEY` |
| servicio-pagos (opcional) | 8085 | pagos con Wompi sandbox | `SERVICIO_PAGOS_URL`, `PAGOS_API_KEY` |

Si un proveedor no responde, el backend contesta 503 con un mensaje que lo nombra; un 400/404/409 del
proveedor se devuelve con el mismo código y mensaje; un 5xx/401/403 del proveedor se vuelve 502.

## Arranque

```bash
mvn spring-boot:run          # H2 en memoria por defecto
```

Usuarios de arranque: `admin@reservacancha.co` / `admin123` (ADMIN) y `jugador@reservacancha.co` /
`jugador123` (JUGADOR).

Con Postgres: levantar `docker compose up -d db` en la raíz y definir `SPRING_DATASOURCE_URL`,
`SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD` y `SPRING_DATASOURCE_DRIVER`.

## Pruebas

```bash
mvn test
```

Las pruebas no necesitan los proveedores en ejecución (`src/test`):

| Clase | Qué verifica |
|---|---|
| `AuthIntegrationTest` | registro (sin rol `ADMIN`, contraseña de 8 a 72 caracteres, correo repetido), login 401, acceso por rol |
| `ReservaIntegrationTest` | con los clientes simulados (`@MockBean`): la reserva creada tiene la forma de siempre y manda a servicio-reservas el valor cotizado; servicio-escenarios caído → 503 sin llegar a servicio-reservas; 400 y 409 de los proveedores se propagan; cancelación (otro jugador 403, jugador a menos de 3 h 400, personal siempre); disponibilidad = franjas − ocupación; SEC-01 sin token; reenvío del token en las escrituras; pagos ajenos (403) y webhook aprobado que pide `PAGADA` |
| `EscenariosClientTest`, `ReservasClientTest` | cada cliente contra un servidor HTTP falso o un puerto cerrado: 503, propagación de 400/404/409, 502, `X-Api-Key`, `Authorization`, PATCH |
| `PagosClientTest` | con servicio-pagos apagado, el cliente responde 503 con un mensaje claro |

Las pruebas de seguridad contra el servidor en ejecución están en [`../tests/security`](../tests/security/README.md).

## Paquetes

```
auth/        registro e inicio de sesión
security/    JWT, filtro y reglas de acceso
user/        usuarios y roles (ADMIN, PROPIETARIO, JUGADOR): los únicos datos propios
escenarios/  EscenariosClient y DTO del Proveedor 1
reservas/    ReservasClient y DTO del Proveedor 2
cancha/      API /api/canchas (lee y escribe en el Proveedor 1)
horario/     API /api/horarios (Proveedor 1, con la forma {cancha:{id}})
reserva/     API /api/reservas y /api/disponibilidad; ReservaOrquestador integra los dos proveedores
pago/        pagos: PagoService toma la reserva del Proveedor 2 y PagosClient llama a servicio-pagos; webhook de Wompi
admin/       consultas para administrador y propietario
common/      manejo global de errores y ServicioRemoto (tiempos de espera y traducción de errores)
```

## Códigos de respuesta

| Código | Cuándo |
|---|---|
| 400 | datos inválidos o regla de la cancha incumplida (la decide servicio-escenarios), cancelación tardía |
| 401 | credenciales inválidas o webhook sin secreto |
| 403 | token ausente o inválido, rol insuficiente, recurso de otro usuario |
| 409 | correo ya registrado o horario ocupado (lo decide servicio-reservas) |
| 502 | un proveedor falló por dentro o rechazó las credenciales del backend |
| 503 | un proveedor no responde |
