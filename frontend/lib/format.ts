// Formatos es-CO compartidos por el flujo del jugador.

/** $90.000 */
export function formatCOP(value: number): string {
  return '$' + Math.round(value).toLocaleString('es-CO')
}

/** 19.5 → "19:30" */
export function formatHour(h: number): string {
  const hh = Math.floor(h)
  const mm = Math.round((h - hh) * 60)
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

/** Fecha local en formato YYYY-MM-DD (sin pasar por UTC). */
export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** "2026-10-17" → Date local a medianoche. */
export function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

/** Hora decimal de un ISO local ("2026-10-17T19:30:00" → 19.5). */
export function hourOf(iso: string): number {
  const d = new Date(iso)
  return d.getHours() + d.getMinutes() / 60
}

/** "sáb 17" */
export function formatDayShort(iso: string): string {
  const d = parseIsoDate(iso)
  const wd = d.toLocaleDateString('es-CO', { weekday: 'short' }).replace('.', '')
  return `${wd} ${d.getDate()}`
}

/** "sábado 17 de octubre" */
export function formatDayLong(iso: string): string {
  return parseIsoDate(iso).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })
}

/** "Hoy", "Mañana" o "sáb 17". */
export function relativeDayLabel(iso: string, today = isoDate(new Date())): string {
  if (iso === today) return 'Hoy'
  if (iso === isoDate(addDays(parseIsoDate(today), 1))) return 'Mañana'
  return formatDayShort(iso)
}

/** 1 → "1 h", 1.5 → "1 h 30" */
export function formatDuration(hours: number): string {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return m ? `${h} h ${m}` : `${h} h`
}

/** Cuenta regresiva corta: "3 h 20 min", "2 días". */
export function formatCountdown(ms: number): string {
  const min = Math.max(0, Math.round(ms / 60000))
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h} h ${min % 60} min`
  const days = Math.round(h / 24)
  return days === 1 ? '1 día' : `${days} días`
}

export function initials(name?: string | null): string {
  if (!name) return '?'
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}
