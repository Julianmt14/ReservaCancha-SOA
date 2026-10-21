# ReservaCancha

Reservas y pagos de canchas deportivas en Villavicencio. Proyecto de **Desarrollo Orientado a Servicios**
(Ingeniería de Sistemas, USTA Villavicencio, 2026-2).

**Grupo:** Julián Mejía y Samuel Báez.

**Alcance:** usuarios y roles · canchas y horarios · disponibilidad · crear/consultar reservas · Wompi **sandbox** · consultas admin.
**Excluye:** app móvil nativa, facturación DIAN, PayPal/Stripe, torneos, SMS, QR.
La pantalla de torneos del frontend es solo la interfaz, sin API ni datos.

## Estructura

```
ReservaCancha-USTA/
  backend/   Spring Boot 3.3 + Java 21 + JPA + Security/JWT + Postgres/H2 + Wompi sandbox  (puerto 8080)
  frontend/  Next.js 16 + React 19 + Tailwind 4 (puerto 3000) — ver frontend/README.md
  tests/     Pruebas de seguridad SEC-01 (Postman/Newman)
  docker-compose.yml  Postgres 16 para dev
```

## Arranque rápido

```bash
# 1) Base de datos (opcional; sin esto usa H2 en memoria)
docker compose up -d db

# 2) Backend
cd backend
mvn spring-boot:run
# o con Postgres:
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/reservacancha SPRING_DATASOURCE_USERNAME=rc SPRING_DATASOURCE_PASSWORD=rc123 SPRING_DATASOURCE_DRIVER=org.postgresql.Driver mvn spring-boot:run

# 3) Frontend
cd ../frontend
cp .env.example .env.local
npm install
npm run dev
```

Admin semilla (solo desarrollo): `admin@reservacancha.co` / `admin123`.

## Variables de entorno del backend

| Variable | Por defecto | Nota |
|---|---|---|
| `JWT_SECRET` | secreto de desarrollo | **obligatorio cambiarlo en cualquier despliegue** (Base64, 256 bits o más) |
| `CORS_ORIGINS` | `http://localhost:3000` | orígenes del frontend, separados por coma |
| `WOMPI_PUBLIC_KEY`, `WOMPI_PRIVATE_KEY`, `WOMPI_INTEGRITY_SECRET` | placeholders sandbox | llaves del comercio en Wompi |
| `WOMPI_EVENTS_SECRET` | `test_events_XXXX` | secreto compartido que debe enviar el webhook en `X-Webhook-Secret` |

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

