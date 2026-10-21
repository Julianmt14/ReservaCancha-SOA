# ReservaCancha - Frontend

Aplicación web responsiva en **Next.js 16** (App Router), **React 19**, **TypeScript** y **Tailwind CSS 4**.
Consume la API REST del backend (`../backend`, puerto 8080).

## Arranque

```bash
cp .env.example .env.local
npm install
npm run dev      # http://localhost:3000
```

Otros comandos: `npm run build`, `npm run start`, `npm run lint`.

## Variables de entorno

| Variable | Uso |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL del backend (por defecto `http://localhost:8080`) |
| `NEXT_PUBLIC_WOMPI_PUBLIC_KEY` | Llave pública de Wompi sandbox (opcional; si falta se usa la del backend) |
| `NEXT_PUBLIC_ESTABLISHMENT_NAME` / `_ADDRESS` | Datos del establecimiento único de la v1.0 |

## Estructura

```
app/            Rutas: login, registro, onboarding y panel (dashboard, reservas, canchas, pagos, torneos)
components/app/ Componentes por módulo (canchas, reservas, pagos, home, dashboard, ui)
lib/api/        Cliente HTTP y adaptadores hacia la API del backend
lib/auth/       Sesión JWT y rutas públicas
lib/context/    Contextos de establecimiento y modales
proxy.ts        Protección de rutas (redirige a /login sin sesión)
```

## Conexión con el backend

La capa `lib/api/` traduce los modelos del backend (`canchas`, `horarios`, `reservas`, `pagos`) a los
tipos que usan las pantallas. El token JWT viaja en el encabezado `Authorization: Bearer`.

- Los roles `ADMIN` y `PROPIETARIO` ven el panel de gestión; `JUGADOR` ve la vista de reservas.
- Las canchas no se eliminan: la baja es lógica (`activa = false`).
- El pago se inicia con `POST /api/pagos/iniciar/{reserva}` y se confirma con `POST /api/pagos/confirmar/{reserva}`,
  que el backend verifica contra Wompi sandbox.

## Cuentas de prueba

El backend crea un administrador al arrancar: `admin@reservacancha.co` / `admin123` (solo desarrollo).
Los jugadores se registran desde `/registro`.
