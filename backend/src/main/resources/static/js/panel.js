// Panel del personal de Canchas Mónaco (/panel). Empleado: agenda, reserva por teléfono y cancelar.
// Administrador (o dueño): además métricas, canchas y horarios, y las cuentas de los empleados.

const ROLES = { ADMIN: 'Administrador', PROPIETARIO: 'Dueño', EMPLEADO: 'Empleado' };
const ABRE = 14, CIERRA = 22; // horario de Mónaco: 2:00 a 10:00 p. m.

let personal = leer('personal');
let canchas = [];
let reservas = [];
let fechaAgenda = isoDe(new Date());
let telHoras = 1;

conexion.token = () => personal && personal.token;
conexion.alVencer = () => { guardarPersonal(null); mostrar('login'); };
conexion.mensajeVencida = 'Tu sesión terminó o tu cuenta fue desactivada. Vuelve a ingresar.';

function esAdmin() {
  return personal && (personal.rol === 'ADMIN' || personal.rol === 'PROPIETARIO');
}

function guardarPersonal(p) {
  personal = p;
  guardar('personal', p);
  pintarSesion();
}

function pintarSesion() {
  document.getElementById('quien').textContent = personal ? personal.nombre : '';
  const rol = document.getElementById('rol');
  rol.textContent = personal ? ROLES[personal.rol] || personal.rol : '';
  rol.classList.toggle('oculto', !personal);
  document.querySelectorAll('.solo-personal').forEach(e => e.classList.toggle('oculto', !personal));
  document.querySelectorAll('.solo-admin').forEach(e => e.classList.toggle('oculto', !esAdmin()));
}

function mostrar(vista) {
  if (!personal) vista = 'login';
  if (!esAdmin() && ['metricas', 'canchas', 'empleados'].includes(vista)) vista = 'agenda';
  document.querySelectorAll('.vista').forEach(v => v.classList.add('oculto'));
  document.getElementById('vista-' + vista).classList.remove('oculto');
  document.querySelectorAll('#menu button').forEach(b => b.classList.toggle('activo', b.dataset.vista === vista));
  if (vista === 'agenda') cargarAgenda();
  if (vista === 'telefono') prepararTelefono();
  if (vista === 'metricas') cargarMetricas();
  if (vista === 'canchas') cargarCanchasAdmin();
  if (vista === 'empleados') cargarEmpleados();
  window.scrollTo(0, 0);
}

// Solo el personal entra al panel: una cuenta de jugador no se guarda aquí
async function ingresar(ev) {
  ev.preventDefault();
  const f = new FormData(ev.target);
  try {
    const r = await api('POST', '/auth/login', { email: f.get('email'), password: f.get('password') });
    if (!ROLES[r.rol]) { avisar('Esta cuenta no es del personal de la cancha.', 'error'); return; }
    guardarPersonal(r);
    ev.target.reset();
    avisar('Bienvenido, ' + r.nombre + ' (' + ROLES[r.rol] + ')');
    mostrar('agenda');
  } catch (e) { avisar(e.message, 'error'); }
}

function salir() {
  guardarPersonal(null);
  mostrar('login');
}

// Estado del pago tal como lo ve el personal
function estadoPago(r) {
  if (r.estado === 'CANCELADA') return { texto: 'Cancelada', clase: 'CANCELADA' };
  if (r.estado === 'PAGADA') return { texto: 'Abono pagado', clase: 'PAGADA' };
  return abonoDe(r.cancha, r.valorTotal) > 0
    ? { texto: 'Falta el abono', clase: 'PENDIENTE' }
    : { texto: 'Paga en la cancha', clase: 'EN_CANCHA' };
}

// Lo que falta cobrar el día del partido
function porCobrar(r) {
  if (r.estado === 'CANCELADA') return 0;
  const total = Number(r.valorTotal);
  return r.estado === 'PAGADA' ? total - abonoDe(r.cancha, total) : total;
}

function chipEstado(r) {
  const e = estadoPago(r);
  const s = document.createElement('span');
  s.className = 'estado ' + e.clase;
  s.textContent = e.texto;
  return s;
}

async function cancelar(id) {
  if (!confirmarEnLinea('¿Cancelar la reserva #' + id + '?')) return;
  try {
    await api('POST', `/reservas/${id}/cancelar`);
    avisar('Reserva #' + id + ' cancelada. La hora quedó libre.');
    cargarAgenda();
  } catch (e) { avisar(e.message, 'error'); }
}

// ---------- agenda ----------

async function cargarAgenda() {
  document.getElementById('agendaFecha').value = fechaAgenda;
  try {
    [canchas, reservas] = await Promise.all([api('GET', '/canchas'), api('GET', '/admin/reservas')]);
  } catch (e) { avisar(e.message, 'error'); return; }
  pintarAgenda();
  pintarTabla();
}

function pintarAgenda() {
  const delDia = reservas.filter(r => r.fecha === fechaAgenda && r.estado !== 'CANCELADA');
  document.getElementById('agendaTitulo').textContent =
    (fechaAgenda === isoDe(new Date()) ? 'Hoy, ' : '') + fechaCorta(fechaAgenda) + ' · toca una hora libre para reservar por teléfono';

  const horas = delDia.reduce((s, r) => s + (minutosDe(r.horaFin) - minutosDe(r.horaInicio)) / 60, 0);
  const pagados = delDia.filter(r => r.estado === 'PAGADA').length;
  const cifras = [
    ['Reservas', delDia.length],
    ['Horas ocupadas', horas],
    ['Abonos pagados', pagados],
    ['Por cobrar en la cancha', pesos(delDia.reduce((s, r) => s + porCobrar(r), 0))]
  ];
  document.getElementById('agendaCifras').innerHTML = cifras
    .map(([t, v]) => `<div class="cifra"><b>${v}</b><small>${t}</small></div>`).join('');

  // Grilla: una columna por cancha y una fila por hora; una reserva de 2 h ocupa dos filas
  const g = document.getElementById('agendaGrilla');
  g.innerHTML = '';
  let abre = ABRE, cierra = CIERRA;
  delDia.forEach(r => {
    abre = Math.min(abre, Math.floor(minutosDe(r.horaInicio) / 60));
    cierra = Math.max(cierra, Math.ceil(minutosDe(r.horaFin) / 60));
  });
  const angosto = window.innerWidth < 720;
  g.style.gridTemplateColumns = `${angosto ? 44 : 64}px repeat(${canchas.length}, minmax(${angosto ? 150 : 170}px, 1fr))`;
  const poner = (el, fila, col, filas) => {
    el.style.gridRow = filas > 1 ? `${fila} / span ${filas}` : String(fila);
    el.style.gridColumn = String(col);
    g.appendChild(el);
  };
  canchas.forEach((c, i) => {
    const t = document.createElement('div');
    t.className = 'g-cancha';
    t.innerHTML = '<b></b><small></small>';
    t.querySelector('b').textContent = c.tipo || c.nombre;
    t.querySelector('small').textContent = c.nombre.split('—')[0].trim() +
      (porcentajeAbono(c) > 0 ? ' · abono ' + porcentajeAbono(c) + ' %' : ' · sin abono');
    poner(t, 1, i + 2, 1);
  });
  const ahora = new Date();
  for (let h = abre; h < cierra; h++) {
    const fila = h - abre + 2;
    const et = document.createElement('div');
    et.className = 'g-hora';
    et.textContent = horaBonita(horaDe(h * 60)).replace(':00', '');
    poner(et, fila, 1, 1);
  }
  canchas.forEach((c, i) => {
    const ocupadas = new Set();
    delDia.filter(r => r.cancha && r.cancha.id === c.id).forEach(r => {
      const ini = Math.floor(minutosDe(r.horaInicio) / 60);
      const filas = Math.max(1, Math.ceil((minutosDe(r.horaFin) - minutosDe(r.horaInicio)) / 60));
      for (let k = 0; k < filas; k++) ocupadas.add(ini + k);
      const card = document.createElement('div');
      card.className = 'g-reserva ' + estadoPago(r).clase;
      card.innerHTML = '<div class="g-cab"><b></b><span class="g-num"></span></div><a class="g-cel"></a>' +
        '<div class="g-pie"></div>';
      card.querySelector('b').textContent = r.usuario ? r.usuario.nombre : 'Jugador';
      card.querySelector('.g-num').textContent = '#' + r.id + ' · ' + rangoBonito(r.horaInicio, r.horaFin);
      const cel = r.usuario && r.usuario.celular;
      const a = card.querySelector('.g-cel');
      a.textContent = cel ? cel.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3') : 'sin celular';
      if (cel) a.href = 'tel:+57' + cel;
      const pie = card.querySelector('.g-pie');
      pie.appendChild(chipEstado(r));
      pie.appendChild(boton('Cancelar', 'mini sec-peligro', () => cancelar(r.id)));
      poner(card, ini - abre + 2, i + 2, filas);
    });
    for (let h = abre; h < cierra; h++) {
      if (ocupadas.has(h)) continue;
      const libre = document.createElement('button');
      libre.type = 'button';
      const paso = fechaAgenda < isoDe(ahora) || (fechaAgenda === isoDe(ahora) && h <= ahora.getHours());
      libre.className = 'g-libre' + (paso ? ' paso' : '');
      libre.textContent = paso ? '—' : 'Libre';
      libre.disabled = paso;
      libre.addEventListener('click', () => prepararTelefono({ cancha: c.id, fecha: fechaAgenda, hora: h }));
      poner(libre, h - abre + 2, i + 2, 1);
    }
  });
  if (!canchas.length) g.innerHTML = '<p class="nota">No hay canchas activas.</p>';
}

function moverDia(dias) {
  const d = new Date(fechaAgenda + 'T00:00:00');
  d.setDate(d.getDate() + dias);
  fechaAgenda = isoDe(d);
  document.getElementById('agendaFecha').value = fechaAgenda;
  pintarAgenda();
}

function pintarTabla() {
  const q = document.getElementById('buscar').value.trim().toLowerCase();
  const digitos = q.replace(/\D/g, '');
  const tbody = document.getElementById('tablaReservas');
  tbody.innerHTML = '';
  // Sin búsqueda se muestran las próximas (de hoy en adelante); buscando, todas
  const hoy = isoDe(new Date());
  const lista = reservas
    .filter(r => q ? true : r.fecha >= hoy && r.estado !== 'CANCELADA')
    .filter(r => !q ||
      (r.usuario && r.usuario.nombre && r.usuario.nombre.toLowerCase().includes(q)) ||
      (digitos && r.usuario && r.usuario.celular && r.usuario.celular.includes(digitos)) ||
      ('#' + r.id) === q || String(r.id) === q)
    .sort((a, b) => q
      ? (b.fecha + b.horaInicio).localeCompare(a.fecha + a.horaInicio)
      : (a.fecha + a.horaInicio).localeCompare(b.fecha + b.horaInicio))
    .slice(0, 40);
  lista.forEach(r => {
    const tr = document.createElement('tr');
    tr.appendChild(celda(r.id));
    tr.appendChild(celda(r.usuario ? r.usuario.nombre : ''));
    tr.appendChild(celda(r.usuario && r.usuario.celular ? r.usuario.celular : '—'));
    tr.appendChild(celda(r.cancha ? r.cancha.nombre : ''));
    tr.appendChild(celda(fechaCorta(r.fecha)));
    tr.appendChild(celda(rangoBonito(r.horaInicio, r.horaFin)));
    const est = document.createElement('td');
    est.appendChild(chipEstado(r));
    tr.appendChild(est);
    const acc = document.createElement('td');
    if (r.estado !== 'CANCELADA') acc.appendChild(boton('Cancelar', 'mini peligro', () => cancelar(r.id)));
    tr.appendChild(acc);
    tbody.appendChild(tr);
  });
  if (!lista.length) tbody.innerHTML = '<tr><td colspan="8" class="nota">No hay reservas con ese dato.</td></tr>';
}

// ---------- reserva por teléfono ----------

async function prepararTelefono(pre) {
  if (pre) { mostrarSinCargar('telefono'); }
  const f = document.getElementById('formTelefono');
  document.getElementById('telListo').classList.add('oculto');
  if (!canchas.length) {
    try { canchas = await api('GET', '/canchas'); } catch (e) { avisar(e.message, 'error'); }
  }
  f.cancha.innerHTML = canchas.map(c => `<option value="${c.id}">${esc(c.tipo || c.nombre)} (${esc(c.nombre.split('—')[0].trim())})</option>`).join('');
  if (!f.fecha.value) f.fecha.value = isoDe(new Date());
  if (pre) {
    f.cancha.value = pre.cancha;
    f.fecha.value = pre.fecha;
    f.hora.value = pre.hora;
    f.nombre.focus();
  }
  pintarTelResumen();
}

// Cambia de vista sin volver a cargar (para llegar desde una hora libre de la agenda)
function mostrarSinCargar(vista) {
  document.querySelectorAll('.vista').forEach(v => v.classList.add('oculto'));
  document.getElementById('vista-' + vista).classList.remove('oculto');
  document.querySelectorAll('#menu button').forEach(b => b.classList.toggle('activo', b.dataset.vista === vista));
  window.scrollTo(0, 0);
}

function pintarTelResumen() {
  const f = document.getElementById('formTelefono');
  const c = canchas.find(x => String(x.id) === f.cancha.value);
  if (!c) return;
  const total = Number(c.precioHora) * telHoras;
  const ini = Number(f.hora.value);
  document.getElementById('telResumen').textContent =
    `${c.tipo} · ${f.fecha.value ? fechaCorta(f.fecha.value) : ''} · ${rangoBonito(horaDe(ini * 60), horaDe((ini + telHoras) * 60))} · ` +
    `${pesos(total)}` + (porcentajeAbono(c) > 0 ? ` (abono ${pesos(abonoDe(c, total))})` : ' · sin abono');
}

async function reservarTelefono(ev) {
  ev.preventDefault();
  const f = ev.target;
  const celular = limpiarCelular(f.celular.value);
  if (!/^3\d{9}$/.test(celular)) { avisar('El celular debe tener 10 dígitos y empezar por 3.', 'error'); return; }
  const ini = Number(f.hora.value);
  try {
    const r = await api('POST', '/reservas/rapida', {
      nombre: f.nombre.value.trim(), celular,
      canchaId: Number(f.cancha.value), fecha: f.fecha.value,
      horaInicio: horaDe(ini * 60), horaFin: horaDe((ini + telHoras) * 60)
    });
    const res = r.reserva;
    const abono = abonoDe(res.cancha, res.valorTotal);
    const caja = document.getElementById('telListo');
    caja.innerHTML = '<h3></h3><p></p><p class="nota"></p>';
    caja.querySelector('h3').textContent = `Reserva #${res.id} lista`;
    caja.querySelector('p').textContent = `${res.usuario.nombre} · ${res.cancha.nombre} · ${fechaCorta(res.fecha)} de ` +
      `${rangoBonito(res.horaInicio, res.horaFin)} · ${pesos(res.valorTotal)}`;
    caja.querySelector('.nota').textContent = abono > 0
      ? `Esta cancha pide abono de ${pesos(abono)}. Queda como «Falta el abono» en la agenda.`
      : 'Sin abono: paga todo en la cancha.';
    caja.classList.remove('oculto');
    f.nombre.value = '';
    f.celular.value = '';
    avisar('Reserva #' + res.id + ' creada.');
  } catch (e) { avisar(e.message, 'error'); }
}

// ---------- métricas (administrador) ----------

function rango(tipo) {
  const hoy = new Date();
  const desde = new Date(hoy), hasta = new Date(hoy);
  if (tipo === 'mes') desde.setDate(hoy.getDate() - 29);
  else { desde.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7)); hasta.setTime(desde.getTime()); hasta.setDate(desde.getDate() + 6); }
  const f = document.getElementById('formRango');
  f.desde.value = isoDe(desde);
  f.hasta.value = isoDe(hasta);
  cargarMetricas();
}

async function cargarMetricas() {
  const f = document.getElementById('formRango');
  if (!f.desde.value) { rango('semana'); return; }
  let m;
  try {
    m = await api('GET', `/admin/metricas?desde=${f.desde.value}&hasta=${f.hasta.value}`);
  } catch (e) { avisar(e.message, 'error'); return; }
  const kpis = [
    ['Reservas', m.reservas, `${m.canceladas} canceladas`],
    ['Valor reservado', pesos(m.ingresos), 'lo que suman las reservas activas'],
    ['Abonos cobrados', m.abonosCobrados == null ? '—' : pesos(m.abonosCobrados),
      m.abonosCobrados == null ? 'servicio de pagos apagado' : 'en línea con Wompi'],
    ['Jugadores', m.jugadores, 'celulares distintos']
  ];
  document.getElementById('kpis').innerHTML = kpis
    .map(([t, v, s]) => `<div class="kpi"><small>${t}</small><b>${v}</b><span>${s}</span></div>`).join('');

  const barras = (caja, filas) => {
    const max = Math.max(1, ...filas.map(x => x.valor));
    document.getElementById(caja).innerHTML = filas.map(x =>
      `<div class="barra-fila"><span class="b-nombre">${esc(x.nombre)}</span>` +
      `<span class="b-pista"><span class="b-relleno" style="width:${(x.valor / (x.tope || max)) * 100}%"></span></span>` +
      `<span class="b-valor">${x.texto}</span></div>`).join('') || '<p class="nota">Sin datos en el rango.</p>';
  };
  barras('graficaCanchas', m.porCancha.map(c => ({
    nombre: c.nombre.split('—').pop().trim(), valor: c.ocupacion, tope: 100,
    texto: `${c.ocupacion} % · ${c.horas} h`
  })));
  barras('graficaHoras', m.porHora.map(h => ({
    nombre: horaBonita(horaDe(h.hora * 60)), valor: h.reservas, texto: h.reservas
  })));
  const maxDia = Math.max(1, ...m.porDia.map(d => d.reservas));
  document.getElementById('graficaDias').innerHTML = m.porDia.map(d =>
    `<div class="col" title="${fechaCorta(d.fecha)}: ${d.reservas}"><span class="col-n">${d.reservas || ''}</span>` +
    `<span class="col-barra" style="height:${(d.reservas / maxDia) * 100}%"></span>` +
    `<small>${fechaCorta(d.fecha).replace(/ \w+$/, '')}</small></div>`).join('');
}

// ---------- canchas y horarios (Proveedor 1) ----------

async function cargarCanchasAdmin() {
  try {
    canchas = await api('GET', '/canchas');
  } catch (e) { avisar(e.message, 'error'); canchas = []; }
  const tbody = document.getElementById('tablaAdminCanchas');
  tbody.innerHTML = '';
  canchas.forEach(c => {
    const tr = document.createElement('tr');
    tr.appendChild(celda(c.id));
    tr.appendChild(celda(c.nombre));
    tr.appendChild(celda(pesos(c.precioHora)));
    tr.appendChild(celda(porcentajeAbono(c) > 0 ? porcentajeAbono(c) + ' %' : 'Sin abono'));
    const acc = document.createElement('td');
    acc.appendChild(boton('Editar', 'mini sec', () => editarCancha(c)));
    acc.appendChild(document.createTextNode(' '));
    acc.appendChild(boton('Dar de baja', 'mini peligro', () => darDeBaja(c)));
    tr.appendChild(acc);
    tbody.appendChild(tr);
  });
  const sel = document.getElementById('horarioCancha');
  const actual = sel.value;
  sel.innerHTML = canchas.map(c => `<option value="${c.id}">${c.id} · ${esc(c.nombre)}</option>`).join('');
  if (canchas.some(c => String(c.id) === actual)) sel.value = actual;
  cargarHorarios();
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
  const tipo = f.tipo.value;
  const cuerpo = {
    establecimientoId: 1,
    nombre: f.nombre.value,
    deporte: /v[oó]ley/i.test(tipo) ? 'VOLEY' : 'FUTBOL',
    tipo,
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
    cargarCanchasAdmin();
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
    cargarCanchasAdmin();
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
      tr.appendChild(celda(horaBonita(h.horaApertura)));
      tr.appendChild(celda(horaBonita(h.horaCierre)));
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

// ---------- empleados (administrador) ----------

async function cargarEmpleados() {
  const tbody = document.getElementById('tablaEmpleados');
  tbody.innerHTML = '';
  try {
    const lista = await api('GET', '/admin/empleados');
    lista.forEach(u => {
      const tr = document.createElement('tr');
      tr.appendChild(celda(u.nombre));
      tr.appendChild(celda(u.email));
      tr.appendChild(celda(ROLES[u.rol] || u.rol));
      const est = document.createElement('td');
      est.innerHTML = `<span class="estado ${u.activo ? 'EN_CANCHA' : 'CANCELADA'}">${u.activo ? 'Activo' : 'Inactivo'}</span>`;
      tr.appendChild(est);
      const acc = document.createElement('td');
      if (u.rol === 'EMPLEADO') {
        acc.appendChild(u.activo
          ? boton('Desactivar', 'mini sec-peligro', () => cambiarActivo(u, false))
          : boton('Activar', 'mini sec', () => cambiarActivo(u, true)));
      }
      tr.appendChild(acc);
      tbody.appendChild(tr);
    });
  } catch (e) { avisar(e.message, 'error'); }
}

async function crearEmpleado(ev) {
  ev.preventDefault();
  const f = ev.target;
  try {
    const u = await api('POST', '/admin/empleados', {
      nombre: f.nombre.value.trim(), email: f.email.value.trim(), password: f.password.value
    });
    avisar(`Cuenta creada para ${u.nombre}: entra en /panel con ${u.email}.`);
    f.reset();
    cargarEmpleados();
  } catch (e) { avisar(e.message, 'error'); }
}

async function cambiarActivo(u, activo) {
  if (!activo && !confirmarEnLinea('¿Desactivar a ' + u.nombre + '?')) return;
  try {
    await api('PATCH', '/admin/empleados/' + u.id, { activo });
    avisar(u.nombre + (activo ? ' puede volver a entrar.' : ' ya no puede entrar al panel.'));
    cargarEmpleados();
  } catch (e) { avisar(e.message, 'error'); }
}

// ---------- arranque ----------

document.querySelectorAll('#menu button').forEach(b => b.addEventListener('click', () => mostrar(b.dataset.vista)));
document.getElementById('btnSalir').addEventListener('click', salir);
document.getElementById('formLogin').addEventListener('submit', ingresar);
document.getElementById('diaAntes').addEventListener('click', () => moverDia(-1));
document.getElementById('diaDespues').addEventListener('click', () => moverDia(1));
document.getElementById('diaHoy').addEventListener('click', () => { fechaAgenda = isoDe(new Date()); cargarAgenda(); });
document.getElementById('agendaFecha').addEventListener('change', ev => { if (ev.target.value) { fechaAgenda = ev.target.value; pintarAgenda(); } });
document.getElementById('buscar').addEventListener('input', pintarTabla);
document.getElementById('formTelefono').addEventListener('submit', reservarTelefono);
document.getElementById('formTelefono').addEventListener('change', pintarTelResumen);
document.querySelectorAll('#telDuracion button').forEach(b => b.addEventListener('click', () => {
  telHoras = Number(b.dataset.horas);
  document.querySelectorAll('#telDuracion button').forEach(x => x.classList.toggle('activo', x === b));
  pintarTelResumen();
}));
document.getElementById('formRango').addEventListener('submit', ev => { ev.preventDefault(); cargarMetricas(); });
document.querySelectorAll('#formRango [data-rango]').forEach(b => b.addEventListener('click', () => rango(b.dataset.rango)));
document.getElementById('formCancha').addEventListener('submit', guardarCancha);
document.getElementById('btnCancelarEdicion').addEventListener('click', limpiarFormCancha);
document.getElementById('horarioCancha').addEventListener('change', cargarHorarios);
document.getElementById('formHorario').addEventListener('submit', agregarHorario);
document.getElementById('formEmpleado').addEventListener('submit', crearEmpleado);

activarTablas();
pintarSesion();
mostrar(personal ? 'agenda' : 'login');
