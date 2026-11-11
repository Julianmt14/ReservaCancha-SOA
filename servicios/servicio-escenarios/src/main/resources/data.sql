-- DML: semilla del Proveedor 1 (base nueva, por eso los id salen 1, 2, 3...).
-- Cada INSERT revisa antes si el dato ya está: la base se guarda en archivo y este script corre en
-- cada arranque, así que la segunda vez no inserta nada y se conservan los cambios del administrador.

-- Establecimiento 1: Canchas Mónaco (Villavicencio)
INSERT INTO establecimientos (nombre, direccion, ciudad, telefono, activo)
SELECT 'Canchas Mónaco', 'Villavicencio, Meta', 'Villavicencio', '+57 300 000 0000', TRUE
WHERE NOT EXISTS (SELECT 1 FROM establecimientos WHERE id = 1);

-- Las 3 canchas de Mónaco. Reglas: reserva mínima 60 min y cancelación hasta 3 h antes.
-- Vóley playa no pide abono (se paga en la cancha); las de fútbol piden abono del 50 %
INSERT INTO canchas (establecimiento_id, nombre, deporte, tipo, superficie, ubicacion, precio_hora,
                     duracion_minima_min, horas_cancelacion, porcentaje_abono, activa)
SELECT 1, 'Cancha 1 — Vóley playa', 'VOLEY', 'Vóley playa', 'Arena', 'Villavicencio', 60000.00,
        60, 3, 0, TRUE
WHERE NOT EXISTS (SELECT 1 FROM canchas WHERE id = 1);
INSERT INTO canchas (establecimiento_id, nombre, deporte, tipo, superficie, ubicacion, precio_hora,
                     duracion_minima_min, horas_cancelacion, porcentaje_abono, activa)
SELECT 1, 'Cancha 2 — Fútbol 7', 'FUTBOL', 'Fútbol 7', 'Sintética', 'Villavicencio', 90000.00,
        60, 3, 50, TRUE
WHERE NOT EXISTS (SELECT 1 FROM canchas WHERE id = 2);
INSERT INTO canchas (establecimiento_id, nombre, deporte, tipo, superficie, ubicacion, precio_hora,
                     duracion_minima_min, horas_cancelacion, porcentaje_abono, activa)
SELECT 1, 'Cancha 3 — Fútbol 9', 'FUTBOL', 'Fútbol 9', 'Sintética', 'Villavicencio', 120000.00,
        60, 3, 50, TRUE
WHERE NOT EXISTS (SELECT 1 FROM canchas WHERE id = 3);

-- Horarios: las 3 canchas abren los 7 días de 14:00 a 22:00 (id 1-7 cancha 1, 8-14 cancha 2, 15-21 cancha 3)
INSERT INTO horarios (cancha_id, dia_semana, hora_apertura, hora_cierre, activo)
SELECT * FROM (VALUES
  (1, 'MONDAY',    '14:00:00', '22:00:00', TRUE),
  (1, 'TUESDAY',   '14:00:00', '22:00:00', TRUE),
  (1, 'WEDNESDAY', '14:00:00', '22:00:00', TRUE),
  (1, 'THURSDAY',  '14:00:00', '22:00:00', TRUE),
  (1, 'FRIDAY',    '14:00:00', '22:00:00', TRUE),
  (1, 'SATURDAY',  '14:00:00', '22:00:00', TRUE),
  (1, 'SUNDAY',    '14:00:00', '22:00:00', TRUE),
  (2, 'MONDAY',    '14:00:00', '22:00:00', TRUE),
  (2, 'TUESDAY',   '14:00:00', '22:00:00', TRUE),
  (2, 'WEDNESDAY', '14:00:00', '22:00:00', TRUE),
  (2, 'THURSDAY',  '14:00:00', '22:00:00', TRUE),
  (2, 'FRIDAY',    '14:00:00', '22:00:00', TRUE),
  (2, 'SATURDAY',  '14:00:00', '22:00:00', TRUE),
  (2, 'SUNDAY',    '14:00:00', '22:00:00', TRUE),
  (3, 'MONDAY',    '14:00:00', '22:00:00', TRUE),
  (3, 'TUESDAY',   '14:00:00', '22:00:00', TRUE),
  (3, 'WEDNESDAY', '14:00:00', '22:00:00', TRUE),
  (3, 'THURSDAY',  '14:00:00', '22:00:00', TRUE),
  (3, 'FRIDAY',    '14:00:00', '22:00:00', TRUE),
  (3, 'SATURDAY',  '14:00:00', '22:00:00', TRUE),
  (3, 'SUNDAY',    '14:00:00', '22:00:00', TRUE)
) AS v (cancha_id, dia_semana, hora_apertura, hora_cierre, activo)
WHERE NOT EXISTS (SELECT 1 FROM horarios WHERE cancha_id IN (1, 2, 3));
