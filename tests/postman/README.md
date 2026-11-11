# Pruebas con Postman: dos proveedores y la consumidora

Colección [`ReservaCancha-SOA.postman_collection.json`](ReservaCancha-SOA.postman_collection.json) (Postman v2.1)
con el entorno [`local.postman_environment.json`](local.postman_environment.json). Prueba cada proveedor por
separado y después la consumidora, que los integra. Contrato completo en [`servicios/README.md`](../../servicios/README.md).

| Variable | Valor | Quién la llena |
|---|---|---|
| `consumidora` | http://localhost:8080 | el entorno |
| `escenarios` | http://localhost:8081 | el entorno |
| `reservas` | http://localhost:8082 | el entorno |
| `apiKey` | `clave-dev-portal-reservacancha` | el entorno (la misma `RESERVAS_API_KEY` del proveedor 2) |
| `fecha` | hoy + 5 días (`YYYY-MM-DD`) | el *pre-request* de la colección, antes de cada petición |
| `tokenAdmin`, `tokenJugador`, `jugadorId` | JWT y id | los logins de la carpeta 3 |
| `tokenEmpleado`, `empleadoId`, `empleadoEmail` | JWT, id y correo del empleado creado | carpeta 6 |
| `reservaDirectaId`, `reservaDirecta2Id` | id en servicio-reservas | carpeta 2 |
| `reservaId`, `canchaNuevaId` | id de la reserva y de la cancha creadas por la consumidora | carpeta 3 |

## Ejecutar

Con las tres aplicaciones encendidas (ver [cómo ejecutarlas](../../servicios/README.md#cómo-ejecutarlo)), desde la raíz del repo:

```bash
npx newman run tests/postman/ReservaCancha-SOA.postman_collection.json \
  -e tests/postman/local.postman_environment.json \
  --folder "0 · Salud" \
  --folder "1 · Proveedor 1 (escenarios)" \
  --folder "2 · Proveedor 2 (reservas)" \
  --folder "3 · Consumidora" \
  --folder "5 · CRUD: eliminar y baja lógica" \
  --folder "6 · Personal: empleados y administrador"
```

No correr la colección entera sin `--folder`: la carpeta 4 espera un proveedor apagado y, con todo
encendido, sus pruebas fallan. En Postman: *Import* de los dos archivos, elegir el entorno «ReservaCancha SOA - local»
y usar el *Runner* sobre las carpetas 0 a 3, 5 y 6.

Se puede repetir sin reiniciar: cada carpeta cancela las reservas que crea (los bloques quedan libres) y da
de baja la cancha de prueba.

## Qué prueba cada carpeta

| Carpeta | Peticiones | Pruebas | Qué demuestra |
|---|---|---|---|
| 0 · Salud | 2 | 6 | `GET /api/ping` de los dos proveedores, público |
| 1 · Proveedor 1 (escenarios) | 9 | 27 | canchas, una cancha, 404 «Cancha no existe», horarios 14:00–22:00 los 7 días, 8 franjas de 1 h, cotización (60 000 y sin abono en vóley playa), 400 fuera de horario y por menos de 60 min, escritura sin JWT → 401 |
| 2 · Proveedor 2 (reservas) | 13 | 21 | sin `X-Api-Key` o con clave errada → 401, crear directo → 201, misma hora y traslape parcial → 409 (doble reserva), horas que no son :00/:30 → 400, ocupación, cancelar con `PATCH` → la hora se libera y se puede volver a reservar, cancelar dos veces → 409 |
| 3 · Consumidora | 17 | 36 | login admin y jugador, canchas (del P1), disponibilidad (franjas P1 − ocupación P2), reserva con JWT de jugador valorada por el P1, misma reserva → 409, mis reservas, sin token o token inválido → 401/403, cancha con jugador → 403, cancha con admin → creada en el P1 con el JWT reenviado, cancelar y ver la hora libre otra vez |
| 5 · CRUD: eliminar y baja lógica | 14 | 24 | cierra el CRUD: crear cancha y horario, editar el horario (`PUT`), eliminarlo (`DELETE /api/horarios/{id}`; sin token → 401/403) y ver que ya no aparece; dar de baja la cancha (`PUT` con `activa=false`): deja de listarse pero el Proveedor 1 la conserva; reserva cancelada con `PATCH /api/reservas/{id}/estado` que se conserva como historial |
| 6 · Personal: empleados y administrador | 16 | 25 | registrarse como PROPIETARIO o EMPLEADO → 403 (el registro es solo para jugadores); el administrador crea un empleado → 201 y el mismo correo → 409; el empleado entra y ve la agenda (`GET /api/admin/reservas`) pero métricas, crear empleados y crear canchas → 403; métricas del administrador (ocupación por cancha entre 0 y 100) y rango al revés → 400; lista del personal sin jugadores; desactivar al empleado: ya no entra (401) y su token anterior deja de servir |
| 4 · Proveedor detenido (manual) | 7 | 11 | 4a: con servicio-escenarios apagado, crear reserva → 503 «No se pudo verificar la cancha: el servicio de escenarios no responde. La reserva no se creó.» y servicio-reservas confirma que no quedó nada. 4b: con servicio-reservas apagado, las canchas siguen (200) pero disponibilidad y mis reservas → 503 |

Total: 78 peticiones y 150 pruebas (71 peticiones y 139 pruebas en la corrida automática 0–3, 5 y 6).

### Carpeta 4, paso a paso

1. Correr la carpeta 3 (deja `tokenJugador` en el entorno; la 4 también hace su propio login).
2. Detener **solo** servicio-escenarios (Ctrl+C en su terminal) y correr
   `--folder "4a · servicio-escenarios apagado"`.
3. Encenderlo de nuevo, detener **solo** servicio-reservas y correr `--folder "4b · servicio-reservas apagado"`.
4. Encender servicio-reservas otra vez. Su base está en archivo (`datos/`), así que conserva las reservas.
