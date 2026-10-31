// utils/date.js
export function rangeForPeriod(period, ref = new Date()) {
  const d = new Date(ref);
  if (period === 'day') {
    const s = new Date(d); s.setHours(0,0,0,0);
    const e = new Date(d); e.setHours(23,59,59,999);
    return { start: s, end: e };
  }
  if (period === 'week') {
    const day = d.getDay();
    const diff = (day + 6) % 7;
    const s = new Date(d); s.setDate(d.getDate() - diff); s.setHours(0,0,0,0);
    const e = new Date(s); e.setDate(s.getDate() + 6); e.setHours(23,59,59,999);
    return { start: s, end: e };
  }
  if (period === 'month') {
    const s = new Date(d.getFullYear(), d.getMonth(), 1);
    const e = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start: s, end: e };
  }
  if (period === 'year') {
    const s = new Date(d.getFullYear(), 0, 1);
    const e = new Date(d.getFullYear(), 11, 31, 23, 59, 59, 999);
    return { start: s, end: e };
  }
  return { start: new Date(0), end: new Date(8640000000000000) };
}

export function inRange(iso, start, end) {
  const t = new Date(iso).getTime();
  return t >= start.getTime() && t <= end.getTime();
}

export function previousPeriodRange(period, ref = new Date()) {
  const cur = rangeForPeriod(period, ref);
  const dur = cur.end.getTime() - cur.start.getTime();
  const end = new Date(cur.start.getTime() - 1);
  const start = new Date(end.getTime() - dur);
  start.setHours(0,0,0,0);
  return { start, end };
}
