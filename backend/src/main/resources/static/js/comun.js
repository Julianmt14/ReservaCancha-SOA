// Utilidades que comparten la página pública (app.js) y el panel del personal (panel.js).
// Todo se pide con fetch a la consumidora (/api en el puerto 8080).

const DIAS = { MONDAY: 'Lunes', TUESDAY: 'Martes', WEDNESDAY: 'Miércoles', THURSDAY: 'Jueves',
  FRIDAY: 'Viernes', SATURDAY: 'Sábado', SUNDAY: 'Domingo' };
const DIA_CORTO = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

// Cada página dice de dónde sale el token y qué hacer si la sesión vence
const conexion = {
  token: () => null,
  alVencer: () => {},
  mensajeVencida: 'Tu sesión terminó.'
};

function leer(clave) {
  try { return JSON.parse(localStorage.getItem(clave)); } catch (e) { return null; }
}

function guardar(clave, valor) {
  try {
    if (valor) localStorage.setItem(clave, JSON.stringify(valor)); else localStorage.removeItem(clave);
  } catch (e) { /* sin almacenamiento: dura hasta recargar */ }
}

// Llama a la consumidora con JSON y el JWT; si responde error, lanza el mensaje que trae el JSON
async function api(metodo, ruta, cuerpo) {
  const cabeceras = { 'Content-Type': 'application/json' };
  const token = conexion.token();
  if (token) cabeceras['Authorization'] = 'Bearer ' + token;
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
  let datos = null;
  try { datos = texto ? JSON.parse(texto) : null; } catch (e) { /* respuesta que no es JSON */ }
  if (!resp.ok) {
    if (resp.status === 401) {
      if (token) conexion.alVencer();
      throw new Error((datos && datos.error) || conexion.mensajeVencida);
    }
    if (resp.status === 403) throw new Error((datos && datos.error) || 'No tienes permiso para esto.');
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
  return valor == null ? '—' : '$' + Math.round(Number(valor)).toLocaleString('es-CO');
}

function hhmm(h) {
  return h ? String(h).substring(0, 5) : '';
}

function minutosDe(hora) {
  const [h, m] = String(hora).split(':').map(Number);
  return h * 60 + m;
}

function horaDe(minutos) {
  return String(Math.floor(minutos / 60)).padStart(2, '0') + ':' + String(minutos % 60).padStart(2, '0');
}

// "19:00" -> "7:00 p. m."
function horaBonita(hora) {
  const [h, m] = hhmm(hora).split(':').map(Number);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return h12 + ':' + String(m).padStart(2, '0') + (h < 12 ? ' a. m.' : ' p. m.');
}

// "19:00" y "20:00" -> "7:00 a 8:00 p. m." (si las dos son de la tarde, se dice una vez)
function rangoBonito(ini, fin) {
  const a = horaBonita(ini), b = horaBonita(fin);
  return a.slice(-5) === b.slice(-5) ? a.slice(0, -6) + ' a ' + b : a + ' a ' + b;
}

function isoDe(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

// "2026-11-12" -> "jue 12 nov"
function fechaCorta(iso) {
  const d = new Date(iso + 'T00:00:00');
  return DIA_CORTO[d.getDay()].toLowerCase() + ' ' + d.getDate() + ' ' + MESES[d.getMonth()];
}

function porcentajeAbono(cancha) {
  return cancha && cancha.reglas ? Number(cancha.reglas.porcentajeAbono || 0) : 0;
}

function abonoDe(cancha, total) {
  return Math.round(Number(total) * porcentajeAbono(cancha) / 100);
}

// Texto seguro para meter en innerHTML
function esc(texto) {
  return String(texto == null ? '' : texto).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function celda(texto) {
  const td = document.createElement('td');
  td.textContent = texto;
  return td;
}

function boton(texto, clase, accion) {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = texto;
  b.className = clase;
  b.addEventListener('click', accion);
  return b;
}

// Deja solo los dígitos; si escriben +57 al inicio se quita
function limpiarCelular(texto) {
  let c = String(texto || '').replace(/\D/g, '');
  if (c.length === 12 && c.startsWith('57')) c = c.substring(2);
  return c;
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

// En el celular cada fila de una tabla se muestra como tarjeta: cada celda lleva el nombre de su columna
function etiquetarCeldas(tabla) {
  const titulos = [...tabla.querySelectorAll('thead th')].map(th => th.textContent);
  tabla.querySelectorAll('tbody tr').forEach(tr =>
    [...tr.children].forEach((td, i) => { if (!td.hasAttribute('colspan')) td.dataset.label = titulos[i] || ''; }));
}

function activarTablas() {
  document.querySelectorAll('table.tabla').forEach(tabla => {
    etiquetarCeldas(tabla);
    new MutationObserver(() => etiquetarCeldas(tabla)).observe(tabla.tBodies[0], { childList: true });
  });
}
