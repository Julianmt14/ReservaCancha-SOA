# Medición de RNF-01 (eficiencia de desempeño)

Meta RNF-01: las consultas habituales de disponibilidad y reservas responden en **menos de 2,0 s**.
Este script mide tres consultas con 10 peticiones cada una, después de una de calentamiento. Crea un jugador de
prueba con correo `*@rnf01.test`.

```bash
cd backend && mvn spring-boot:run      # en otra terminal
python tests/rendimiento/medir_rnf01.py            # o: python tests/rendimiento/medir_rnf01.py https://mi-servidor
```

| Consulta | Promedio | Máximo |
|---|---|---|
| Disponibilidad (`GET /api/disponibilidad`) | 0,022 s | 0,031 s |
| Mis reservas (`GET /api/reservas/mias`) | 0,012 s | 0,013 s |
| Ocupación de la cancha (`GET /api/reservas/cancha/{id}`) | 0,011 s | 0,016 s |

Medición del 8 de octubre de 2026 en local, con H2 en memoria y los datos semilla. Cumple el umbral. El instrumento
de la ficha es JMeter: falta repetir la medición con JMeter en el ambiente de prueba (issue #16).
