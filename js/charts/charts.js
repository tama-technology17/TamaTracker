// charts/charts.js
import { getState } from '../store.js';
import { totalsFor } from '../store.js';
import { formatCurrency } from '../utils/format.js';
import { rangeForPeriod } from '../utils/date.js';

const instances = {};

function destroy(key) {
  if (instances[key]) { instances[key].destroy(); delete instances[key]; }
}

function baseOptions() {
  const grid = getComputedStyle(document.documentElement).getPropertyValue('--chart-grid').trim();
  const text = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim();
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: text, font: { family: 'Plus Jakarta Sans', size: 12 }, boxWidth: 12 } },
      tooltip: {
        backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--bg-elev').trim(),
        titleColor: getComputedStyle(document.documentElement).getPropertyValue('--text').trim(),
        bodyColor: getComputedStyle(document.documentElement).getPropertyValue('--text').trim(),
        borderColor: getComputedStyle(document.documentElement).getPropertyValue('--border').trim(),
        borderWidth: 1,
        padding: 10,
        callbacks: { label: (ctx) => `${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y ?? ctx.parsed)}` },
      },
    },
    scales: {
      x: { ticks: { color: text, font: { size: 11 } }, grid: { color: grid, drawBorder: false } },
      y: { ticks: { color: text, font: { size: 11 }, callback: (v) => formatCompact(v) }, grid: { color: grid, drawBorder: false } },
    },
  };
}

function formatCompact(v) {
  if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(1) + 'jt';
  if (Math.abs(v) >= 1e3) return (v / 1e3).toFixed(0) + 'rb';
  return v;
}

function cssVar(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }

export function renderIncomeExpense(canvasId, period = 'month', ref = new Date()) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  destroy(canvasId);
  const { start, end } = rangeForPeriod(period, ref);
  // group by day/week/month depending on period
  const buckets = groupTransactions(period, start, end);
  const labels = buckets.map(b => b.label);
  const income = buckets.map(b => b.income);
  const expense = buckets.map(b => b.expense);
  instances[canvasId] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Pemasukan', data: income, backgroundColor: cssVar('--chart-income'), borderRadius: 6, maxBarThickness: 28 },
        { label: 'Pengeluaran', data: expense, backgroundColor: cssVar('--chart-expense'), borderRadius: 6, maxBarThickness: 28 },
      ],
    },
    options: { ...baseOptions(), plugins: { ...baseOptions().plugins } },
  });
}

export function renderCashFlow(canvasId, period = 'month', ref = new Date()) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  destroy(canvasId);
  const { start, end } = rangeForPeriod(period, ref);
  const buckets = groupTransactions(period, start, end);
  let cum = 0;
  const net = buckets.map(b => { cum += (b.income - b.expense); return cum; });
  instances[canvasId] = new Chart(ctx, {
    type: 'line',
    data: {
      labels: buckets.map(b => b.label),
      datasets: [{
        label: 'Arus kas kumulatif', data: net,
        borderColor: cssVar('--chart-balance'), backgroundColor: hexToRgba(cssVar('--chart-balance'), 0.12),
        fill: true, tension: 0.35, pointRadius: 3, pointHoverRadius: 5, borderWidth: 2,
      }],
    },
    options: baseOptions(),
  });
}

export function renderExpenseByCategory(canvasId, period = 'month', ref = new Date()) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  destroy(canvasId);
  const { start, end } = rangeForPeriod(period, ref);
  const state = getState();
  const map = {};
  for (const t of state.transactions) {
    if (t.type !== 'expense') continue;
    const d = new Date(t.date);
    if (d < start || d > end) continue;
    map[t.categoryId] = (map[t.categoryId] || 0) + t.amount;
  }
  const entries = Object.entries(map).sort((a, b) => b[1] - a[1]);
  const labels = entries.map(([id]) => {
    const c = state.categories.find(x => x.id === id);
    return c ? c.name : 'Lainnya';
  });
  const data = entries.map(([, v]) => v);
  const palette = ['#4338CA', '#059669', '#DC2626', '#D97706', '#7C3AED', '#0891B2', '#EC4899', '#64748B'];
  instances[canvasId] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data, backgroundColor: palette.slice(0, data.length), borderWidth: 0 }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right', labels: { color: cssVar('--text-muted'), font: { size: 12 }, boxWidth: 12 } },
        tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${formatCurrency(ctx.parsed)}` } },
      },
      cutout: '62%',
    },
  });
}

export function renderBalanceTrend(canvasId, period = 'month', ref = new Date()) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  destroy(canvasId);
  const { start, end } = rangeForPeriod(period, ref);
  // daily balance points across period
  const days = [];
  const points = [];
  const all = getState().transactions.slice().sort((a, b) => new Date(a.date) - new Date(b.date));
  const step = period === 'year' ? 'month' : 'day';
  const cur = new Date(start);
  const maxPoints = period === 'year' ? 12 : 60;
  let count = 0;
  while (cur <= end && count < maxPoints) {
    const pointEnd = new Date(cur);
    if (step === 'day') { pointEnd.setHours(23,59,59,999); cur.setDate(cur.getDate() + 1); }
    else { pointEnd.setMonth(pointEnd.getMonth() + 1, 0); pointEnd.setHours(23,59,59,999); cur.setMonth(cur.getMonth() + 1, 1); cur.setHours(0,0,0,0); }
    let b = 0;
    for (const t of all) {
      if (new Date(t.date) <= pointEnd) {
        b += t.type === 'income' ? t.amount : -t.amount;
      }
    }
    points.push(b);
    days.push(pointEnd.toLocaleDateString('id-ID', step === 'day' ? { day: '2-digit', month: 'short' } : { month: 'short' }));
    count++;
  }
  instances[canvasId] = new Chart(ctx, {
    type: 'line',
    data: {
      labels: days,
      datasets: [{
        label: 'Saldo', data: points,
        borderColor: cssVar('--chart-balance'), backgroundColor: hexToRgba(cssVar('--chart-balance'), 0.1),
        fill: true, tension: 0.3, pointRadius: 0, borderWidth: 2,
      }],
    },
    options: baseOptions(),
  });
}

function groupTransactions(period, start, end) {
  const state = getState();
  const buckets = [];
  if (period === 'day') {
    // single day -> hourly? simplify: one bucket
    let income = 0, expense = 0;
    for (const t of state.transactions) {
      const d = new Date(t.date);
      if (d < start || d > end) continue;
      if (t.type === 'income') income += t.amount; else expense += t.amount;
    }
    buckets.push({ label: 'Hari ini', income, expense });
    return buckets;
  }
  if (period === 'week') {
    for (let i = 0; i < 7; i++) {
      const day = new Date(start); day.setDate(start.getDate() + i);
      const ds = new Date(day); ds.setHours(0,0,0,0);
      const de = new Date(day); de.setHours(23,59,59,999);
      let income = 0, expense = 0;
      for (const t of state.transactions) {
        const d = new Date(t.date);
        if (d < ds || d > de) continue;
        if (t.type === 'income') income += t.amount; else expense += t.amount;
      }
      buckets.push({ label: day.toLocaleDateString('id-ID', { weekday: 'short', day: '2-digit' }), income, expense });
    }
    return buckets;
  }
  if (period === 'month') {
    const weeks = 5;
    for (let i = 0; i < weeks; i++) {
      const ws = new Date(start); ws.setDate(start.getDate() + i * 7);
      const we = new Date(ws); we.setDate(ws.getDate() + 6); we.setHours(23,59,59,999);
      if (ws > end) break;
      const ce = we > end ? end : we;
      let income = 0, expense = 0;
      for (const t of state.transactions) {
        const d = new Date(t.date);
        if (d < ws || d > ce) continue;
        if (t.type === 'income') income += t.amount; else expense += t.amount;
      }
      buckets.push({ label: `Mg ${i + 1}`, income, expense });
    }
    return buckets;
  }
  if (period === 'year') {
    for (let m = 0; m < 12; m++) {
      const ms = new Date(start.getFullYear(), m, 1);
      const me = new Date(start.getFullYear(), m + 1, 0, 23, 59, 59, 999);
      let income = 0, expense = 0;
      for (const t of state.transactions) {
        const d = new Date(t.date);
        if (d < ms || d > me) continue;
        if (t.type === 'income') income += t.amount; else expense += t.amount;
      }
      buckets.push({ label: ms.toLocaleDateString('id-ID', { month: 'short' }), income, expense });
    }
    return buckets;
  }
  return buckets;
}

function hexToRgba(hex, alpha) {
  // handle css var values possibly rgb
  if (hex.startsWith('rgb')) {
    return hex.replace('rgb', 'rgba').replace(')', `, ${alpha})`);
  }
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0,2), 16);
  const g = parseInt(h.slice(2,4), 16);
  const b = parseInt(h.slice(4,6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function refreshChartsTheme() {
  // no-op: charts re-rendered by callers
}
export function destroyChart(id) { destroy(id); }
export function destroyAll() { Object.keys(instances).forEach(destroy); }
