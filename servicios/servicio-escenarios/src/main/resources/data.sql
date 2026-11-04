-- DML: semilla del Proveedor 1 (base nueva, por eso los id salen 1, 2, 3...).

-- Establecimiento 1 (simulado)
INSERT INTO establecimientos (nombre, direccion, ciudad, telefono, activo)
VALUES ('ReservaCancha Villavicencio', 'Dirección simulada', 'Villavicencio', '+57 300 000 0000', TRUE);

-- Canchas 1 y 2. Reglas: reserva mínima 60 min, cancelación hasta 3 h antes, abono del 50 %
INSERT INTO canchas (establecimiento_id, nombre, deporte, tipo, superficie, ubicacion, precio_hora,
                     duracion_minima_min, horas_cancelacion, porcentaje_abono, activa)
VALUES (1, 'Cancha 1 — Sintética F5', 'FUTBOL', 'Fútbol 5', 'Sintética', 'Villavicencio', 60000.00,
        60, 3, 50, TRUE);
INSERT INTO canchas (establecimiento_id, nombre, deporte, tipo, superficie, ubicacion, precio_hora,
                     duracion_minima_min, horas_cancelacion, porcentaje_abono, activa)
VALUES (1, 'Cancha 2 — Sintética F8', 'FUTBOL', 'Fútbol 8', 'Sintética', 'Villavicencio', 90000.00,
        60, 3, 50, TRUE);

-- Horarios de las canchas 1 y 2: abren los 7 días de 06:00 a 22:00 (id 1-7 cancha 1, id 8-14 cancha 2)
INSERT INTO horarios (cancha_id, dia_semana, hora_apertura, hora_cierre, activo) VALUES
  (1, 'MONDAY',    '06:00:00', '22:00:00', TRUE),
  (1, 'TUESDAY',   '06:00:00', '22:00:00', TRUE),
  (1, 'WEDNESDAY', '06:00:00', '22:00:00', TRUE),
  (1, 'THURSDAY',  '06:00:00', '22:00:00', TRUE),
  (1, 'FRIDAY',    '06:00:00', '22:00:00', TRUE),
  (1, 'SATURDAY',  '06:00:00', '22:00:00', TRUE),
  (1, 'SUNDAY',    '06:00:00', '22:00:00', TRUE),
  (2, 'MONDAY',    '06:00:00', '22:00:00', TRUE),
  (2, 'TUESDAY',   '06:00:00', '22:00:00', TRUE),
  (2, 'WEDNESDAY', '06:00:00', '22:00:00', TRUE),
  (2, 'THURSDAY',  '06:00:00', '22:00:00', TRUE),
  (2, 'FRIDAY',    '06:00:00', '22:00:00', TRUE),
  (2, 'SATURDAY',  '06:00:00', '22:00:00', TRUE),
  (2, 'SUNDAY',    '06:00:00', '22:00:00', TRUE);

-- Canchas 3 a 6: más casos para el filtro y la disponibilidad (precios, horarios y reglas distintos)
INSERT INTO canchas (establecimiento_id, nombre, deporte, tipo, superficie, ubicacion, precio_hora,
                     duracion_minima_min, horas_cancelacion, porcentaje_abono, activa)
VALUES (1, 'Cancha 3 — Sintética F6', 'FUTBOL', 'Fútbol 6', 'Sintética', 'Villavicencio', 75000.00,
        60, 3, 50, TRUE);
INSERT INTO canchas (establecimiento_id, nombre, deporte, tipo, superficie, ubicacion, precio_hora,
                     duracion_minima_min, horas_cancelacion, porcentaje_abono, activa)
VALUES (1, 'Cancha 4 — Techada F5', 'FUTBOL', 'Fútbol 5', 'Sintética techada', 'Villavicencio', 70000.00,
        60, 6, 30, TRUE);
INSERT INTO canchas (establecimiento_id, nombre, deporte, tipo, superficie, ubicacion, precio_hora,
                     duracion_minima_min, horas_cancelacion, porcentaje_abono, activa)
VALUES (1, 'Cancha 5 — Grama natural F11', 'FUTBOL', 'Fútbol 11', 'Grama natural', 'Villavicencio', 180000.00,
        60, 24, 50, TRUE);
INSERT INTO canchas (establecimiento_id, nombre, deporte, tipo, superficie, ubicacion, precio_hora,
                     duracion_minima_min, horas_cancelacion, porcentaje_abono, activa)
VALUES (1, 'Cancha 6 — Sintética F7', 'FUTBOL', 'Fútbol 7', 'Sintética', 'Villavicencio', 80000.00,
        60, 3, 50, TRUE);

-- Cancha 3: todos los días de 08:00 a 22:00
-- Cancha 4: lunes a sábado de 06:00 a 23:00; domingo cerrada
-- Cancha 5: sin luz artificial, de 07:00 a 18:00; el sábado y el domingo abre a las 06:00
-- Cancha 6: lunes a viernes de 16:00 a 23:00; sábado y domingo de 08:00 a 20:00
INSERT INTO horarios (cancha_id, dia_semana, hora_apertura, hora_cierre, activo) VALUES
  (3, 'MONDAY',    '08:00:00', '22:00:00', TRUE),
  (3, 'TUESDAY',   '08:00:00', '22:00:00', TRUE),
  (3, 'WEDNESDAY', '08:00:00', '22:00:00', TRUE),
  (3, 'THURSDAY',  '08:00:00', '22:00:00', TRUE),
  (3, 'FRIDAY',    '08:00:00', '22:00:00', TRUE),
  (3, 'SATURDAY',  '08:00:00', '22:00:00', TRUE),
  (3, 'SUNDAY',    '08:00:00', '22:00:00', TRUE),
  (4, 'MONDAY',    '06:00:00', '23:00:00', TRUE),
  (4, 'TUESDAY',   '06:00:00', '23:00:00', TRUE),
  (4, 'WEDNESDAY', '06:00:00', '23:00:00', TRUE),
  (4, 'THURSDAY',  '06:00:00', '23:00:00', TRUE),
  (4, 'FRIDAY',    '06:00:00', '23:00:00', TRUE),
  (4, 'SATURDAY',  '06:00:00', '23:00:00', TRUE),
  (5, 'MONDAY',    '07:00:00', '18:00:00', TRUE),
  (5, 'TUESDAY',   '07:00:00', '18:00:00', TRUE),
  (5, 'WEDNESDAY', '07:00:00', '18:00:00', TRUE),
  (5, 'THURSDAY',  '07:00:00', '18:00:00', TRUE),
  (5, 'FRIDAY',    '07:00:00', '18:00:00', TRUE),
  (5, 'SATURDAY',  '06:00:00', '18:00:00', TRUE),
  (5, 'SUNDAY',    '06:00:00', '18:00:00', TRUE),
  (6, 'MONDAY',    '16:00:00', '23:00:00', TRUE),
  (6, 'TUESDAY',   '16:00:00', '23:00:00', TRUE),
  (6, 'WEDNESDAY', '16:00:00', '23:00:00', TRUE),
  (6, 'THURSDAY',  '16:00:00', '23:00:00', TRUE),
  (6, 'FRIDAY',    '16:00:00', '23:00:00', TRUE),
  (6, 'SATURDAY',  '08:00:00', '20:00:00', TRUE),
  (6, 'SUNDAY',    '08:00:00', '20:00:00', TRUE);
