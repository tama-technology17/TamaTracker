// pages/budgets.js
import * as store from '../store.js';
import { formatCurrency } from '../utils/format.js';
import { $, refreshIcons } from '../utils/dom.js';
import { openModal } from '../components/modal.js';
import { toastSuccess, toastError } from '../components/toast.js';

let month = currentMonth();

export function renderBudgets(container) {
  const state = store.getState();
  const expenseCats = state.categories.filter(c => c.type === 'expense');
  const budgets = store.getBudgets(month);
  container.innerHTML = `
    <div class="row-between" style="margin-bottom:var(--space-5);flex-wrap:wrap;gap:12px;">
      <div class="row" style="gap:8px;">
        <h2>Anggaran</h2>
        <input type="month" id="budgetMonth" value="${month}" style="padding:8px 10px;border:1px solid var(--border);border-radius:var(--r-md);background:var(--bg-elev);" />
      </div>
      <button class="btn btn-primary btn-sm" id="addBudgetBtn"><i data-lucide="plus"></i> Atur anggaran</button>
    </div>
    <div class="grid-2" id="budgetGrid"></div>
  `;
  refreshIcons(container);
  renderGrid(container);
  container.querySelector('#budgetMonth').addEventListener('change', (e) => { month = e.target.value; renderBudgets(container); });
  container.querySelector('#addBudgetBtn').addEventListener('click', () => openBudgetForm());
}

function renderGrid(container) {
  const grid = container.querySelector('#budgetGrid');
  const expenseCats = store.getState().categories.filter(c => c.type === 'expense');
  const budgets = store.getBudgets(month);
  if (budgets.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><i data-lucide="wallet"></i><h3>Belum ada anggaran</h3><p>Atur batas pengeluaran per kategori untuk bulan ini.</p></div>`;
    refreshIcons(grid);
    return;
  }
  grid.innerHTML = budgets.map(b => {
    const cat = store.getCategory(b.categoryId);
    const spent = store.spentInCategory(month, b.categoryId);
    const pct = b.limit > 0 ? Math.min((spent / b.limit) * 100, 100) : 0;
    const over = spent > b.limit;
    const warn = !over && pct >= 80;
    return `
      <div class="card budget-card">
        <div class="budget-head">
          <div class="row" style="gap:8px;">
            <div class="tx-icon expense"><i data-lucide="${cat ? cat.icon : 'tag'}"></i></div>
            <div>
              <div style="font-weight:600;font-size:var(--fs-sm);">${escapeHtml(cat ? cat.name : 'Kategori')}</div>
              <div class="muted" style="font-size:var(--fs-xs);">Bulan ${month}</div>
            </div>
          </div>
          <button class="icon-btn" data-del="${b.id}" aria-label="Hapus"><i data-lucide="trash-2"></i></button>
        </div>
        <div class="progress"><div class="progress-fill ${over ? 'over' : warn ? 'warn' : ''}" style="width:${pct}%;"></div></div>
        <div class="budget-meta">
          <span>Terpakai ${formatCurrency(spent)}</span>
          <span>Batas ${formatCurrency(b.limit)}</span>
        </div>
        <div style="font-size:var(--fs-xs);color:${over ? 'var(--danger)' : warn ? 'var(--warning)' : 'var(--text-muted)'};">
          ${over ? 'Melebihi anggaran!' : warn ? 'Mendekati batas (≥80%).' : 'Masih aman.'} · Sisa ${formatCurrency(Math.max(b.limit - spent, 0))}
        </div>
      </div>`;
  }).join('');
  refreshIcons(grid);
  grid.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
    store.deleteBudget(b.dataset.del);
    toastSuccess('Anggaran dihapus.');
    renderBudgets(container);
  }));
}

function openBudgetForm() {
  const expenseCats = store.getState().categories.filter(c => c.type === 'expense');
  const existing = store.getBudgets(month).map(b => b.categoryId);
  const available = expenseCats.filter(c => !existing.includes(c.id));
  const body = document.createElement('div');
  body.innerHTML = `
    <form id="budgetForm" class="stack">
      <div class="field">
        <label>Kategori</label>
        <select name="categoryId">
          ${available.length ? available.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('') : expenseCats.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')}
        </select>
      </div>
      <div class="field">
        <label>Batas pengeluaran (Rp)</label>
        <input name="limit" type="number" min="0" step="1" required placeholder="0" />
      </div>
    </form>
  `;
  const footer = document.createElement('div');
  footer.style.display = 'flex'; footer.style.gap = '8px'; footer.style.justifyContent = 'flex-end';
  const cancel = document.createElement('button'); cancel.className = 'btn btn-secondary'; cancel.textContent = 'Batal';
  const save = document.createElement('button'); save.className = 'btn btn-primary'; save.textContent = 'Simpan';
  footer.appendChild(cancel); footer.appendChild(save);
  const { close, modal } = openModal({ title: 'Atur anggaran', body, footer });
  cancel.addEventListener('click', close);
  save.addEventListener('click', () => {
    const form = modal.querySelector('#budgetForm');
    const categoryId = form.categoryId.value;
    const limit = Number(form.limit.value);
    if (!limit || limit <= 0 || isNaN(limit)) { toastError('Batas harus angka positif.'); return; }
    store.setBudget(month, categoryId, limit);
    toastSuccess('Anggaran disimpan.');
    close();
    renderBudgets(container);
  });
}

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }
