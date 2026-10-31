// pages/dashboard.js
import { getState, totalsFor, balance } from '../store.js';
import { formatCurrency, formatShortDate } from '../utils/format.js';
import { rangeForPeriod } from '../utils/date.js';
import * as charts from '../charts/charts.js';
import { $, refreshIcons } from '../utils/dom.js';
import { getCategory } from '../store.js';

let chartPeriod = 'month';

export function renderDashboard(container) {
  const state = getState();
  const { income, expense, net } = totalsFor(chartPeriod);
  const prev = totalsFor(chartPeriod, shiftRef(chartPeriod, -1));
  const pctIncome = pctChange(income, prev.income);
  const pctExpense = pctChange(expense, prev.expense);
  const pctNet = pctChange(net, prev.net);
  const bal = balance();

  container.innerHTML = `
    <div class="stack">
      <div class="balance-card card">
        <div class="card-title">Total saldo</div>
        <div class="card-value">${formatCurrency(bal)}</div>
        <div class="meta" style="margin-top:8px;">Periode: ${periodLabel(chartPeriod)}</div>
        <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;">
          <span class="delta ${pctNet >= 0 ? 'up' : 'down'}">${pctNet >= 0 ? '↑' : '↓'} ${Math.abs(pctNet).toFixed(1)}% vs periode lalu</span>
        </div>
      </div>

      <div class="grid-3">
        <div class="card stat-card income">
          <div class="stat-icon"><i data-lucide="arrow-down-left"></i></div>
          <div class="card-title">Total pemasukan</div>
          <div class="card-value" style="color:var(--success);font-size:var(--fs-xl);">${formatCurrency(income)}</div>
          <div class="muted" style="font-size:var(--fs-xs);margin-top:4px;">${pctIncome >= 0 ? '+' : ''}${pctIncome.toFixed(1)}% vs lalu</div>
        </div>
        <div class="card stat-card expense">
          <div class="stat-icon"><i data-lucide="arrow-up-right"></i></div>
          <div class="card-title">Total pengeluaran</div>
          <div class="card-value" style="color:var(--danger);font-size:var(--fs-xl);">${formatCurrency(expense)}</div>
          <div class="muted" style="font-size:var(--fs-xs);margin-top:4px;">${pctExpense >= 0 ? '+' : ''}${pctExpense.toFixed(1)}% vs lalu</div>
        </div>
        <div class="card stat-card net">
          <div class="stat-icon"><i data-lucide="scale"></i></div>
          <div class="card-title">Selisih (net)</div>
          <div class="card-value" style="color:${net >= 0 ? 'var(--success)' : 'var(--danger)'};font-size:var(--fs-xl);">${formatCurrency(net)}</div>
          <div class="muted" style="font-size:var(--fs-xs);margin-top:4px;">${state.transactions.length} transaksi</div>
        </div>
      </div>

      <div class="row" style="gap:8px;flex-wrap:wrap;">
        <span class="muted" style="font-size:var(--fs-sm);">Filter grafik:</span>
        ${['day','week','month','year'].map(p => `<button class="filter-chip ${p === chartPeriod ? 'active' : ''}" data-period="${p}">${periodName(p)}</button>`).join('')}
      </div>

      <div class="dash-grid">
        <div class="card chart-card">
          <div class="section-head"><h3>Pemasukan vs pengeluaran</h3></div>
          <div class="chart-wrap"><canvas id="chart-income-expense"></canvas></div>
        </div>
        <div class="card chart-card">
          <div class="section-head"><h3>Pengeluaran per kategori</h3></div>
          <div class="chart-wrap"><canvas id="chart-expense-cat"></canvas></div>
        </div>
      </div>

      <div class="dash-grid">
        <div class="card chart-card">
          <div class="section-head"><h3>Arus kas</h3></div>
          <div class="chart-wrap"><canvas id="chart-cashflow"></canvas></div>
        </div>
        <div class="card chart-card">
          <div class="section-head"><h3>Perkembangan saldo</h3></div>
          <div class="chart-wrap"><canvas id="chart-balance"></canvas></div>
        </div>
      </div>

      <div class="card">
        <div class="section-head">
          <h3>Transaksi terbaru</h3>
          <button class="btn btn-ghost btn-sm" data-nav="transactions">Lihat semua</button>
        </div>
        <div class="recent-list" id="recentList"></div>
      </div>
    </div>
  `;
  refreshIcons(container);

  // filter chips
  container.querySelectorAll('[data-period]').forEach(btn => {
    btn.addEventListener('click', () => {
      chartPeriod = btn.dataset.period;
      renderDashboard(container);
    });
  });

  // nav buttons
  container.querySelectorAll('[data-nav]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('navigate', { detail: btn.dataset.nav }));
    });
  });

  // recent list
  const recentEl = container.querySelector('#recentList');
  const recent = state.transactions.slice(0, 8);
  if (recent.length === 0) {
    recentEl.innerHTML = emptyStateHtml('Belum ada transaksi', 'Tambahkan transaksi pertama untuk melihat ringkasan di sini.', 'plus-circle');
  } else {
    recentEl.innerHTML = recent.map(t => txRowHtml(t)).join('');
  }
  refreshIcons(recentEl);

  // render charts after DOM ready
  requestAnimationFrame(() => {
    charts.renderIncomeExpense('chart-income-expense', chartPeriod);
    charts.renderCashFlow('chart-cashflow', chartPeriod);
    charts.renderExpenseByCategory('chart-expense-cat', chartPeriod);
    charts.renderBalanceTrend('chart-balance', chartPeriod);
  });
}

function txRowHtml(t) {
  const cat = getCategory(t.categoryId);
  const iconName = cat ? cat.icon : (t.type === 'income' ? 'arrow-down-left' : 'arrow-up-right');
  return `
    <div class="tx-row">
      <div class="tx-icon ${t.type}"><i data-lucide="${iconName}"></i></div>
      <div>
        <div class="tx-name">${escapeHtml(t.name)}</div>
        <div class="tx-meta">${escapeHtml(cat ? cat.name : '-')} · ${formatShortDate(t.date)}</div>
      </div>
      <div class="tx-amount ${t.type}">${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount)}</div>
      <div></div>
    </div>`;
}

function emptyStateHtml(title, body, icon) {
  return `<div class="empty-state"><i data-lucide="${icon}"></i><h3>${escapeHtml(title)}</h3><p>${escapeHtml(body)}</p></div>`;
}

function periodName(p) { return { day: 'Harian', week: 'Mingguan', month: 'Bulanan', year: 'Tahunan' }[p]; }
function periodLabel(p) { return periodName(p); }

function shiftRef(period, delta) {
  const now = new Date();
  const d = new Date(now);
  if (period === 'day') d.setDate(d.getDate() + delta);
  else if (period === 'week') d.setDate(d.getDate() + delta * 7);
  else if (period === 'month') d.setMonth(d.getMonth() + delta);
  else if (period === 'year') d.setFullYear(d.getFullYear() + delta);
  return d;
}

function pctChange(cur, prev) {
  if (!prev) return cur > 0 ? 100 : 0;
  return ((cur - prev) / Math.abs(prev)) * 100;
}

function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }
export { chartPeriod };
