# Pruebas de seguridad SEC-01

Meta SEC-01: **0 accesos no autorizados exitosos** a recursos o endpoints protegidos.
Instrumento: Postman/Newman con tokens y roles válidos e inválidos.

## Ejecutar

Con el backend en `http://localhost:8080` y servicio-pagos en `http://localhost:8085` (el control
positivo de pagos del grupo 8 lo necesita; los casos negativos se cortan antes, en el backend):

```bash
npx newman run tests/security/SEC-01.postman_collection.json
```

Otra URL: `--env-var baseUrl=https://mi-servidor`. Los usuarios de prueba se crean solos en cada corrida
(correos `*@sec01.test`) y la reserva de prueba se cancela al final.

## Qué cubre

| Grupo | Escenario | Resultado esperado |
|---|---|---|
| 1 | Endpoints protegidos sin token | 401/403 |
| 2 | Token con texto aleatorio, firma falsa o mal formado | 401/403 |
| 3 | Jugador sobre rutas de administración y gestión | 403 |
| 4 | Registro público pidiendo rol `ADMIN` | 403 y la cuenta no existe |
| 5 | Jugador B sobre pagos y reserva del jugador A | 403 |
| 6 | Webhook de Wompi sin secreto o con secreto incorrecto | 401 |
| 7 | Respuestas sin hash de contraseña ni nombres de otros jugadores | cuerpo limpio |
| 8 | Controles positivos (el acceso legítimo sigue funcionando) | 200 |

Cada caso negativo falla si la API responde 2xx: esa respuesta sería un acceso no autorizado.
Umbral de aceptación: **0 fallos**.

## Hallazgos que motivaron correcciones

- El inicio de sesión desbordaba la pila (`StackOverflowError`) por un `AuthenticationManager` circular.
- Las respuestas de reservas incluían el hash de contraseña del usuario.
- El registro público aceptaba `rol: ADMIN`.
- Cualquier usuario autenticado podía iniciar o consultar pagos de reservas ajenas.
- El webhook de Wompi aceptaba cualquier llamada sin autenticar.
