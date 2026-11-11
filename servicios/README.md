# ReservaCancha - Arquitectura orientada a servicios

Desarrollo Orientado a Servicios · Ingeniería de Sistemas · USTA Villavicencio · 2026-2.
Grupo: **Julián Mejía** y **Samuel Báez**.

ReservaCancha empezó como un monolito: un solo backend Spring Boot con usuarios, canchas, horarios,
reservas y pagos. Siguiendo la corrección de la docente, quedó organizado en **dos proveedores** y una
**aplicación consumidora**:

- **Proveedor 1 · Escenarios y horarios** (`servicio-escenarios`): canchas, horarios de operación y
  reglas de cada cancha.
- **Proveedor 2 · Reservas** (`servicio-reservas`): las reservas y los horarios ocupados.
- **Consumidora · Reserva Cancha Web**: el backend de ReservaCancha (usuarios, inicio de sesión, JWT), que
  integra los dos proveedores por HTTP con `RestClient` y sirve la interfaz web (HTML, CSS y JavaScript con
  `fetch`, en `backend/src/main/resources/static`). La carpeta `frontend/` (Next.js) es una versión opcional.

`servicio-pagos` (Wompi sandbox) sigue existiendo como **complemento opcional**: la reserva funciona sin él.

---

## Las aplicaciones

```
                        Navegador
                            |  HTTP + JSON (fetch)
                            |  Authorization: Bearer <JWT>
                            v
              +-------------------------------+
              |  backend  Spring Boot  :8080  |  Consumidora · Reserva Cancha Web:
              |  interfaz web (static/)       |  HTML, CSS, JS; usuarios, login, emite el JWT,
              |  BD propia: usuarios          |  integra a los proveedores (RestClient)
              +-------------------------------+
                 |                 |                    \
   HTTP + JSON   |                 | HTTP + JSON         \ HTTP + JSON (opcional)
   Bearer <JWT>  |                 | X-Api-Key            \ X-Api-Key
   en escrituras v                 v                       v
 +---------------------------+ +---------------------------+ +---------------------------+
 | servicio-escenarios :8081 | | servicio-reservas  :8082  | | servicio-pagos     :8085  |
 | Proveedor 1               | | Proveedor 2               | | complemento opcional      |
 | BD: establecimientos,     | | BD: reservas,             | | BD: pagos                 |
 |     canchas, horarios     | |     bloques_reservados    | |   --> Wompi sandbox       |
 +---------------------------+ +---------------------------+ +---------------------------+
```

| Aplicación | Carpeta | Puerto | Paquete | Rol |
|---|---|---|---|---|
| Backend ReservaCancha + interfaz web | `backend/` | 8080 | `co.edu.usta.reservacancha` | **Consumidora** |
| servicio-escenarios | `servicios/servicio-escenarios/` | 8081 | `co.edu.usta.servicioescenarios` | **Proveedor 1** |
| servicio-reservas | `servicios/servicio-reservas/` | 8082 | `co.edu.usta.servicioreservas` | **Proveedor 2** |
| servicio-pagos (opcional) | `servicios/servicio-pagos/` | 8085 | `co.edu.usta.serviciopagos` | Proveedor de pagos |
| Frontend Next.js (opcional) | `frontend/` | 3000 | — | Versión alternativa de la interfaz |

Cada aplicación es un proyecto Maven aparte (Spring Boot 3.3.5, Java 21), con su propio `main`, su puerto y
su base de datos (H2 en memoria por defecto). **Ningún servicio lee las tablas de otro**: solo comparten
identificadores (`canchaId`, `usuarioId`, `reservaId`) que viajan en JSON por HTTP.

### Quién es dueño de cada dato

| Dato | Dueño (fuente de verdad) | Los demás lo conocen por |
|---|---|---|
| Usuarios, contraseñas, roles | Consumidora (backend) | `usuarioId` dentro del JWT y de la reserva |
| Establecimiento, canchas, precio, reglas | Proveedor 1 | `canchaId` |
| Horarios de operación y franjas | Proveedor 1 | `GET /api/canchas/{id}/franjas` |
| Reservas y horarios ocupados | Proveedor 2 | `reservaId`, `GET /api/reservas/ocupacion` |
| Pagos y llaves de Wompi | servicio-pagos | `reservaId` y estado del pago |

La consumidora no guarda canchas, horarios ni reservas: los pide y compone la respuesta que espera el
frontend (que no cambió). La **disponibilidad** es la operación que integra a los dos: franjas del
Proveedor 1 menos la ocupación del Proveedor 2.

---

## Bases de datos (DDL resumido)

Cada proveedor declara su esquema en `src/main/resources/schema.sql` (DDL: `CREATE TABLE` con PK, FK
internas, `UNIQUE` y `CHECK`) y su semilla en `data.sql` (DML). Hibernate solo valida
(`ddl-auto: validate`); el acceso es con entidades JPA y `JpaRepository`.

### Proveedor 1 · servicio-escenarios

| Tabla | Columnas | Restricciones |
|---|---|---|
| `establecimientos` | `id`, `nombre`, `direccion`, `ciudad`, `telefono`, `activo` | PK `id` · `UNIQUE (nombre)` |
| `canchas` | `id`, `establecimiento_id`, `nombre`, `deporte`, `tipo`, `superficie`, `ubicacion`, `precio_hora`, `duracion_minima_min`, `horas_cancelacion`, `porcentaje_abono`, `activa` | PK · FK `establecimiento_id → establecimientos` · `CHECK` `precio_hora ≥ 0`, `duracion_minima_min > 0`, `horas_cancelacion ≥ 0`, `porcentaje_abono` entre 0 y 100 |
| `horarios` | `id`, `cancha_id`, `dia_semana`, `hora_apertura`, `hora_cierre`, `activo` | PK · FK `cancha_id → canchas` · `CHECK` `dia_semana IN (MONDAY..SUNDAY)`, `hora_cierre > hora_apertura` |

Semilla: establecimiento 1 «ReservaCancha Villavicencio» (simulado); cancha 1 «Cancha 1 — Sintética F5»
(Fútbol 5, $60 000/h) y cancha 2 «Cancha 2 — Sintética F8» (Fútbol 8, $90 000/h), las dos con reglas
60 min / 3 h / 50 % y horario de 06:00 a 22:00 los siete días.

### Proveedor 2 · servicio-reservas

| Tabla | Columnas | Restricciones |
|---|---|---|
| `reservas` | `id`, `usuario_id`, `cancha_id`, `fecha`, `hora_inicio`, `hora_fin`, `valor_total`, `estado`, `creado_en`, `actualizado_en` | PK · **sin FK** a usuarios ni canchas (son de otras aplicaciones) · `CHECK` `estado IN (PENDIENTE, PAGADA, CANCELADA)`, `hora_fin > hora_inicio`, `valor_total ≥ 0` |
| `bloques_reservados` | `id`, `reserva_id`, `cancha_id`, `fecha`, `hora_inicio` | PK · FK `reserva_id → reservas` · **`CONSTRAINT uk_bloque UNIQUE (cancha_id, fecha, hora_inicio)`** |

Sin semilla: las reservas las crea la consumidora.

---

## Mecanismo contra la doble reserva

*¿Qué impide que dos personas reserven la misma cancha a la misma hora?* **La base de datos del Proveedor 2.**

1. Cada reserva activa se parte en **bloques de 30 minutos**: una reserva de 19:00 a 20:00 en la cancha 2
   ocupa las filas `(2, fecha, 19:00)` y `(2, fecha, 19:30)` de `bloques_reservados`.
2. La tabla tiene `UNIQUE (cancha_id, fecha, hora_inicio)`. Dos filas con la misma cancha, fecha y bloque
   **no pueden existir**, sin importar cuántas solicitudes lleguen.
3. Al crear, en **una sola transacción** se guarda la reserva y sus bloques con `saveAndFlush`. Si dos
   solicitudes llegan al mismo tiempo por un mismo bloque, las dos pueden pasar la verificación previa,
   pero solo una inserción queda: la otra choca con la restricción (`DataIntegrityViolationException`),
   se revierte completa y responde **409** «Conflicto de horario: ya existe una reserva en ese rango».
4. Además se consulta el traslape antes de insertar, para responder 409 rápido en el caso normal. Esa
   consulta es una comodidad; la garantía es la restricción `UNIQUE`, no un «consultar y luego guardar».
5. Al **cancelar** se borran los bloques de esa reserva (la reserva queda con estado `CANCELADA` para el
   historial) y la hora vuelve a estar libre.

Como los bloques son de 30 minutos, también se detecta un traslape parcial: 19:30–20:30 choca con
19:00–20:00 en el bloque de 19:30. En Mónaco el P1 solo deja reservar 1 o 2 horas en punto, así que desde
la web los choques son de hora completa (por ejemplo 15:00–17:00 contra 16:00–17:00).

---

## Contratos

Formato común de errores: `{"status": 409, "error": "mensaje", "ts": "2026-10-27T15:00:00Z"}`.
`GET /api/ping` es público en los dos proveedores → `{"servicio": "...", "estado": "ok"}`.
Las horas salen como `"HH:mm:ss"`; las entradas aceptan `"HH:mm"` o `"HH:mm:ss"`.

### Proveedor 1 · servicio-escenarios (:8081)

`CanchaDto`:

```json
{"id":1,"establecimientoId":1,"nombre":"Cancha 1 — Sintética F5","deporte":"FUTBOL","tipo":"Fútbol 5",
 "superficie":"Sintética","ubicacion":"Villavicencio","precioHora":60000.00,"activa":true,
 "reglas":{"duracionMinimaMin":60,"horasCancelacion":3,"porcentajeAbono":50}}
```

`HorarioDto`: `{"id":1,"canchaId":1,"diaSemana":"MONDAY","horaApertura":"06:00:00","horaCierre":"22:00:00","activo":true}`

| Método | Ruta | Acceso | Respuesta |
|---|---|---|---|
| GET | `/api/establecimientos` | público | `[{id,nombre,direccion,ciudad,telefono}]` activos |
| GET | `/api/canchas?deporte=&establecimientoId=` | público | `[CanchaDto]` activas; filtros opcionales |
| GET | `/api/canchas/{id}` | público | `CanchaDto` (aunque esté inactiva); 404 «Cancha no existe» |
| POST | `/api/canchas` | JWT admin | 201 `CanchaDto` |
| PUT | `/api/canchas/{id}` | JWT admin | 200 `CanchaDto`; 404. La baja es `activa:false` |
| GET | `/api/canchas/{id}/horarios` | público | `[HorarioDto]` activos; 404 si la cancha no existe |
| POST | `/api/horarios` | JWT admin | 201 `HorarioDto`; body `{canchaId, diaSemana, horaApertura, horaCierre}`; 400 si cierre ≤ apertura; 404 cancha |
| PUT | `/api/horarios/{id}` | JWT admin | 200 `HorarioDto`; 404 |
| DELETE | `/api/horarios/{id}` | JWT admin | 204, baja lógica (`activo=false`); 404 |
| GET | `/api/canchas/{id}/franjas?fecha=YYYY-MM-DD` | público | `{canchaId, fecha, abierta, franjas:[{inicio:"06:00",fin:"07:00"},…]}`: franjas de 1 h dentro del horario de ese día; sin horario → `abierta:false, franjas:[]`. No conoce la ocupación |
| GET | `/api/canchas/{id}/cotizacion?fecha=&horaInicio=&horaFin=` | público | Valida las reglas y calcula el valor: `{canchaId, fecha, horaInicio, horaFin, minutos, valorTotal, valorAbono, horasCancelacion}` |

"JWT admin" = `Authorization: Bearer <JWT>` con rol `ROLE_ADMIN` o `ROLE_PROPIETARIO`.

`CanchaRequest`: `{establecimientoId?, nombre*, deporte?, tipo, superficie, ubicacion, precioHora* (≥ 0),
activa?, duracionMinimaMin?, horasCancelacion?, porcentajeAbono?}`. Sin establecimiento → 1, sin deporte →
`FUTBOL`, reglas por defecto 60/3/50, `activa` por defecto `true`; así la consumidora puede mandar el cuerpo
de siempre `{nombre, tipo, superficie, ubicacion, precioHora, activa}`.

Errores de la cotización, en este orden: cancha inexistente → 404; cancha inactiva → 400 «Cancha inactiva»;
`horaFin` ≤ `horaInicio` → 400 «horaFin debe ser mayor a horaInicio»; menos de la duración mínima → 400
«La reserva mínima es de 60 minutos»; horas que no son en punto → 400 «Las horas deben ser en punto»;
duración distinta de 1 o 2 horas → 400 «Solo se puede reservar 1 o 2 horas»; fecha u hora pasada → 400 «No se puede reservar en un horario que ya pasó»; sin horario ese día o
fuera de él → 400 «Fuera del horario de operación de la cancha». `valorTotal = precioHora × minutos / 60` y
`valorAbono = valorTotal × porcentajeAbono / 100` (2 decimales, `HALF_UP`).

### Proveedor 2 · servicio-reservas (:8082)

`ReservaDto` (estados `PENDIENTE`, `PAGADA`, `CANCELADA`):

```json
{"id":15,"usuarioId":2,"canchaId":2,"fecha":"2026-10-30","horaInicio":"21:00:00","horaFin":"22:00:00",
 "valorTotal":90000.00,"estado":"PENDIENTE","creadoEn":"2026-10-27T15:00:00Z","actualizadoEn":"2026-10-27T15:00:00Z"}
```

Todas las rutas menos `/api/ping` exigen `X-Api-Key`.

| Método | Ruta | Respuesta |
|---|---|---|
| POST | `/api/reservas` | Body `{usuarioId*, canchaId*, fecha*, horaInicio*, horaFin*, valorTotal*}` → 201 `ReservaDto` `PENDIENTE`. 409 «Conflicto de horario: ya existe una reserva en ese rango». 400 si fin ≤ inicio o las horas no son :00/:30 |
| GET | `/api/reservas/{id}` | 200 `ReservaDto`; 404 «Reserva no existe» |
| GET | `/api/reservas?usuarioId=` · `?canchaId=&desde=YYYY-MM-DD` · sin parámetros | `[ReservaDto]` por fecha y hora, incluye canceladas |
| GET | `/api/reservas/ocupacion?canchaId=&fecha=` | `[{reservaId, inicio:"21:00", fin:"22:00", estado}]` sin canceladas |
| PATCH | `/api/reservas/{id}/estado` | Body `{"estado":"PAGADA"\|"CANCELADA"}` → 200 `ReservaDto`. `PENDIENTE→PAGADA`; `PENDIENTE/PAGADA→CANCELADA` (libera los bloques). Cancelar una cancelada → 409 «La reserva ya está cancelada»; pagar una no pendiente → 409 «La reserva no está pendiente»; 404 |

El Proveedor 2 no conoce precios ni horarios de operación: recibe el `valorTotal` ya cotizado por la
consumidora y solo valida forma, bloques y traslapes.

### Consumidora · backend (:8080)

Conserva su API pública y sus formas JSON (el frontend no cambió). Lo que hace con cada proveedor:

| Ruta de la consumidora | Proveedor 1 | Proveedor 2 |
|---|---|---|
| `POST /api/auth/register`, `/login` | — | — (usuarios propios; emite el JWT) |
| `GET /api/canchas`, `/api/canchas/{id}`, `/api/horarios/cancha/{id}` | canchas / horarios | — |
| `POST/PUT /api/canchas`, `POST/PUT/DELETE /api/horarios` | reenvía con el `Authorization` del usuario | — |
| `GET /api/disponibilidad?canchaId&fecha` | franjas | ocupación → `{canchaId, fecha, ocupadas, libres}` |
| `POST /api/reservas` | cotización (reglas y valor) | `POST /api/reservas` |
| `GET /api/reservas/mias`, `/cancha/{id}`, `/por-cancha-fecha` | datos de la cancha | reservas / ocupación |
| `POST /api/reservas/{id}/cancelar` | regla `horasCancelacion` | `PATCH estado CANCELADA` |
| `POST /api/pagos/...` (opcional) | — | toma la reserva; si el pago se aprueba, `PATCH estado PAGADA` |
| `GET /api/admin/resumen`, `/reservas`, `/pagos` | canchas | `totalReservas`, reservas |

Formas JSON que recibe el frontend: Cancha `{id, nombre, tipo, superficie, ubicacion, precioHora, activa}`
(+ `deporte`, `reglas`); Horario `{id, cancha:{id}, diaSemana, horaApertura, horaCierre, activo}`; Reserva
`{id, usuario:{id,nombre,email,rol}, cancha:{…}, fecha, horaInicio, horaFin, valorTotal, estado, creadoEn}`.

Clientes: `EscenariosClient` y `ReservasClient` (`RestClient` con tiempo límite), igual que `PagosClient`.
Configuración: `app.servicio-escenarios.url` (`SERVICIO_ESCENARIOS_URL`, por defecto `http://localhost:8081`),
`app.servicio-reservas.url` (`SERVICIO_RESERVAS_URL`, `http://localhost:8082`) y
`app.servicio-reservas.api-key` (`RESERVAS_API_KEY`).

Cómo traduce la consumidora lo que le pasa con un proveedor:

| Lo que pasa con el proveedor | Lo que responde la consumidora |
|---|---|
| No responde (apagado o tiempo agotado) | **503** «El servicio de escenarios no responde en …» / «El servicio de reservas no responde en …» |
| 400, 404 o 409 | el mismo código y el mismo mensaje (por ejemplo 409 «Conflicto de horario…») |
| 5xx, 401 o 403 | **502**: es un error entre aplicaciones (por ejemplo, la clave no coincide), no del usuario |

---

## Secuencias

### Crear una reserva

```
Navegador -> POST :8080/api/reservas  {canchaId:2, fecha, horaInicio:"19:00", horaFin:"20:00"}
             Authorization: Bearer <JWT del jugador>
  backend: valida el JWT y toma el usuarioId
  1) GET :8081/api/canchas/2/cotizacion?fecha=…&horaInicio=19:00&horaFin=20:00
        <- 200 {minutos:60, valorTotal:90000.00, valorAbono:45000.00, horasCancelacion:3}
        <- 400/404 -> el mismo error al navegador; no se llama al Proveedor 2
        x  sin respuesta -> 503 «No se pudo verificar la cancha: el servicio de escenarios
                           no responde. La reserva no se creó.»
  2) POST :8082/api/reservas   X-Api-Key: <clave>
        {usuarioId, canchaId:2, fecha, horaInicio:"19:00", horaFin:"20:00", valorTotal:90000.00}
        servicio-reservas: reserva + bloques 19:00 y 19:30 en una transacción (UNIQUE)
        <- 201 ReservaDto PENDIENTE
        <- 409 «Conflicto de horario…» -> 409 al navegador
  3) arma la forma Reserva {id, usuario:{…}, cancha:{…}, fecha, horaInicio, horaFin, valorTotal, estado, creadoEn}
<- 200 al navegador
```

### Cancelar una reserva

```
Navegador -> POST :8080/api/reservas/{id}/cancelar   Authorization: Bearer <JWT>
  1) GET :8082/api/reservas/{id}                     (404 «Reserva no existe»)
  2) ¿es el dueño, ADMIN o PROPIETARIO?              (si no: 403 y no se toca nada)
  3) GET :8081/api/canchas/{canchaId}  -> reglas.horasCancelacion = 3
     jugador y faltan menos de 3 h -> 400 «Solo se puede cancelar hasta 3 horas antes del partido»
     (el personal puede cancelar siempre)
  4) PATCH :8082/api/reservas/{id}/estado {"estado":"CANCELADA"}
        servicio-reservas borra los bloques -> la hora queda libre
<- 200 Reserva con estado CANCELADA
```

---

## Seguridad entre aplicaciones

- **JWT de usuario.** Lo emite solo la consumidora al iniciar sesión (HS256, claim `rol`). El navegador lo
  manda a la consumidora en `Authorization: Bearer …`.
- **El Proveedor 1 valida el mismo JWT en las escrituras.** Los GET son públicos (es un catálogo). En
  POST/PUT/DELETE la consumidora reenvía el `Authorization` del usuario y servicio-escenarios lo verifica
  con el mismo secreto `app.jwt.secret` (`JWT_SECRET`): sin token o inválido/vencido → 401; rol `JUGADOR` →
  403; `ROLE_ADMIN` o `ROLE_PROPIETARIO` → permitido. La consumidora además mantiene su `@PreAuthorize`, así
  que el permiso se revisa en los dos lados.
- **El Proveedor 2 solo atiende a la consumidora.** Todo (menos el ping) exige `X-Api-Key`
  (`RESERVAS_API_KEY`, por defecto `clave-dev-portal-reservacancha`); sin clave o con clave errada → 401.
  El navegador nunca habla con servicio-reservas: el `usuarioId` lo pone la consumidora a partir del JWT,
  por eso un jugador no puede reservar a nombre de otro.
- **servicio-pagos** usa el mismo esquema de `X-Api-Key` (`PAGOS_API_KEY`).

---

## Reglas por cancha

Las reglas son datos de la cancha en el Proveedor 1 (columnas de `canchas` y tabla `horarios`), no
constantes del código:

| Regla | Valor en la semilla | Dónde se aplica |
|---|---|---|
| Duración mínima | 60 minutos (`duracion_minima_min`) | cotización del P1 |
| Duración | 1 o 2 horas, en punto | cotización del P1 |
| Bloques | de 30 min: el P2 guarda cada media hora ocupada | creación en el P2 |
| Horario de operación | 14:00–22:00, los 7 días (`horarios`) | franjas y cotización del P1 |
| Cancelación | hasta 3 h antes del partido (`horas_cancelacion`), para jugadores | consumidora, con la regla del P1 |
| Abono | 50 % del valor (`porcentaje_abono`) | cotización del P1 (`valorAbono`) |
| Valor | `precio_hora × minutos / 60` | cotización del P1 |

---

## Cómo ejecutarlo

Una terminal (o una configuración de IntelliJ) por aplicación. Los proveedores primero:

```bash
cd servicios/servicio-escenarios && mvn spring-boot:run   # 8081  Proveedor 1
cd servicios/servicio-reservas   && mvn spring-boot:run   # 8082  Proveedor 2
cd backend                       && mvn spring-boot:run   # 8080  Consumidora
cd servicios/servicio-pagos      && mvn spring-boot:run   # 8085  opcional: solo para pagar con Wompi
cd frontend                      && npm run dev           # 3000  opcional: interfaz en Next.js
```

Abrir http://localhost:8080 (admin semilla `admin@reservacancha.co` / `admin123`, jugador
`jugador@reservacancha.co` / `jugador123`). El archivo [`pruebas.http`](pruebas.http) prueba cada servicio
directamente desde IntelliJ, antes de pasar por la página.

Variables que deben coincidir entre aplicaciones: `JWT_SECRET` (consumidora y Proveedor 1) y
`RESERVAS_API_KEY` (consumidora y Proveedor 2); `PAGOS_API_KEY` si se usa servicio-pagos.

### Pruebas

```bash
cd servicios/servicio-escenarios && mvn test
cd servicios/servicio-reservas   && mvn test
cd servicios/servicio-pagos      && mvn test
cd backend                       && mvn test
# Con las tres aplicaciones encendidas, desde la raíz del repo:
npx newman run tests/postman/ReservaCancha-SOA.postman_collection.json -e tests/postman/local.postman_environment.json \
  --folder "0 · Salud" --folder "1 · Proveedor 1 (escenarios)" --folder "2 · Proveedor 2 (reservas)" --folder "3 · Consumidora" \
  --folder "5 · CRUD: eliminar y baja lógica"
npx newman run tests/security/SEC-01.postman_collection.json
```

La colección Postman y lo que cubre cada carpeta están en [`tests/postman/README.md`](../tests/postman/README.md).

---

## Prueba de proveedor detenido

Son aplicaciones independientes en ejecución: apagar un proveedor no tumba a las demás, pero las
operaciones que dependen de él no se pueden completar, y la consumidora lo explica en vez de romperse.
Se prueba con la carpeta «4 · Proveedor detenido (manual)» de la colección Postman.

| Operación | Todo encendido | servicio-escenarios apagado | servicio-reservas apagado |
|---|---|---|---|
| Iniciar sesión | 200 | 200 | 200 |
| Ver canchas | 200 | 503 | 200 |
| Disponibilidad | 200 | 503 | **503** |
| Crear reserva | 200 | **503** «No se pudo verificar la cancha: el servicio de escenarios no responde. La reserva no se creó.» | 503 |
| Mis reservas | 200 | (no se mide) | **503** |

Con servicio-escenarios apagado, la consulta directa a servicio-reservas confirma que no quedó ningún
bloque ocupado: la reserva no queda a medias, porque sin cotización la consumidora nunca llama al Proveedor 2.

Con servicio-pagos pasa lo mismo que en el avance anterior (prueba del 21-oct-2026): con el servicio
apagado, ver canchas y crear reservas siguen funcionando; iniciar el pago responde 503 «El servicio de
pagos no responde en http://localhost:8085…» y el resumen del propietario trae `totalPagos: null` con un aviso.

---

## Servicio de pagos (complemento opcional)

No es un requisito de la arquitectura pedida: se conserva del avance anterior para pagar con Wompi
**sandbox**. Las llaves del comercio (`WOMPI_PUBLIC_KEY`, `WOMPI_INTEGRITY_SECRET`, `WOMPI_BASE_URL`)
viven solo en servicio-pagos.

```
Navegador -> POST :8080/api/pagos/iniciar/{reservaId}       Authorization: Bearer <JWT>
  backend: toma la reserva del Proveedor 2, revisa que sea del usuario y esté PENDIENTE
  PagosClient -> POST :8085/api/pagos {reservaId, valor}    X-Api-Key
              <- 201 {pagoId, referencia, valorCentavos, firmaIntegridad, llavePublica, estado:"PENDIENTE"}
El navegador abre el Widget de Wompi.
Al volver: POST :8080/api/pagos/confirmar/{id}?transactionId=… -> POST :8085/api/pagos/confirmaciones
           servicio-pagos -> GET https://sandbox.wompi.co/v1/transactions/{id} (referencia y monto)
           pago APROBADO -> el backend hace PATCH :8082/api/reservas/{id}/estado {"estado":"PAGADA"}
```

| Método | Ruta (servicio-pagos, :8085) | Operación |
|---|---|---|
| POST | `/api/pagos` | registrarPago: `{reservaId, valor}` → 201 `{pagoId, reservaId, referencia, valorCentavos, moneda, firmaIntegridad, llavePublica, estado}`; 400 valor inválido; 409 ya tiene un pago aprobado; 401 sin clave |
| GET | `/api/pagos?reservaId=` | pagos de una reserva (sin parámetro: todos) |
| POST | `/api/pagos/confirmaciones` | confirmarPago: verifica la transacción con Wompi |
| POST | `/api/pagos/notificaciones` | aplica un aviso de Wompi ya validado |
| GET | `/api/pagos/ping` | ¿está encendido? (no pide clave) |

El webhook de Wompi llega al backend (`POST /api/wompi/webhook`), que valida `X-Webhook-Secret` y lo
reenvía a `POST :8085/api/pagos/notificaciones`. El servicio no llama de vuelta al backend.

| Situación de pago | Código | Lo que ve el usuario |
|---|---|---|
| La reserva es de otro jugador | 403 | «Sin permiso sobre esta reserva» (no llega al servicio) |
| La reserva ya está pagada | 409 | «La reserva ya fue pagada» |
| Wompi devuelve otro monto u otra referencia | 400 | «El monto de la transaccion no coincide» |
| Wompi no responde | 502 | «Servicio de pagos: No se pudo consultar a Wompi» |
| servicio-pagos está apagado | 503 | «El servicio de pagos no responde en http://localhost:8085. Verifique que esté en ejecución.» |
| La clave entre aplicaciones no coincide | 502 | «Servicio de pagos: Aplicación no autorizada…» (error de configuración, no del usuario) |

---

## Alcance

- **Un establecimiento simulado** («ReservaCancha Villavicencio») y un solo deporte, fútbol, con seis canchas
  de precios, horarios y reglas distintos (fútbol 5, 6, 7, 8 y 11). El modelo admite más establecimientos y
  deportes, pero no se gestionan desde la página.
- Reservas con reglas por cancha, cancelación y disponibilidad integrada de los dos proveedores.
- Pagos con Wompi **sandbox** como complemento opcional, no como requisito.
- **Sin** WhatsApp, correos, SMS ni ningún otro tipo de notificación.

## Lo que sigue

- Bases de datos persistentes (Postgres) por servicio; hoy H2 en memoria: al reiniciar un proveedor se
  pierde lo que tenía.
- Gestión de horarios y reglas desde la página del propietario (hoy vienen en la semilla o se cambian por la API).
- Una clave por despliegue para `X-Api-Key` y el secreto JWT en variables de entorno de cada servidor, en
  vez de los valores de desarrollo.
- Reintento corto y mensaje claro en la página cuando un proveedor no responde.

## Lo que simplificamos

- El webhook usa el formato simplificado del sandbox (`{referencia, transactionId, status}`), no el evento
  firmado real de Wompi.
- Cada relación entre aplicaciones usa una sola clave compartida; en producción iría por variable de
  entorno y cambiaría por despliegue.
- El Proveedor 1 confía en el JWT de la consumidora porque comparten el secreto HS256; con más
  consumidoras convendría firmar con llave asimétrica y publicar solo la llave pública.
