// utils/format.js
const IDR = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });

export function formatCurrency(value) {
  if (value === null || value === undefined || isNaN(value)) return 'Rp 0';
  return IDR.format(Math.round(value));
}

export function formatNumber(value) {
  return new Intl.NumberFormat('id-ID').format(Math.round(value));
}

export function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
}

export function formatShortDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
}

export function formatMonth(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
}

export function toInputDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function monthKey(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function startOfDay(d) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
export function endOfDay(d) { const x = new Date(d); x.setHours(23,59,59,999); return x; }
