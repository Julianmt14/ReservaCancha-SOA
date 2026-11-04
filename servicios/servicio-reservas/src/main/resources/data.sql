-- DML del Proveedor 2 · servicio-reservas.
-- Sin semilla: las reservas nacen solo cuando la consumidora las crea con POST /api/reservas.
-- (Las canchas y los usuarios viven en el Proveedor 1 y en la consumidora, no aquí.)
--
-- Spring no acepta un data.sql vacío, así que al arrancar se deja una regla de consistencia
-- idempotente: un bloque solo puede pertenecer a una reserva activa (las canceladas no ocupan).
DELETE FROM bloques_reservados
WHERE reserva_id IN (SELECT id FROM reservas WHERE estado = 'CANCELADA');
