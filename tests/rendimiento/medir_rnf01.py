"""Medición de RNF-01: tiempo de respuesta de las consultas habituales de disponibilidad y reservas.

10 peticiones por consulta contra el backend (por defecto http://localhost:8080), después de una de calentamiento.
Crea un jugador de prueba con correo *@rnf01.test. Uso: python tests/rendimiento/medir_rnf01.py [baseUrl]
"""
import json
import statistics
import sys
import time
import urllib.request
from datetime import date, timedelta

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8080").rstrip("/") + "/api"
N = 10


def pedir(metodo, ruta, token=None, cuerpo=None):
    req = urllib.request.Request(BASE + ruta, method=metodo,
                                 data=json.dumps(cuerpo).encode() if cuerpo is not None else None)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", "Bearer " + token)
    t0 = time.perf_counter()
    with urllib.request.urlopen(req) as r:
        datos = r.read()
    return time.perf_counter() - t0, (json.loads(datos) if datos else None)


# Esperar a que el backend responda
for _ in range(90):
    try:
        _, canchas = pedir("GET", "/canchas")
        break
    except Exception:
        time.sleep(2)
else:
    sys.exit("el backend no respondió")

correo = f"jugador-{int(time.time())}@rnf01.test"
_, sesion = pedir("POST", "/auth/register",
                  cuerpo={"nombre": "Jugador RNF-01", "email": correo, "password": "clave-rnf01", "rol": "JUGADOR"})
token = sesion["token"]
cancha = canchas[0]["id"]
manana = (date.today() + timedelta(days=1)).isoformat()

consultas = {
    f"Disponibilidad (GET /api/disponibilidad?canchaId={cancha}&fecha=...)":
        lambda: pedir("GET", f"/disponibilidad?canchaId={cancha}&fecha={manana}")[0],
    "Mis reservas (GET /api/reservas/mias)": lambda: pedir("GET", "/reservas/mias", token)[0],
    f"Ocupación de la cancha (GET /api/reservas/cancha/{cancha})":
        lambda: pedir("GET", f"/reservas/cancha/{cancha}", token)[0],
}
resultados = {}
for nombre, fn in consultas.items():
    fn()  # calentamiento
    tiempos = [fn() for _ in range(N)]
    resultados[nombre] = {"promedio": round(statistics.mean(tiempos), 4), "maximo": round(max(tiempos), 4),
                          "minimo": round(min(tiempos), 4), "n": N, "cumple": max(tiempos) < 2.0}

print(json.dumps(resultados, ensure_ascii=False, indent=2))
