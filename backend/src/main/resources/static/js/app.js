// Interfaz web de ReservaCancha: todo se pide con fetch a la consumidora (/api en el puerto 8080).
// La consumidora es la única que habla con los proveedores (escenarios :8081 y reservas :8082).

const DIAS = { MONDAY: 'Lunes', TUESDAY: 'Martes', WEDNESDAY: 'Miércoles', THURSDAY: 'Jueves',
  FRIDAY: 'Viernes', SATURDAY: 'Sábado', SUNDAY: 'Domingo' };

let sesion = leerSesion();
let canchas = [];
let canchaElegida = null;
let horaElegida = null;

// ---------- utilidades ----------

function leerSesion() {
  try { return JSON.parse(localStorage.getItem('sesion')); } catch (e) { return null; }
}

function guardarSesion(s) {
  sesion = s;
  try {
    if (s) localStorage.setItem('sesion', JSON.stringify(s)); else localStorage.removeItem('sesion');
  } catch (e) { /* sin almacenamiento: la sesión dura hasta recargar */ }
  pintarSesion();
}

function esAdmin() {
  return sesion && (sesion.rol === 'ADMIN' || sesion.rol === 'PROPIETARIO');
}

// Llama a la consumidora con JSON y el JWT; si responde error, lanza el mensaje que trae el JSON
async function api(metodo, ruta, cuerpo) {
  const cabeceras = { 'Content-Type': 'application/json' };
  if (sesion) cabeceras['Authorization'] = 'Bearer ' + sesion.token;
  let resp;
  try {
    resp = await fetch('/api' + ruta, {
      method: metodo,
      headers: cabeceras,
      body: cuerpo ? JSON.stringify(cuerpo) : undefined
    });
  } catch (e) {
    throw new Error('No hay conexión con la aplicación consumidora (puerto 8080).');
  }
  const texto = await resp.text();
  const datos = texto ? JSON.parse(texto) : null;
  if (!resp.ok) {
    if (resp.status === 401 || resp.status === 403) {
      if (resp.status === 401 && sesion) guardarSesion(null);
      throw new Error((datos && datos.error) || 'Debes ingresar con una cuenta autorizada.');
    }
    let msg = (datos && datos.error) || ('Error ' + resp.status);
    if (datos && datos.detalles) msg += ': ' + datos.detalles.map(d => d.campo + ' ' + d.msg).join(', ');
    throw new Error(msg);
  }
  return datos;
}

function avisar(texto, tipo) {
  const caja = document.getElementById('aviso');
  caja.textContent = texto;
  caja.className = 'aviso ' + (tipo || 'ok');
  clearTimeout(avisar.t);
  avisar.t = setTimeout(() => caja.classList.add('oculto'), 6000);
}

function pesos(valor) {
  return valor == null ? '—' : '$' + Number(valor).toLocaleString('es-CO');
}

function hhmm(h) {
  return h ? String(h).substring(0, 5) : '';
}

function sumarMinutos(hora, minutos) {
  const [h, m] = hora.split(':').map(Number);
  const total = h * 60 + m + minutos;
  return String(Math.floor(total / 60)).padStart(2, '0') + ':' + String(total % 60).padStart(2, '0');
}

function celda(texto) {
  const td = document.createElement('td');
  td.textContent = texto;
  return td;
}

function boton(texto, clase, accion) {
  const b = document.createElement('button');
  b.textContent = texto;
  b.className = clase;
  b.addEventListener('click', accion);
  return b;
}

// ---------- navegación y sesión ----------

function mostrar(vista) {
  document.querySelectorAll('.vista').forEach(v => v.classList.add('oculto'));
  document.getElementById('vista-' + vista).classList.remove('oculto');
  document.querySelectorAll('#menu button').forEach(b => b.classList.toggle('activo', b.dataset.vista === vista));
  if (vista === 'canchas') cargarCanchas();
  if (vista === 'mias') cargarMias();
  if (vista === 'admin') cargarAdmin();
}

function pintarSesion() {
  document.getElementById('quien').textContent = sesion ? sesion.nombre + ' · ' + sesion.rol : '';
  document.querySelectorAll('.solo-sesion').forEach(e => e.classList.toggle('oculto', !sesion));
  document.querySelectorAll('.sin-sesion').forEach(e => e.classList.toggle('oculto', !!sesion));
  document.querySelectorAll('.solo-admin').forEach(e => e.classList.toggle('oculto', !esAdmin()));
}

async function ingresar(ev) {
  ev.preventDefault();
  const f = new FormData(ev.target);
  try {
    const r = await api('POST', '/auth/login', { email: f.get('email'), password: f.get('password') });
    guardarSesion(r);
    avisar('Bienvenido, ' + r.nombre);
    mostrar(esAdmin() ? 'admin' : 'canchas');
  } catch (e) { avisar(e.message, 'error'); }
}

async function registrarse(ev) {
  ev.preventDefault();
  const f = new FormData(ev.target);
  try {
    const r = await api('POST', '/auth/register',
      { nombre: f.get('nombre'), email: f.get('email'), password: f.get('password') });
    guardarSesion(r);
    ev.target.reset();
    avisar('Cuenta creada. Ya puedes reservar.');
    mostrar('canchas');
  } catch (e) { avisar(e.message, 'error'); }
}

// ---------- canchas y disponibilidad ----------

async function cargarCanchas() {
  try {
    canchas = await api('GET', '/canchas');
  } catch (e) { avisar(e.message, 'error'); canchas = []; }
  const filtro = document.getElementById('filtroTipo');
  const tipos = [...new Set(canchas.map(c => c.tipo).filter(Boolean))];
  const actual = filtro.value;
  filtro.innerHTML = '<option value="">Todas</option>' + tipos.map(t => `<option>${t}</option>`).join('');
  filtro.value = tipos.includes(actual) ? actual : '';
  pintarCanchas();
}

function pintarCanchas() {
  const tipo = document.getElementById('filtroTipo').value;
  const lista = document.getElementById('listaCanchas');
  lista.innerHTML = '';
  canchas.filter(c => !tipo || c.tipo === tipo).forEach(c => {
    const div = document.createElement('div');
    div.className = 'cancha' + (canchaElegida && canchaElegida.id === c.id ? ' elegida' : '');
    const reglas = c.reglas || {};
    div.innerHTML = `<strong></strong><div class="detalle"></div><div class="precio"></div>
      <div class="detalle">Mínimo ${reglas.duracionMinimaMin || 60} min · cancelar hasta ${reglas.horasCancelacion ?? 3} h antes</div>`;
    div.querySelector('strong').textContent = c.nombre;
    div.querySelectorAll('.detalle')[0].textContent = [c.tipo, c.superficie].filter(Boolean).join(' · ');
    div.querySelector('.precio').textContent = pesos(c.precioHora) + ' / hora';
    div.addEventListener('click', () => { canchaElegida = c; pintarCanchas(); cargarDisponibilidad(); });
    lista.appendChild(div);
  });
  if (!lista.children.length) lista.innerHTML = '<p class="nota">No hay canchas para mostrar.</p>';
}

// Disponibilidad: franjas del Proveedor 1 menos las horas ocupadas del Proveedor 2
async function cargarDisponibilidad() {
  if (!canchaElegida) return;
  const fecha = document.getElementById('fecha').value;
  const panel = document.getElementById('panelDisponibilidad');
  const caja = document.getElementById('franjas');
  panel.classList.remove('oculto');
  document.getElementById('tituloDisponibilidad').textContent = canchaElegida.nombre + ' · ' + fecha;
  caja.innerHTML = '<span class="nota">Consultando...</span>';
  horaElegida = null;
  document.getElementById('btnReservar').disabled = true;
  try {
    const d = await api('GET', `/disponibilidad?canchaId=${canchaElegida.id}&fecha=${fecha}`);
    caja.innerHTML = '';
    d.libres.forEach(f => {
      const b = boton(hhmm(f.inicio), '', () => {
        horaElegida = hhmm(f.inicio);
        caja.querySelectorAll('button').forEach(x => x.classList.remove('elegida'));
        b.classList.add('elegida');
        document.getElementById('btnReservar').disabled = false;
      });
      caja.appendChild(b);
    });
    if (!d.libres.length) caja.innerHTML = '<span class="nota">No hay horas libres ese día.</span>';
  } catch (e) {
    caja.innerHTML = '';
    avisar(e.message, 'error');
  }
}

// Operación integrada: la consumidora cotiza en el Proveedor 1 y guarda en el Proveedor 2
async function reservar() {
  if (!sesion) { avisar('Ingresa para poder reservar.', 'error'); mostrar('login'); return; }
  const minutos = Number(document.getElementById('duracion').value);
  const cuerpo = {
    canchaId: canchaElegida.id,
    fecha: document.getElementById('fecha').value,
    horaInicio: horaElegida,
    horaFin: sumarMinutos(horaElegida, minutos)
  };
  try {
    const r = await api('POST', '/reservas', cuerpo);
    avisar(`Reserva #${r.id} creada: ${r.cancha.nombre}, ${r.fecha} de ${hhmm(r.horaInicio)} a ${hhmm(r.horaFin)} por ${pesos(r.valorTotal)}.`);
    cargarDisponibilidad();
  } catch (e) { avisar(e.message, 'error'); }
}

// ---------- mis reservas ----------

async function cargarMias() {
  const tbody = document.getElementById('tablaMias');
  tbody.innerHTML = '';
  try {
    const lista = await api('GET', '/reservas/mias');
    pintarReservas(tbody, lista, false);
    if (!lista.length) tbody.innerHTML = '<tr><td colspan="7" class="nota">Aún no tienes reservas.</td></tr>';
  } catch (e) { avisar(e.message, 'error'); }
}

function pintarReservas(tbody, lista, conJugador) {
  lista.forEach(r => {
    const tr = document.createElement('tr');
    tr.appendChild(celda(r.id));
    if (conJugador) tr.appendChild(celda(r.usuario ? r.usuario.nombre : ''));
    tr.appendChild(celda(r.cancha ? r.cancha.nombre : ''));
    tr.appendChild(celda(r.fecha));
    tr.appendChild(celda(hhmm(r.horaInicio) + '–' + hhmm(r.horaFin)));
    if (!conJugador) tr.appendChild(celda(pesos(r.valorTotal)));
    const est = document.createElement('td');
    est.innerHTML = `<span class="estado ${r.estado}">${r.estado}</span>`;
    tr.appendChild(est);
    const acc = document.createElement('td');
    if (!conJugador && r.estado === 'PENDIENTE') acc.appendChild(boton('Pagar', 'mini', () => pagarReserva(r.id)));
    if (r.estado !== 'CANCELADA') acc.appendChild(boton('Cancelar', 'mini peligro', () => cancelarReserva(r.id, conJugador)));
    tr.appendChild(acc);
    tbody.appendChild(tr);
  });
}

// Cancelación lógica: la consumidora llama a PATCH /api/reservas/{id}/estado del Proveedor 2
async function cancelarReserva(id, desdeAdmin) {
  if (!confirmarEnLinea('¿Cancelar la reserva #' + id + '?')) return;
  try {
    await api('POST', `/reservas/${id}/cancelar`);
    avisar('Reserva #' + id + ' cancelada. La hora quedó libre.');
    if (desdeAdmin) cargarAdminReservas(); else cargarMias();
  } catch (e) { avisar(e.message, 'error'); }
}

// ---------- pago con Wompi (modo de pruebas) ----------

// La consumidora registra el pago en servicio-pagos, que devuelve la referencia y la firma de
// integridad; con eso se abre el Widget de Wompi encima de esta página (Wompi no acepta volver
// a una dirección localhost, por eso no se usa la redirección)
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
    if (p.estado === 'APROBADO') avisar(`Pago aprobado: la reserva #${reservaId} quedó PAGADA.`);
    else if (p.estado === 'PENDIENTE') avisar(`El pago de la reserva #${reservaId} sigue en proceso en Wompi.`, 'error');
    else avisar(`Wompi no aprobó el pago (${p.estado}). La reserva #${reservaId} sigue pendiente.`, 'error');
  } catch (e) { avisar(e.message, 'error'); }
  cargarMias();
}

// Pide confirmación con el mismo botón (segundo clic) para no usar ventanas emergentes
function confirmarEnLinea(pregunta) {
  const ahora = Date.now();
  if (confirmarEnLinea.ultima === pregunta && ahora - confirmarEnLinea.t < 4000) {
    confirmarEnLinea.ultima = null;
    return true;
  }
  confirmarEnLinea.ultima = pregunta;
  confirmarEnLinea.t = ahora;
  avisar(pregunta + ' Pulsa otra vez para confirmar.', 'error');
  return false;
}

// ---------- administración ----------

async function cargarAdmin() {
  await cargarCanchas();
  pintarAdminCanchas();
  const sel = document.getElementById('horarioCancha');
  const actual = sel.value;
  sel.innerHTML = canchas.map(c => `<option value="${c.id}">${c.id} · ${c.nombre}</option>`).join('');
  if (canchas.some(c => String(c.id) === actual)) sel.value = actual;
  cargarHorarios();
  cargarAdminReservas();
}

function pintarAdminCanchas() {
  const tbody = document.getElementById('tablaAdminCanchas');
  tbody.innerHTML = '';
  canchas.forEach(c => {
    const tr = document.createElement('tr');
    tr.appendChild(celda(c.id));
    tr.appendChild(celda(c.nombre));
    tr.appendChild(celda(pesos(c.precioHora)));
    const acc = document.createElement('td');
    acc.appendChild(boton('Editar', 'mini sec', () => editarCancha(c)));
    acc.appendChild(document.createTextNode(' '));
    acc.appendChild(boton('Dar de baja', 'mini peligro', () => darDeBaja(c)));
    tr.appendChild(acc);
    tbody.appendChild(tr);
  });
}

function editarCancha(c) {
  const f = document.getElementById('formCancha');
  f.id.value = c.id;
  f.nombre.value = c.nombre;
  f.tipo.value = c.tipo || '';
  f.superficie.value = c.superficie || '';
  f.precioHora.value = c.precioHora;
  document.getElementById('tituloFormCancha').textContent = 'Editar cancha #' + c.id;
  document.getElementById('btnCancelarEdicion').classList.remove('oculto');
}

function limpiarFormCancha() {
  const f = document.getElementById('formCancha');
  f.reset();
  f.id.value = '';
  document.getElementById('tituloFormCancha').textContent = 'Nueva cancha';
  document.getElementById('btnCancelarEdicion').classList.add('oculto');
}

// Crear (POST) o actualizar (PUT) una cancha en el Proveedor 1, con el JWT del administrador
async function guardarCancha(ev) {
  ev.preventDefault();
  const f = ev.target;
  const cuerpo = {
    establecimientoId: 1,
    nombre: f.nombre.value,
    deporte: 'FUTBOL',
    tipo: f.tipo.value,
    superficie: f.superficie.value,
    ubicacion: 'Villavicencio',
    precioHora: Number(f.precioHora.value),
    activa: true
  };
  try {
    if (f.id.value) {
      await api('PUT', '/canchas/' + f.id.value, cuerpo);
      avisar('Cancha actualizada.');
    } else {
      const c = await api('POST', '/canchas', cuerpo);
      avisar('Cancha #' + c.id + ' creada.');
    }
    limpiarFormCancha();
    cargarAdmin();
  } catch (e) { avisar(e.message, 'error'); }
}

// Baja lógica: PUT con activa=false; la cancha deja de listarse pero sus reservas se conservan
async function darDeBaja(c) {
  if (!confirmarEnLinea('¿Dar de baja «' + c.nombre + '»?')) return;
  try {
    await api('PUT', '/canchas/' + c.id, {
      nombre: c.nombre, tipo: c.tipo, superficie: c.superficie, ubicacion: c.ubicacion,
      precioHora: c.precioHora, activa: false
    });
    avisar('«' + c.nombre + '» quedó inactiva.');
    cargarAdmin();
  } catch (e) { avisar(e.message, 'error'); }
}

async function cargarHorarios() {
  const id = document.getElementById('horarioCancha').value;
  const tbody = document.getElementById('tablaHorarios');
  tbody.innerHTML = '';
  if (!id) return;
  try {
    const lista = await api('GET', '/horarios/cancha/' + id);
    lista.forEach(h => {
      const tr = document.createElement('tr');
      tr.appendChild(celda(h.id));
      tr.appendChild(celda(DIAS[h.diaSemana] || h.diaSemana));
      tr.appendChild(celda(hhmm(h.horaApertura)));
      tr.appendChild(celda(hhmm(h.horaCierre)));
      const acc = document.createElement('td');
      acc.appendChild(boton('Eliminar', 'mini peligro', () => eliminarHorario(h.id)));
      tr.appendChild(acc);
      tbody.appendChild(tr);
    });
    if (!lista.length) tbody.innerHTML = '<tr><td colspan="5" class="nota">Sin horarios: la cancha no abre.</td></tr>';
  } catch (e) { avisar(e.message, 'error'); }
}

async function agregarHorario(ev) {
  ev.preventDefault();
  const f = ev.target;
  try {
    await api('POST', '/horarios', {
      canchaId: Number(document.getElementById('horarioCancha').value),
      diaSemana: f.diaSemana.value,
      horaApertura: f.horaApertura.value,
      horaCierre: f.horaCierre.value
    });
    avisar('Horario agregado.');
    cargarHorarios();
  } catch (e) { avisar(e.message, 'error'); }
}

// DELETE /api/horarios/{id}: el Proveedor 1 lo desactiva y deja de contar para las franjas
async function eliminarHorario(id) {
  if (!confirmarEnLinea('¿Eliminar el horario #' + id + '?')) return;
  try {
    await api('DELETE', '/horarios/' + id);
    avisar('Horario #' + id + ' eliminado.');
    cargarHorarios();
  } catch (e) { avisar(e.message, 'error'); }
}

async function cargarAdminReservas() {
  const tbody = document.getElementById('tablaAdminReservas');
  tbody.innerHTML = '';
  try {
    const lista = await api('GET', '/admin/reservas');
    lista.sort((a, b) => b.id - a.id);
    pintarReservas(tbody, lista, true);
    if (!lista.length) tbody.innerHTML = '<tr><td colspan="7" class="nota">No hay reservas.</td></tr>';
  } catch (e) { avisar(e.message, 'error'); }
}

// ---------- arranque ----------

document.querySelectorAll('#menu button').forEach(b => b.addEventListener('click', () => mostrar(b.dataset.vista)));
document.getElementById('btnIngresar').addEventListener('click', () => mostrar('login'));
document.getElementById('btnSalir').addEventListener('click', () => { guardarSesion(null); mostrar('canchas'); });
document.getElementById('formLogin').addEventListener('submit', ingresar);
document.getElementById('formRegistro').addEventListener('submit', registrarse);
document.getElementById('filtroTipo').addEventListener('change', pintarCanchas);
document.getElementById('fecha').addEventListener('change', cargarDisponibilidad);
document.getElementById('btnReservar').addEventListener('click', reservar);
document.getElementById('formCancha').addEventListener('submit', guardarCancha);
document.getElementById('btnCancelarEdicion').addEventListener('click', limpiarFormCancha);
document.getElementById('horarioCancha').addEventListener('change', cargarHorarios);
document.getElementById('formHorario').addEventListener('submit', agregarHorario);

// Fecha por defecto: mañana
const manana = new Date(Date.now() + 86400000);
document.getElementById('fecha').value = manana.getFullYear() + '-' +
  String(manana.getMonth() + 1).padStart(2, '0') + '-' + String(manana.getDate()).padStart(2, '0');

pintarSesion();
mostrar('canchas');

// En el celular cada fila de una tabla se muestra como tarjeta: cada celda lleva el nombre de su columna
function etiquetarCeldas(tabla) {
  const titulos = [...tabla.querySelectorAll('thead th')].map(th => th.textContent);
  tabla.querySelectorAll('tbody tr').forEach(tr =>
    [...tr.children].forEach((td, i) => { if (!td.hasAttribute('colspan')) td.dataset.label = titulos[i] || ''; }));
}
document.querySelectorAll('table.tabla').forEach(tabla => {
  etiquetarCeldas(tabla);
  new MutationObserver(() => etiquetarCeldas(tabla)).observe(tabla.tBodies[0], { childList: true });
});
