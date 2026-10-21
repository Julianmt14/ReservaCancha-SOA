# ReservaCancha - Arquitectura orientada a servicios (avance)

Desarrollo Orientado a Servicios · Ingeniería de Sistemas · USTA Villavicencio · 2026-2.
Grupo: **Julián Mejía** y **Samuel Báez**. Este avance separa el primer servicio: **pagos**.

ReservaCancha empezó como un monolito: un solo backend Spring Boot donde `ReservaService` y el
servicio de Wompi vivían en la misma aplicación y se llamaban con una llamada Java directa. En este
avance el pago se sacó a su propia aplicación, con su puerto y su base de datos, y el backend de
ReservaCancha pasó a ser la aplicación **consumidora** que le pide la operación por HTTP.

---

## Las aplicaciones

| Carpeta | Qué es | Rol | Puerto |
|---|---|---|---|
| `frontend/` | Página web de ReservaCancha (Next.js) | Interfaz del usuario | 3000 |
| `backend/` | ReservaCancha: usuarios, canchas, horarios y reservas | **Consumidora** | 8080 |
| `servicios/servicio-pagos/` | Servicio de Pagos | **Proveedora** | 8085 |
| — | Wompi sandbox | Pasarela externa (la usa el servicio de pagos) | — |

Cada aplicación es un proyecto Maven aparte, con su propio `main`, su puerto y su base de datos (H2 en
memoria por defecto). El backend no lee la tabla de pagos: solo conoce lo que le responde el servicio.

**Por qué pagos primero:** es el servicio con la información más sensible (dinero, llaves de Wompi), el
que más se carga en horas pico y el que ya estaba aislado en su paquete. Así las llaves de Wompi
quedan solo en el servicio de pagos.

---

## Cómo viaja una solicitud

```
Navegador (frontend, :3000)
   |  POST /api/pagos/iniciar/{reservaId}        Authorization: Bearer <JWT>
   v
PagoController  ->  PagoService                 (backend ReservaCancha, :8080)
   |   revisa que la reserva exista, sea del usuario y esté PENDIENTE
   |
   `-- PagosClient --------> POST http://localhost:8085/api/pagos      X-Api-Key: <clave>
                              {reservaId, valor}
                              PagoController -> PagoService.registrarPago()   (servicio-pagos)
                              <- 201 {pagoId, referencia, valorCentavos, firmaIntegridad, ...}
   |
   v
El navegador abre el Widget de Wompi con la referencia y la firma.

Al volver de Wompi:
Navegador -> POST /api/pagos/confirmar/{id}?transactionId=...  -> PagoService (backend)
          -> POST :8085/api/pagos/confirmaciones {reservaId, transactionId}
                 servicio-pagos -> GET https://sandbox.wompi.co/v1/transactions/{id}
                 (verifica referencia y monto) -> pago APROBADO
          <- el backend marca la reserva PAGADA
```

- El **frontend** no tiene la lógica del pago: pide y muestra lo que le responden.
- El **backend** decide el orden y es dueño de las reservas; el **servicio** es dueño de los pagos.
- HTTP se usa en tres tramos: navegador → backend, backend → servicio-pagos, servicio-pagos → Wompi.
- El webhook de Wompi llega al backend (`POST /api/wompi/webhook`), que valida el secreto y lo reenvía
  a `POST :8085/api/pagos/notificaciones`. El servicio no llama de vuelta al backend.

---

## Contrato de la operación registrarPago

| Elemento | Definición |
|---|---|
| Servicio | Servicio de Pagos (`servicio-pagos`) |
| Operación | `registrarPago` |
| La solicita | Backend de ReservaCancha (`PagosClient`) |
| Método y ruta | `POST /api/pagos` |
| Entrada | `{"reservaId": 12, "valor": 90000}` (`RegistrarPagoRequest`) |
| Salida | `201` con `{pagoId, reservaId, referencia, valorCentavos, moneda, firmaIntegridad, llavePublica, estado: "PENDIENTE"}` (`IntencionPago`) |
| Errores | `400` valor inválido · `409` la reserva ya tiene un pago aprobado · `401` falta la clave de la aplicación |

### Endpoints de servicio-pagos (8085)

| Método | Ruta | Operación |
|---|---|---|
| POST | `/api/pagos` | registrarPago |
| GET | `/api/pagos?reservaId=` | consultar los pagos de una reserva (sin parámetro: todos) |
| POST | `/api/pagos/confirmaciones` | confirmarPago: verifica la transacción con Wompi |
| POST | `/api/pagos/notificaciones` | aplicar un aviso de Wompi ya validado |
| GET | `/api/pagos/ping` | ¿está encendido? (no pide clave) |

Todas menos el ping exigen `X-Api-Key`. Así solo la aplicación consumidora puede usar el servicio
(pregunta del taller 1: «¿cómo se autenticarían las aplicaciones consumidoras?»). Los errores salen
como `{"error": "...", "status": ..., "ts": ...}`, el mismo formato del backend.

### Lo que cruza el límite entre las dos aplicaciones

| Dato | Tipo | Por qué viaja |
|---|---|---|
| `reservaId` | Long | el servicio guarda a qué reserva pertenece el pago, sin leer la reserva |
| `valor` | BigDecimal | lo calcula el backend (horas × precio de la cancha); el servicio no conoce las canchas |
| `transactionId` | String | lo devuelve Wompi en el navegador; el servicio lo verifica con Wompi |
| `referencia`, `firmaIntegridad`, `valorCentavos`, `llavePublica` | String / long | datos que necesita el Widget de Wompi |
| `estado` | String | `PENDIENTE`, `APROBADO`, `RECHAZADO` o `FALLIDO`; con `APROBADO` el backend marca la reserva `PAGADA` |

DTO en el backend: `RegistrarPagoRequest`, `ConfirmarPagoRequest`, `NotificacionPagoRequest`,
`IntencionPagoDto`, `PagoDto` y `PagoConReserva`. Este último une el pago del servicio con la reserva
propia, para que el frontend reciba lo mismo que antes de separar el servicio.

---

## Cómo responde cada error

| Situación | Código | Lo que ve el usuario |
|---|---|---|
| La reserva es de otro jugador | 403 | «Sin permiso sobre esta reserva» (no llega al servicio) |
| La reserva ya está pagada | 409 | «La reserva ya fue pagada» |
| Wompi devuelve otro monto u otra referencia | 400 | «El monto de la transaccion no coincide» |
| Wompi no responde | 502 | «Servicio de pagos: No se pudo consultar a Wompi» |
| servicio-pagos está apagado | 503 | «El servicio de pagos no responde en http://localhost:8085. Verifique que esté en ejecución.» |
| La clave entre aplicaciones no coincide | 502 | «Servicio de pagos: Aplicación no autorizada…» (es un error de configuración, no del usuario) |

---

## Prueba de independencia

Con el backend y servicio-pagos encendidos, un pago se inicia y se confirma; después se detuvo **solo**
servicio-pagos y se repitió todo. Resultado del 21 de octubre de 2026:

| Operación | Con servicio-pagos | Con servicio-pagos apagado |
|---|---|---|
| Ver canchas | 200 | 200 |
| Crear una reserva | 200 | 200 |
| Iniciar el pago | 200 con referencia y firma | **503** «El servicio de pagos no responde…» |
| Resumen del propietario | 200 `{totalReservas, totalPagos}` | 200 con `totalPagos: null` y un aviso |

Son aplicaciones independientes en ejecución: apagar pagos no tumba ReservaCancha. Pero pagar depende
funcionalmente del Servicio de Pagos, así que esa operación no se puede completar mientras esté apagado,
y la aplicación lo explica en vez de romperse.

---

## Cómo ejecutarlo

En tres terminales (o tres configuraciones de IntelliJ):

```bash
cd servicios/servicio-pagos && mvn spring-boot:run    # 8085
cd backend && mvn spring-boot:run                     # 8080
cd frontend && npm run dev                            # 3000
```

Abrir http://localhost:3000. El archivo [`pruebas.http`](pruebas.http) prueba el servicio directamente
desde IntelliJ, antes de pasar por la página.

## Pruebas automáticas

```bash
cd servicios/servicio-pagos && mvn test   # 8 pruebas: clave, registrarPago, confirmación con Wompi simulado, 400/404/409
cd backend && mvn test                    # 19 pruebas: incluye el 503 con el servicio apagado y el webhook
npx newman run tests/security/SEC-01.postman_collection.json   # con las dos aplicaciones encendidas
```

---

## Lo que sigue

- **servicio-notificaciones:** avisar al jugador que la reserva quedó pagada. Si falla, el pago no se
  deshace.
- **servicio-disponibilidad:** hoy la página calcula las horas libres con los horarios y la ocupación;
  esa lógica debe pasar a un servicio para que el frontend no la tenga.
- Base de datos de pagos en su propio Postgres (hoy, H2 en memoria: al apagar el servicio se pierden).

## Lo que simplificamos

- El webhook usa el formato simplificado del sandbox (`{referencia, transactionId, status}`), no el
  evento firmado real de Wompi.
- La clave entre aplicaciones es una sola clave compartida (`PAGOS_API_KEY`); en producción iría por
  variable de entorno y cambiaría por despliegue.
