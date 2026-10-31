// pages/reports.js
import * as store from '../store.js';
import { formatCurrency, formatDate } from '../utils/format.js';
import { rangeForPeriod } from '../utils/date.js';
import { $, refreshIcons } from '../utils/dom.js';
import { toastSuccess } from '../components/toast.js';

let period = 'month';
let customFrom = '';
let customTo = '';

export function renderReports(container) {
  const { income, expense, net, list } = compute();
  // top expense category
  const catMap = {};
  for (const t of list) {
    if (t.type !== 'expense') continue;
    catMap[t.categoryId] = (catMap[t.categoryId] || 0) + t.amount;
  }
  const topCatEntry = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0];
  const topCat = topCatEntry ? store.getCategory(topCatEntry[0]) : null;
  const avgExpense = list.filter(t => t.type === 'expense').length
    ? expense / list.filter(t => t.type === 'expense').length : 0;

  container.innerHTML = `
    <div class="row-between" style="margin-bottom:var(--space-5);flex-wrap:wrap;gap:12px;">
      <h2>Laporan keuangan</h2>
      <div class="row" style="gap:8px;flex-wrap:wrap;">
        ${['week','month','year'].map(p => `<button class="filter-chip ${p === period ? 'active' : ''}" data-period="${p}">${periodName(p)}</button>`).join('')}
        <button class="filter-chip ${period === 'custom' ? 'active' : ''}" data-period="custom">Custom</button>
      </div>
    </div>
    ${period === 'custom' ? `
      <div class="row" style="gap:8px;margin-bottom:var(--space-4);">
        <input type="date" id="repFrom" value="${customFrom}" style="padding:8px 10px;border:1px solid var(--border);border-radius:var(--r-md);background:var(--bg-elev);" />
        <span class="muted">s/d</span>
        <input type="date" id="repTo" value="${customTo}" style="padding:8px 10px;border:1px solid var(--border);border-radius:var(--r-md);background:var(--bg-elev);" />
      </div>` : ''}
    <div class="grid-4" style="margin-bottom:var(--space-5);">
      <div class="card"><div class="card-title">Total pemasukan</div><div class="card-value" style="color:var(--success);font-size:var(--fs-xl);">${formatCurrency(income)}</div></div>
      <div class="card"><div class="card-title">Total pengeluaran</div><div class="card-value" style="color:var(--danger);font-size:var(--fs-xl);">${formatCurrency(expense)}</div></div>
      <div class="card"><div class="card-title">Net cash flow</div><div class="card-value" style="color:${net>=0?'var(--success)':'var(--danger)'};font-size:var(--fs-xl);">${formatCurrency(net)}</div></div>
      <div class="card"><div class="card-title">Rata-rata pengeluaran</div><div class="card-value" style="font-size:var(--fs-xl);">${formatCurrency(avgExpense)}</div></div>
    </div>

    <div class="report-grid">
      <div class="card">
        <div class="section-head"><h3>Ringkasan</h3></div>
        <div class="report-row"><span class="k">Periode</span><span class="v">${periodLabel()}</span></div>
        <div class="report-row"><span class="k">Jumlah transaksi</span><span class="v">${list.length}</span></div>
        <div class="report-row"><span class="k">Pemasukan</span><span class="v" style="color:var(--success);">${formatCurrency(income)}</span></div>
        <div class="report-row"><span class="k">Pengeluaran</span><span class="v" style="color:var(--danger);">${formatCurrency(expense)}</span></div>
        <div class="report-row"><span class="k">Net cash flow</span><span class="v">${formatCurrency(net)}</span></div>
        <div class="report-row"><span class="k">Kategori pengeluaran terbesar</span><span class="v">${topCat ? escapeHtml(topCat.name) + ' (' + formatCurrency(topCatEntry[1]) + ')' : '-'}</span></div>
      </div>
      <div class="card">
        <div class="section-head"><h3>Pengeluaran per kategori</h3></div>
        ${renderCatBreakdown(list)}
      </div>
    </div>

    <div class="card" style="margin-top:var(--space-4);">
      <div class="section-head">
        <h3>Riwayat transaksi</h3>
        <div class="row" style="gap:8px;">
          <button class="btn btn-secondary btn-sm" id="exportCsvBtn"><i data-lucide="download"></i> Export CSV</button>
          <button class="btn btn-secondary btn-sm" id="printBtn"><i data-lucide="printer"></i> Cetak</button>
        </div>
      </div>
      <div id="repList"></div>
    </div>
  `;
  refreshIcons(container);

  // filters
  container.querySelectorAll('[data-period]').forEach(btn => {
    btn.addEventListener('click', () => { period = btn.dataset.period; renderReports(container); });
  });
  if (period === 'custom') {
    container.querySelector('#repFrom')?.addEventListener('change', (e) => { customFrom = e.target.value; renderReports(container); });
    container.querySelector('#repTo')?.addEventListener('change', (e) => { customTo = e.target.value; renderReports(container); });
  }
  // list
  const listEl = container.querySelector('#repList');
  if (list.length === 0) {
    listEl.innerHTML = `<div class="empty-state"><i data-lucide="file-text"></i><h3>Tidak ada transaksi</h3><p>Pada periode ini belum ada transaksi.</p></div>`;
  } else {
    const sorted = list.slice().sort((a, b) => new Date(b.date) - new Date(a.date));
    listEl.innerHTML = sorted.map(t => {
      const cat = store.getCategory(t.categoryId);
      return `<div class="tx-row">
        <div class="tx-icon ${t.type}"><i data-lucide="${cat ? cat.icon : 'tag'}"></i></div>
        <div>
          <div class="tx-name">${escapeHtml(t.name)}</div>
          <div class="tx-meta">${escapeHtml(cat ? cat.name : '-')} · ${formatDate(t.date)}</div>
        </div>
        <div class="tx-amount ${t.type}">${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount)}</div>
        <div></div>
      </div>`;
    }).join('');
  }
  refreshIcons(listEl);

  container.querySelector('#exportCsvBtn').addEventListener('click', () => exportCSV(list));
  container.querySelector('#printBtn').addEventListener('click', () => window.print());
}

function compute() {
  if (period === 'custom') {
    const s = customFrom ? new Date(customFrom) : new Date(0);
    const e = customTo ? new Date(customTo + 'T23:59:59') : new Date(8640000000000000);
    return store.totalsFor('custom', new Date(), s, e);
  }
  return store.totalsFor(period);
}

function renderCatBreakdown(list) {
  const map = {};
  for (const t of list) {
    if (t.type !== 'expense') continue;
    map[t.categoryId] = (map[t.categoryId] || 0) + t.amount;
  }
  const entries = Object.entries(map).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, v]) => s + v, 0) || 1;
  if (entries.length === 0) return `<div class="muted" style="font-size:var(--fs-sm);">Belum ada pengeluaran.</div>`;
  return entries.map(([id, v]) => {
    const cat = store.getCategory(id);
    const pct = (v / total) * 100;
    return `<div style="margin-bottom:10px;">
      <div class="row-between" style="font-size:var(--fs-sm);margin-bottom:4px;">
        <span>${escapeHtml(cat ? cat.name : 'Lainnya')}</span>
        <span class="muted">${formatCurrency(v)} · ${pct.toFixed(1)}%</span>
      </div>
      <div class="progress"><div class="progress-fill" style="width:${pct}%;"></div></div>
    </div>`;
  }).join('');
}

function exportCSV(list) {
  const rows = [['Tanggal', 'Nama', 'Jenis', 'Kategori', 'Nominal', 'Catatan']];
  for (const t of list) {
    const cat = store.getCategory(t.categoryId);
    rows.push([t.date, t.name, t.type, cat ? cat.name : '', t.amount, t.note || '']);
  }
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `tamatracker-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toastSuccess('CSV berhasil diunduh.');
}

function periodName(p) { return { week: 'Mingguan', month: 'Bulanan', year: 'Tahunan', custom: 'Custom' }[p]; }
function periodLabel() {
  if (period === 'custom') return `${customFrom || '...'} s/d ${customTo || '...'}`;
  return periodName(period);
}
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }
