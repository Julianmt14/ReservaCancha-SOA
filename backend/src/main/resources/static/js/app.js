// Página pública de ReservaCancha: el jugador reserva sin cuenta, con nombre y celular.
// El personal entra por /panel (panel.js). Las utilidades comunes están en comun.js.

const DIAS_A_MOSTRAR = 14;

let sesion = leer('sesion');
let canchas = [];
// Lo que el jugador va eligiendo en la pantalla de reservar
const eleccion = { cancha: null, fecha: null, hora: null, minutos: 60 };
let disponibilidad = null;
let ultimaReserva = null;

// El token del jugador sale de la reserva que hizo en este celular
conexion.token = () => sesion && sesion.token;
conexion.alVencer = () => guardarSesion(null);
conexion.mensajeVencida = 'Tu sesión terminó: vuelve a reservar con tu celular.';

function guardarSesion(s) {
  sesion = s;
  guardar('sesion', s);
  pintarSesion();
}

// ---------- navegación y sesión ----------

function mostrar(vista) {
  document.querySelectorAll('.vista').forEach(v => v.classList.add('oculto'));
  document.getElementById('vista-' + vista).classList.remove('oculto');
  document.querySelectorAll('#menu button').forEach(b => b.classList.toggle('activo', b.dataset.vista === vista));
  document.getElementById('portada').classList.toggle('oculto', vista !== 'reservar');
  if (vista === 'reservar') cargarCanchas();
  if (vista === 'mias') cargarMias();
  window.scrollTo(0, 0);
}

function pintarSesion() {
  document.getElementById('quien').textContent = sesion ? sesion.nombre : '';
  document.querySelectorAll('.solo-sesion').forEach(e => e.classList.toggle('oculto', !sesion));
}

function salir() {
  guardarSesion(null);
  guardar('cliente', null);
  document.getElementById('formDatos').reset();
  mostrar('reservar');
}

// ---------- 1 · canchas ----------

async function cargarCanchas() {
  try {
    canchas = await api('GET', '/canchas');
  } catch (e) { avisar(e.message, 'error'); canchas = []; }
  if (eleccion.cancha) eleccion.cancha = canchas.find(c => c.id === eleccion.cancha.id) || null;
  if (!eleccion.cancha && canchas.length) eleccion.cancha = canchas[0];
  pintarCanchas();
  pintarDias();
  cargarDisponibilidad();
}

function pintarCanchas() {
  const carril = document.getElementById('carrilCanchas');
  carril.innerHTML = '';
  canchas.forEach(c => {
    const div = document.createElement('button');
    div.type = 'button';
    div.className = 'cancha' + (eleccion.cancha && eleccion.cancha.id === c.id ? ' elegida' : '');
    const pct = porcentajeAbono(c);
    div.innerHTML = '<span class="tipo"></span><strong></strong><span class="sub"></span>' +
      '<span class="precio"></span><span class="etiqueta"></span>';
    div.querySelector('.tipo').textContent = c.deporte === 'VOLEY' ? 'Vóley' : 'Fútbol';
    div.querySelector('strong').textContent = c.tipo || c.nombre;
    div.querySelector('.sub').textContent = [c.nombre.split('—')[0].trim(), c.superficie].filter(Boolean).join(' · ');
    div.querySelector('.precio').innerHTML = pesos(c.precioHora) + '<small> /hora</small>';
    const etiqueta = div.querySelector('.etiqueta');
    etiqueta.textContent = pct > 0 ? 'Abono ' + pct + ' %' : 'Sin abono';
    etiqueta.classList.add(pct > 0 ? 'con-abono' : 'sin-abono');
    div.addEventListener('click', () => {
      eleccion.cancha = c;
      pintarCanchas();
      cargarDisponibilidad();
    });
    carril.appendChild(div);
  });
  if (!canchas.length) carril.innerHTML = '<p class="nota">No hay canchas para mostrar.</p>';
}

// ---------- 2 · día ----------

function pintarDias() {
  const caja = document.getElementById('dias');
  caja.innerHTML = '';
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  // Después de las 9 p. m. ya no queda ninguna hora hoy: se empieza por mañana
  if (!eleccion.fecha) {
    const inicio = new Date().getHours() >= 21 ? new Date(hoy.getTime() + 86400000) : hoy;
    eleccion.fecha = isoDe(inicio);
  }
  for (let i = 0; i < DIAS_A_MOSTRAR; i++) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + i);
    const iso = isoDe(d);
    const nombre = i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : DIA_CORTO[d.getDay()];
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip' + (iso === eleccion.fecha ? ' elegida' : '');
    b.innerHTML = '<small></small><b></b><small></small>';
    b.children[0].textContent = nombre;
    b.children[1].textContent = d.getDate();
    b.children[2].textContent = MESES[d.getMonth()];
    b.addEventListener('click', () => {
      eleccion.fecha = iso;
      caja.querySelectorAll('.chip').forEach(x => x.classList.toggle('elegida', x === b));
      cargarDisponibilidad();
    });
    caja.appendChild(b);
  }
}

// ---------- 3 · hora ----------

// Disponibilidad: franjas del Proveedor 1 menos las horas ocupadas del Proveedor 2
async function cargarDisponibilidad() {
  const caja = document.getElementById('horas');
  disponibilidad = null;
  eleccion.hora = null;
  pintarResumen();
  if (!eleccion.cancha || !eleccion.fecha) { caja.innerHTML = ''; return; }
  caja.innerHTML = '<span class="nota">Consultando horas...</span>';
  const pedida = eleccion.cancha.id + '|' + eleccion.fecha;
  cargarDisponibilidad.ultima = pedida;
  try {
    const d = await api('GET', `/disponibilidad?canchaId=${eleccion.cancha.id}&fecha=${eleccion.fecha}`);
    if (cargarDisponibilidad.ultima !== pedida) return; // ya eligieron otra cancha u otro día
    disponibilidad = d;
    pintarHoras();
  } catch (e) {
    caja.innerHTML = '';
    avisar(e.message, 'error');
  }
}

// Todas las horas del día: las libres y las ocupadas (que salen tachadas)
function horasDelDia() {
  const libres = new Set(disponibilidad.libres.map(f => minutosDe(f.inicio)));
  const todas = new Set(libres);
  let cierre = 0;
  disponibilidad.libres.forEach(f => { cierre = Math.max(cierre, minutosDe(f.fin)); });
  disponibilidad.ocupadas.forEach(o => {
    const ini = minutosDe(o.inicio), fin = minutosDe(o.fin);
    for (let m = Math.floor(ini / 60) * 60; m < fin; m += 60) todas.add(m);
    cierre = Math.max(cierre, fin);
  });
  return { libres, todas: [...todas].sort((a, b) => a - b), cierre };
}

// ¿Cabe la duración elegida desde esa hora? Todas las horas que toca deben estar libres
function cabe(inicio, libres, cierre) {
  const fin = inicio + eleccion.minutos;
  if (fin > cierre) return false;
  for (let m = inicio; m < fin; m += 60) if (!libres.has(m)) return false;
  return true;
}

function pintarHoras() {
  const caja = document.getElementById('horas');
  caja.innerHTML = '';
  if (!disponibilidad) return;
  const { libres, todas, cierre } = horasDelDia();
  const ahora = new Date();
  const esHoy = eleccion.fecha === isoDe(ahora);
  const minutoActual = ahora.getHours() * 60 + ahora.getMinutes();
  let alguna = false;
  todas.forEach(m => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = horaBonita(horaDe(m));
    const paso = esHoy && m <= minutoActual;
    if (!libres.has(m)) {
      b.className = 'ocupada';
      b.disabled = true;
      b.title = 'Ocupada';
    } else if (paso) {
      b.className = 'pasada';
      b.disabled = true;
      b.title = 'Ya pasó';
    } else if (!cabe(m, libres, cierre)) {
      b.className = 'no-cabe';
      b.disabled = true;
      b.title = 'No alcanza para ' + document.querySelector('#duracion .activo').textContent;
    } else {
      alguna = true;
      if (eleccion.hora === m) b.className = 'elegida';
      b.addEventListener('click', () => {
        eleccion.hora = m;
        caja.querySelectorAll('button').forEach(x => x.classList.toggle('elegida', x === b));
        pintarResumen();
      });
    }
    caja.appendChild(b);
  });
  if (!todas.length) caja.innerHTML = '<span class="nota">La cancha no abre ese día.</span>';
  else if (!alguna) caja.insertAdjacentHTML('beforeend', '<p class="nota ancho">No quedan horas libres ese día: prueba otro.</p>');
  pintarResumen();
}

function elegirDuracion(b) {
  eleccion.minutos = Number(b.dataset.min);
  document.querySelectorAll('#duracion button').forEach(x => x.classList.toggle('activo', x === b));
  // Si la hora elegida ya no alcanza con la nueva duración, se suelta
  if (disponibilidad && eleccion.hora != null) {
    const { libres, cierre } = horasDelDia();
    if (!cabe(eleccion.hora, libres, cierre)) eleccion.hora = null;
  }
  pintarHoras();
}

// ---------- barra fija con el resumen ----------

function pintarResumen() {
  const texto = document.getElementById('resumenTexto');
  const abono = document.getElementById('resumenAbono');
  const precio = document.getElementById('resumenPrecio');
  const c = eleccion.cancha;
  document.getElementById('btnReservar').disabled = !(c && eleccion.fecha && eleccion.hora != null);
  if (!c || eleccion.hora == null) {
    texto.textContent = c ? 'Elige la hora' : 'Elige cancha, día y hora';
    abono.textContent = '';
    precio.textContent = '';
    return;
  }
  const total = Number(c.precioHora) * eleccion.minutos / 60;
  texto.textContent = `${c.tipo} · ${fechaCorta(eleccion.fecha)} · ${rangoBonito(horaDe(eleccion.hora), horaDe(eleccion.hora + eleccion.minutos))}`;
  abono.textContent = porcentajeAbono(c) > 0
    ? `Abono en línea ${pesos(abonoDe(c, total))} · el resto en la cancha`
    : 'Sin abono: pagas todo en la cancha';
  precio.textContent = pesos(total);
}

// ---------- 4 · reservar sin cuenta ----------

// Operación integrada: la consumidora cotiza en el Proveedor 1 y guarda en el Proveedor 2
async function reservar() {
  const f = document.getElementById('formDatos');
  const nombre = f.nombre.value.trim();
  const celular = limpiarCelular(f.celular.value);
  if (nombre.length < 2) { avisar('Escribe tu nombre.', 'error'); f.nombre.focus(); return; }
  if (!/^3\d{9}$/.test(celular)) {
    avisar('El celular debe tener 10 dígitos y empezar por 3 (ej. 300 123 4567).', 'error');
    f.celular.focus();
    return;
  }
  const cuerpo = {
    nombre, celular,
    canchaId: eleccion.cancha.id,
    fecha: eleccion.fecha,
    horaInicio: horaDe(eleccion.hora),
    horaFin: horaDe(eleccion.hora + eleccion.minutos)
  };
  const btn = document.getElementById('btnReservar');
  btn.disabled = true;
  btn.textContent = 'Reservando...';
  try {
    const r = await api('POST', '/reservas/rapida', cuerpo);
    guardar('cliente', { nombre, celular });
    if (r.whatsapp) guardar('whatsapp', r.whatsapp);
    // El jugador queda con su sesión para ver «Mis reservas»
    guardarSesion(r.sesion);
    mostrarListo(r.reserva);
  } catch (e) {
    avisar(e.message, 'error');
    cargarDisponibilidad();
  } finally {
    btn.textContent = 'Reservar';
  }
}

// ---------- reserva lista ----------

function mostrarListo(r) {
  ultimaReserva = r;
  document.getElementById('listoNumero').textContent = 'Reserva #' + r.id + ' a nombre de ' + (r.usuario ? r.usuario.nombre : '');
  const dl = document.getElementById('listoDetalle');
  dl.innerHTML = '';
  [['Cancha', r.cancha ? r.cancha.nombre : ''],
   ['Día', fechaCorta(r.fecha)],
   ['Hora', rangoBonito(r.horaInicio, r.horaFin)],
   ['Valor', pesos(r.valorTotal)]].forEach(([t, v]) => {
    const dt = document.createElement('dt'); dt.textContent = t;
    const dd = document.createElement('dd'); dd.textContent = v;
    dl.append(dt, dd);
  });
  const abono = abonoDe(r.cancha, r.valorTotal);
  const pago = document.getElementById('listoPago');
  const pagar = document.getElementById('btnListoPagar');
  if (abono > 0) {
    pago.textContent = `Esta cancha pide abono del ${porcentajeAbono(r.cancha)} %: paga ${pesos(abono)} ahora y el resto en la cancha.`;
    pagar.textContent = 'Pagar abono ' + pesos(abono);
    pagar.classList.remove('oculto');
  } else {
    pago.textContent = 'Esta cancha no pide abono: pagas todo en la cancha el día del partido.';
    pagar.classList.add('oculto');
  }
  pintarWhatsapp(document.getElementById('btnListoWhatsapp'), r);
  mostrar('listo');
}

// Botón que abre WhatsApp con el mensaje de confirmación listo para enviar al complejo
function pintarWhatsapp(enlace, r) {
  const numero = leer('whatsapp');
  if (!numero) { enlace.classList.add('oculto'); return; }
  const abono = abonoDe(r.cancha, r.valorTotal);
  const nombre = r.usuario ? r.usuario.nombre : (sesion ? sesion.nombre : '');
  const texto = `Hola, soy ${nombre}. Confirmo mi reserva #${r.id} en Canchas Mónaco: ` +
    `${r.cancha ? r.cancha.nombre : 'cancha ' + r.id}, ${fechaCorta(r.fecha)} de ${rangoBonito(r.horaInicio, r.horaFin)}. ` +
    `Valor ${pesos(r.valorTotal)}` + (abono > 0 ? ` (abono ${pesos(abono)}).` : ', pago en la cancha.');
  enlace.href = 'https://wa.me/' + numero + '?text=' + encodeURIComponent(texto);
  enlace.classList.remove('oculto');
}

// ---------- mis reservas ----------

const ESTADOS = { PENDIENTE: 'Pendiente', CONFIRMADA: 'Confirmada', PAGADA: 'Abono pagado', CANCELADA: 'Cancelada' };

async function cargarMias() {
  const caja = document.getElementById('listaMias');
  caja.innerHTML = '<p class="nota">Cargando...</p>';
  try {
    const lista = await api('GET', '/reservas/mias');
    lista.sort((a, b) => (b.fecha + b.horaInicio).localeCompare(a.fecha + a.horaInicio));
    caja.innerHTML = '';
    lista.forEach(r => caja.appendChild(tarjetaReserva(r)));
    if (!lista.length) caja.innerHTML = '<p class="nota">Aún no tienes reservas.</p>';
  } catch (e) { caja.innerHTML = ''; avisar(e.message, 'error'); }
}

function tarjetaReserva(r) {
  const div = document.createElement('div');
  div.className = 'reserva ' + r.estado;
  const abono = abonoDe(r.cancha, r.valorTotal);
  let estado = ESTADOS[r.estado] || r.estado;
  if (r.estado === 'PENDIENTE') estado = abono > 0 ? 'Falta el abono' : 'Pagas en la cancha';
  div.innerHTML = '<div class="cabeza"><strong></strong><span class="estado"></span></div>' +
    '<div class="cuando"></div><div class="valor"></div><div class="acciones"></div>';
  div.querySelector('strong').textContent = '#' + r.id + ' · ' + (r.cancha ? r.cancha.nombre : '');
  const est = div.querySelector('.estado');
  est.textContent = estado;
  est.classList.add(r.estado === 'PENDIENTE' && abono === 0 ? 'EN_CANCHA' : r.estado);
  div.querySelector('.cuando').textContent = fechaCorta(r.fecha) + ' · ' + rangoBonito(r.horaInicio, r.horaFin);
  div.querySelector('.valor').textContent = 'Valor ' + pesos(r.valorTotal) + (abono > 0 ? ' · abono ' + pesos(abono) : ' · sin abono');
  const acc = div.querySelector('.acciones');
  if (r.estado === 'PENDIENTE' && abono > 0) acc.appendChild(boton('Pagar abono ' + pesos(abono), 'mini', () => pagarReserva(r.id)));
  if (r.estado !== 'CANCELADA') {
    const wa = document.createElement('a');
    wa.className = 'boton mini whatsapp';
    wa.target = '_blank';
    wa.rel = 'noopener';
    wa.textContent = 'WhatsApp';
    pintarWhatsapp(wa, r);
    acc.appendChild(wa);
    acc.appendChild(boton('Cancelar', 'mini sec-peligro', () => cancelarReserva(r.id)));
  }
  return div;
}

// Cancelación lógica: la consumidora llama a PATCH /api/reservas/{id}/estado del Proveedor 2
async function cancelarReserva(id) {
  if (!confirmarEnLinea('¿Cancelar la reserva #' + id + '?')) return;
  try {
    await api('POST', `/reservas/${id}/cancelar`);
    avisar('Reserva #' + id + ' cancelada. La hora quedó libre.');
    cargarMias();
  } catch (e) { avisar(e.message, 'error'); }
}

// ---------- pago del abono con Wompi (modo de pruebas) ----------

// La consumidora registra el pago en servicio-pagos, que devuelve la referencia y la firma de
// integridad; con eso se abre el Widget de Wompi encima de esta página
async function pagarReserva(id) {
  try {
    const i = await api('POST', `/pagos/iniciar/${id}`);
    await cargarWidgetWompi();
    const widget = new WidgetCheckout({
      currency: i.moneda,
      amountInCents: i.valorCentavos,
      reference: i.referencia,
      publicKey: i.llavePublica,
      signature: { integrity: i.firmaIntegridad }
    });
    widget.open(resultado => {
      const t = resultado && resultado.transaction;
      if (t && t.id) confirmarPago(id, t.id);
      else avisar('Se cerró Wompi sin terminar el pago. La reserva sigue pendiente.', 'error');
    });
  } catch (e) { avisar(e.message, 'error'); }
}

function cargarWidgetWompi() {
  if (window.WidgetCheckout) return Promise.resolve();
  return new Promise((listo, falla) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.wompi.co/widget.js';
    s.onload = () => listo();
    s.onerror = () => falla(new Error('No se pudo cargar Wompi: revisa la conexión a internet.'));
    document.head.appendChild(s);
  });
}

// La consumidora verifica la transacción con Wompi a través de servicio-pagos (no se confía en el navegador)
async function confirmarPago(reservaId, transaccion) {
  const ruta = `/pagos/confirmar/${reservaId}?transactionId=${encodeURIComponent(transaccion)}`;
  try {
    let p = await api('POST', ruta);
    for (let intento = 0; p.estado === 'PENDIENTE' && intento < 5; intento++) {
      await new Promise(listo => setTimeout(listo, 3000));
      p = await api('POST', ruta);
    }
    if (p.estado === 'APROBADO') avisar(`Abono aprobado: la reserva #${reservaId} quedó pagada.`);
    else if (p.estado === 'PENDIENTE') avisar(`El pago de la reserva #${reservaId} sigue en proceso en Wompi.`, 'error');
    else avisar(`Wompi no aprobó el pago (${p.estado}). La reserva #${reservaId} sigue pendiente.`, 'error');
  } catch (e) { avisar(e.message, 'error'); }
  mostrar('mias');
}

// ---------- arranque ----------

document.querySelectorAll('#menu button').forEach(b => b.addEventListener('click', () => mostrar(b.dataset.vista)));
document.getElementById('marca').addEventListener('click', () => mostrar('reservar'));
document.getElementById('btnSalir').addEventListener('click', salir);
document.querySelectorAll('#duracion button').forEach(b => b.addEventListener('click', () => elegirDuracion(b)));
document.getElementById('btnReservar').addEventListener('click', reservar);
document.getElementById('formDatos').addEventListener('submit', ev => { ev.preventDefault(); reservar(); });
document.getElementById('btnListoPagar').addEventListener('click', () => pagarReserva(ultimaReserva.id));
document.getElementById('btnListoMias').addEventListener('click', () => mostrar('mias'));
document.getElementById('btnListoOtra').addEventListener('click', () => mostrar('reservar'));

// Nombre y celular de la última reserva en este celular
const cliente = leer('cliente');
if (cliente) {
  document.getElementById('formDatos').nombre.value = cliente.nombre || '';
  document.getElementById('formDatos').celular.value = cliente.celular || '';
}

// Si en este navegador quedó guardada una sesión del personal (versión anterior), no se usa aquí
if (sesion && sesion.rol !== 'JUGADOR') guardarSesion(null);

pintarSesion();
mostrar('reservar');
