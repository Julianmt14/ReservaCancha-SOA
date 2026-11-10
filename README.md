# ReservaCancha

Reservas y pagos de canchas deportivas en Villavicencio. Proyecto de **Desarrollo Orientado a Servicios**
(Ingeniería de Sistemas, USTA Villavicencio, 2026-2).

**Grupo:** Julián Mejía y Samuel Báez.

**Alcance:** usuarios y roles · canchas y horarios · disponibilidad · crear/consultar reservas · Wompi **sandbox** · consultas admin.
**Excluye:** app móvil nativa, facturación DIAN, PayPal/Stripe, torneos, SMS, QR.
Pagos (Wompi) y la carpeta `frontend/` en Next.js son extras opcionales: la entrega se demuestra con la
interfaz web de la consumidora (HTML, CSS, JavaScript y Fetch) en http://localhost:8080.

## Arquitectura

Dos proveedores y una aplicación consumidora, cada uno un proyecto Spring Boot aparte con su puerto y su
base de datos (H2 en archivo por defecto, en la carpeta `datos/` de cada aplicación, así que los datos se
conservan al reiniciar). Se comunican por HTTP con JSON y solo comparten identificadores
(`canchaId`, `usuarioId`, `reservaId`); ninguno lee las tablas de otro.

| Aplicación | Carpeta | Puerto | Es dueña de |
|---|---|---|---|
| **Proveedor 1 · Escenarios y horarios** | `servicios/servicio-escenarios/` | 8081 | establecimiento, canchas, horarios y reglas (duración mínima, cancelación, abono) |
| **Proveedor 2 · Reservas** | `servicios/servicio-reservas/` | 8082 | reservas y horarios ocupados (`UNIQUE` en `bloques_reservados` contra la doble reserva) |
| **Consumidora · Reserva Cancha Web** | `backend/` | 8080 | usuarios, login y JWT; integra a los dos proveedores con `RestClient`; sirve la interfaz web (`src/main/resources/static`: HTML, CSS y JavaScript con `fetch`) |
| Frontend Next.js (opcional) | `frontend/` | 3000 | versión alternativa de la interfaz; no hace falta para la entrega |
| servicio-pagos (opcional) | `servicios/servicio-pagos/` | 8085 | pagos con Wompi **sandbox**; complemento, no requisito |

El Proveedor 1 valida en sus escrituras el mismo JWT que emite la consumidora; el Proveedor 2 solo atiende
a la consumidora, con `X-Api-Key`. Contratos, DDL, secuencias y la prueba de proveedor detenido:
[`servicios/README.md`](servicios/README.md).

## Estructura

```
ReservaCancha-SOA/
  backend/                       Consumidora: Spring Boot 3.3 + Java 21 + Security/JWT + RestClient (8080)
  servicios/servicio-escenarios/ Proveedor 1 · Escenarios y horarios (8081)
  servicios/servicio-reservas/   Proveedor 2 · Reservas (8082)
  servicios/servicio-pagos/      Pagos con Wompi sandbox, opcional (8085)
  servicios/README.md            Arquitectura, contratos y pruebas de los servicios
  servicios/pruebas.http         Peticiones directas a cada servicio (cliente HTTP de IntelliJ)
  backend/src/main/resources/static/  Interfaz web: index.html, css/estilos.css, js/app.js (fetch a /api)
  frontend/                      Opcional: la misma interfaz en Next.js 16 (3000) — ver frontend/README.md
  tests/postman/                 Colección Postman de los dos proveedores y la consumidora
  tests/security/                Pruebas de seguridad SEC-01 (Postman/Newman)
  tests/rendimiento/             Medición RNF-01
  docker-compose.yml             Postgres 16 para dev (opcional)
```

## Arranque rápido

Una terminal por aplicación, los proveedores primero:

```bash
# 1) Proveedor 1 · servicio-escenarios (8081)
cd servicios/servicio-escenarios && mvn spring-boot:run

# 2) Proveedor 2 · servicio-reservas (8082)
cd servicios/servicio-reservas && mvn spring-boot:run

# 3) Consumidora · backend (8080)
cd backend && mvn spring-boot:run
# o con Postgres para los usuarios (docker compose up -d db):
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/reservacancha SPRING_DATASOURCE_USERNAME=rc SPRING_DATASOURCE_PASSWORD=rc123 SPRING_DATASOURCE_DRIVER=org.postgresql.Driver mvn spring-boot:run

# Abrir la interfaz web: http://localhost:8080

# 4) Opcional: frontend Next.js (3000)
cd frontend
cp .env.example .env.local
npm install
npm run dev

# 5) Opcional: servicio de pagos (8085). Sin él se reserva normalmente, pero no se puede pagar
cd servicios/servicio-pagos && mvn spring-boot:run
```

Usuarios semilla (solo desarrollo): `admin@reservacancha.co` / `admin123` y `jugador@reservacancha.co` / `jugador123`.

Pruebas Postman con las tres aplicaciones encendidas (detalle en [`tests/postman/README.md`](tests/postman/README.md)):

```bash
npx newman run tests/postman/ReservaCancha-SOA.postman_collection.json -e tests/postman/local.postman_environment.json \
  --folder "0 · Salud" --folder "1 · Proveedor 1 (escenarios)" --folder "2 · Proveedor 2 (reservas)" --folder "3 · Consumidora" \
  --folder "5 · CRUD: eliminar y baja lógica"
```

## Variables de entorno del backend

| Variable | Por defecto | Nota |
|---|---|---|
| `JWT_SECRET` | secreto de desarrollo | **obligatorio cambiarlo en cualquier despliegue** (Base64, 256 bits o más); el mismo en servicio-escenarios, que valida los tokens |
| `CORS_ORIGINS` | `http://localhost:3000` | orígenes del frontend, separados por coma |
| `SERVICIO_ESCENARIOS_URL` | `http://localhost:8081` | dirección del Proveedor 1 |
| `SERVICIO_RESERVAS_URL` | `http://localhost:8082` | dirección del Proveedor 2 |
| `RESERVAS_API_KEY` | clave de desarrollo | clave que el backend manda a servicio-reservas en `X-Api-Key`; la misma en los dos lados |
| `SERVICIO_PAGOS_URL` | `http://localhost:8085` | dirección de servicio-pagos (opcional) |
| `PAGOS_API_KEY` | clave de desarrollo | clave que el backend manda a servicio-pagos en `X-Api-Key`; la misma en los dos lados |
| `WOMPI_EVENTS_SECRET` | `test_events_XXXX` | secreto compartido que debe enviar el webhook en `X-Webhook-Secret` |
| `SERVICIO_*_TIMEOUT_MS` | 5000 (pagos 15000) | tiempo para conectar con cada proveedor y para esperar su respuesta |
| `DESPERTAR_PROVEEDORES` | `false` | en `true`, al arrancar llama al ping de los tres proveedores (para el plan gratis de Render) |

Las llaves del comercio (`WOMPI_PUBLIC_KEY`, `WOMPI_INTEGRITY_SECRET`, `WOMPI_BASE_URL`) ahora son de
servicio-pagos; ver [`servicios/README.md`](servicios/README.md).

## Versión publicada (Render)

La aplicación también está publicada para probarla desde cualquier celular o computador:
**https://reservacancha-dos.onrender.com** (usuarios semilla de arriba; el pago es de Wompi en modo de pruebas).

- Cuatro servicios web en el plan gratis de Render, cada uno con su `Dockerfile` y publicados desde la rama
  `dos-dos-proveedores`: `reservacancha-dos` (consumidora), `reservacancha-dos-escenarios`,
  `reservacancha-dos-reservas` y `reservacancha-dos-pagos`. Render entrega el puerto en `PORT`.
- Los secretos (`JWT_SECRET`, `RESERVAS_API_KEY`, `PAGOS_API_KEY` y las llaves de pruebas de Wompi) están en las
  variables de entorno de Render, no en el repositorio.
- En el plan gratis cada servicio se duerme tras 15 minutos sin uso y tarda cerca de un minuto y medio en despertar:
  conviene abrir la página unos minutos antes de una demostración. Las bases H2 de esta versión se reinician cuando
  Render apaga el servicio (la persistencia en archivo se demuestra en local).

## API (backend)

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| POST | `/api/auth/register` | público | registro (`JUGADOR` o `PROPIETARIO`; `ADMIN` se rechaza) |
| POST | `/api/auth/login` | público | login → JWT |
| GET | `/api/canchas` | público | listar activas |
| POST / PUT | `/api/canchas` | ADMIN, PROPIETARIO | crear / editar (la baja es `activa=false`) |
| GET | `/api/horarios/cancha/{id}` | JWT | horarios activos de la cancha |
| POST / PUT / DELETE | `/api/horarios` | ADMIN, PROPIETARIO | crear / editar / dar de baja |
| GET | `/api/disponibilidad?canchaId=&fecha=` | público | ocupadas + libres 06:00-22:00 (RNF-01 < 2,0 s) |
| POST | `/api/reservas` | JWT | crear (valida horario y traslape → 409) |
| GET | `/api/reservas/mias` | JWT | mis reservas |
| GET | `/api/reservas/cancha/{id}` | JWT | ocupación desde hoy; el personal ve además quién reservó |
| POST | `/api/reservas/{id}/cancelar` | dueño, ADMIN, PROPIETARIO | cancelar |
| POST | `/api/pagos/iniciar/{reservaId}` | dueño, ADMIN, PROPIETARIO | referencia y firma de integridad Wompi |
| POST | `/api/pagos/confirmar/{reservaId}?transactionId=` | dueño, ADMIN, PROPIETARIO | confirma consultando la transacción a Wompi |
| GET | `/api/pagos/reserva/{reservaId}` | dueño, ADMIN, PROPIETARIO | pagos de la reserva |
| POST | `/api/wompi/webhook` | secreto compartido | evento de Wompi |
| GET | `/api/admin/resumen`, `/reservas`, `/pagos` | ADMIN, PROPIETARIO | consultas administrativas |

Las rutas de pagos no cambiaron para el frontend, pero el backend ya no guarda los pagos: revisa la
reserva y los permisos y le pide la operación a servicio-pagos por HTTP. Si ese servicio está apagado,
responden 503 y el resumen trae `totalPagos: null` con un aviso.

## Wompi sandbox (10 flujos antes de semana 15)

1. Crear reserva → `POST /api/reservas`.
2. `POST /api/pagos/iniciar/{id}` → `{referencia, valorCentavos, firmaIntegridad, llavePublica}`.
3. Widget de checkout de Wompi en el frontend.
4. `POST /api/pagos/confirmar/{id}?transactionId=...` verifica la transacción con Wompi → reserva `PAGADA`.

## Calidad (ISO/IEC 25010)

- Pruebas del backend: `cd backend && mvn test` (autenticación, reservas, pagos y disponibilidad; ver [`backend/README.md`](backend/README.md)).
- RNF-01 desempeño: `GET /api/disponibilidad` < 2,0 s (JMeter). 2,0 exacto = incumple. Medición repetible:
  `python tests/rendimiento/medir_rnf01.py` (ver `tests/rendimiento/README.md`).
- SEC-01 seguridad: 0 accesos no autorizados. Colección Postman/Newman en [`tests/security`](tests/security/README.md)
  (sin token, token inválido, rol insuficiente, escalada de privilegios, recursos ajenos, webhook, exposición de datos).

## Ramas

`main` tiene lo entregado. Cada integrante trabaja en su propia rama y la integra a `main` con un
*pull request* que revisa el otro. Los commits siguen Conventional Commits (`tipo(alcance): descripción`).

