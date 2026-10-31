// pages/transactions.js
import * as store from '../store.js';
import { formatCurrency, formatDate, toInputDate } from '../utils/format.js';
import { $, refreshIcons } from '../utils/dom.js';
import { openModal, confirmDialog } from '../components/modal.js';
import { toastSuccess, toastError } from '../components/toast.js';

const state = { search: '', type: 'all', category: 'all', sort: 'date-desc', dateFrom: '', dateTo: '' };

export function renderTransactions(container) {
  const cats = store.getState().categories;
  container.innerHTML = `
    <div class="card">
      <div class="tx-toolbar">
        <div class="search-input">
          <i data-lucide="search"></i>
          <input type="search" id="txSearch" placeholder="Cari nama atau kategori..." value="${escapeAttr(state.search)}" />
        </div>
        <select id="txTypeFilter" style="padding:10px 12px;border:1px solid var(--border);border-radius:var(--r-md);background:var(--bg-elev);">
          <option value="all">Semua jenis</option>
          <option value="income">Pemasukan</option>
          <option value="expense">Pengeluaran</option>
        </select>
        <select id="txCatFilter" style="padding:10px 12px;border:1px solid var(--border);border-radius:var(--r-md);background:var(--bg-elev);">
          <option value="all">Semua kategori</option>
          ${cats.map(c => `<option value="${c.id}">${escapeHtml(c.name)} (${c.type === 'income' ? 'Masuk' : 'Keluar'})</option>`).join('')}
        </select>
        <select id="txSort" style="padding:10px 12px;border:1px solid var(--border);border-radius:var(--r-md);background:var(--bg-elev);">
          <option value="date-desc">Tanggal terbaru</option>
          <option value="date-asc">Tanggal terlama</option>
          <option value="amount-desc">Nominal terbesar</option>
          <option value="amount-asc">Nominal terkecil</option>
        </select>
      </div>
      <div class="row" style="gap:8px;margin-bottom:12px;flex-wrap:wrap;">
        <input type="date" id="txDateFrom" value="${state.dateFrom}" style="padding:8px 10px;border:1px solid var(--border);border-radius:var(--r-md);background:var(--bg-elev);" />
        <span class="muted">s/d</span>
        <input type="date" id="txDateTo" value="${state.dateTo}" style="padding:8px 10px;border:1px solid var(--border);border-radius:var(--r-md);background:var(--bg-elev);" />
        <button class="btn btn-primary btn-sm" id="txAddBtn"><i data-lucide="plus"></i> Tambah transaksi</button>
      </div>
      <div id="txList"></div>
    </div>
  `;
  refreshIcons(container);

  // restore filter values
  const typeSel = container.querySelector('#txTypeFilter'); typeSel.value = state.type;
  const catSel = container.querySelector('#txCatFilter'); catSel.value = state.category;
  const sortSel = container.querySelector('#txSort'); sortSel.value = state.sort;

  const rerender = () => renderList(container);
  container.querySelector('#txSearch').addEventListener('input', (e) => { state.search = e.target.value; rerender(); });
  typeSel.addEventListener('change', (e) => { state.type = e.target.value; rerender(); });
  catSel.addEventListener('change', (e) => { state.category = e.target.value; rerender(); });
  sortSel.addEventListener('change', (e) => { state.sort = e.target.value; rerender(); });
  container.querySelector('#txDateFrom').addEventListener('change', (e) => { state.dateFrom = e.target.value; rerender(); });
  container.querySelector('#txDateTo').addEventListener('change', (e) => { state.dateTo = e.target.value; rerender(); });
  container.querySelector('#txAddBtn').addEventListener('click', () => openTxForm());

  renderList(container);
}

function renderList(container) {
  const listEl = container.querySelector('#txList');
  let list = store.getState().transactions.slice();
  // filters
  if (state.search.trim()) {
    const q = state.search.toLowerCase();
    list = list.filter(t => t.name.toLowerCase().includes(q) || (store.getCategory(t.categoryId)?.name || '').toLowerCase().includes(q));
  }
  if (state.type !== 'all') list = list.filter(t => t.type === state.type);
  if (state.category !== 'all') list = list.filter(t => t.categoryId === state.category);
  if (state.dateFrom) list = list.filter(t => t.date >= state.dateFrom);
  if (state.dateTo) list = list.filter(t => t.date <= state.dateTo);
  // sort
  list.sort((a, b) => {
    switch (state.sort) {
      case 'date-asc': return new Date(a.date) - new Date(b.date);
      case 'date-desc': return new Date(b.date) - new Date(a.date);
      case 'amount-asc': return a.amount - b.amount;
      case 'amount-desc': return b.amount - a.amount;
    }
    return 0;
  });

  if (list.length === 0) {
    listEl.innerHTML = `<div class="empty-state"><i data-lucide="receipt"></i><h3>Tidak ada transaksi</h3><p>Coba ubah filter atau tambahkan transaksi baru.</p></div>`;
    refreshIcons(listEl);
    return;
  }
  listEl.innerHTML = list.map(t => txRowHtml(t)).join('');
  refreshIcons(listEl);
  // bind actions
  listEl.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => openTxForm(btn.dataset.edit));
  });
  listEl.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', () => {
      confirmDialog({
        title: 'Hapus transaksi',
        message: 'Transaksi ini akan dihapus permanen. Lanjutkan?',
        onConfirm: () => {
          store.deleteTransaction(btn.dataset.delete);
          toastSuccess('Transaksi dihapus.');
          renderList(container);
        },
      });
    });
  });
}

function txRowHtml(t) {
  const cat = store.getCategory(t.categoryId);
  const iconName = cat ? cat.icon : (t.type === 'income' ? 'arrow-down-left' : 'arrow-up-right');
  return `
    <div class="tx-row">
      <div class="tx-icon ${t.type}"><i data-lucide="${iconName}"></i></div>
      <div>
        <div class="tx-name">${escapeHtml(t.name)}</div>
        <div class="tx-meta">${escapeHtml(cat ? cat.name : '-')} · ${formatDate(t.date)}${t.note ? ' · ' + escapeHtml(t.note) : ''}</div>
      </div>
      <div class="tx-amount ${t.type}">${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount)}</div>
      <div class="tx-actions">
        <button class="icon-btn" data-edit="${t.id}" aria-label="Edit"><i data-lucide="pencil"></i></button>
        <button class="icon-btn" data-delete="${t.id}" aria-label="Hapus"><i data-lucide="trash-2"></i></button>
      </div>
    </div>`;
}

function openTxForm(editId = null) {
  const tx = editId ? store.getTransaction(editId) : null;
  const cats = store.getState().categories;
  const incomeCats = cats.filter(c => c.type === 'income');
  const expenseCats = cats.filter(c => c.type === 'expense');
  const body = document.createElement('div');
  body.innerHTML = `
    <form id="txForm" class="stack">
      <div class="field">
        <label>Jenis transaksi</label>
        <select name="type" id="txType">
          <option value="expense" ${tx?.type === 'expense' || !tx ? 'selected' : ''}>Pengeluaran</option>
          <option value="income" ${tx?.type === 'income' ? 'selected' : ''}>Pemasukan</option>
        </select>
      </div>
      <div class="field">
        <label>Nama transaksi</label>
        <input name="name" type="text" required value="${escapeAttr(tx?.name || '')}" placeholder="Contoh: Makan siang" />
      </div>
      <div class="field">
        <label>Nominal (Rp)</label>
        <input name="amount" type="number" min="0" step="1" required value="${tx?.amount ?? ''}" placeholder="0" />
      </div>
      <div class="field">
        <label>Kategori</label>
        <select name="categoryId" id="txCat"></select>
      </div>
      <div class="field">
        <label>Tanggal</label>
        <input name="date" type="date" required value="${toInputDate(tx?.date) || new Date().toISOString().slice(0,10)}" />
      </div>
      <div class="field">
        <label>Catatan (opsional)</label>
        <textarea name="note" rows="2" placeholder="Catatan tambahan">${escapeHtml(tx?.note || '')}</textarea>
      </div>
    </form>
  `;
  const footer = document.createElement('div');
  footer.style.display = 'flex'; footer.style.gap = '8px'; footer.style.justifyContent = 'flex-end';
  const cancel = document.createElement('button'); cancel.className = 'btn btn-secondary'; cancel.textContent = 'Batal';
  const save = document.createElement('button'); save.className = 'btn btn-primary'; save.textContent = editId ? 'Simpan' : 'Tambah';
  footer.appendChild(cancel); footer.appendChild(save);

  const { close, modal } = openModal({ title: editId ? 'Edit transaksi' : 'Tambah transaksi', body, footer });

  const typeSel = modal.querySelector('#txType');
  const catSel = modal.querySelector('#txCat');
  function populateCats() {
    const t = typeSel.value;
    const list = t === 'income' ? incomeCats : expenseCats;
    catSel.innerHTML = list.map(c => `<option value="${c.id}" ${tx?.categoryId === c.id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('');
  }
  populateCats();
  typeSel.addEventListener('change', populateCats);

  cancel.addEventListener('click', close);
  save.addEventListener('click', () => {
    const form = modal.querySelector('#txForm');
    const name = form.name.value.trim();
    const amount = Number(form.amount.value);
    const categoryId = form.categoryId.value;
    const date = form.date.value;
    const note = form.note.value.trim();
    const type = form.type.value;
    if (!name) { toastError('Nama transaksi wajib diisi.'); return; }
    if (!amount || amount <= 0 || isNaN(amount)) { toastError('Nominal harus angka positif.'); return; }
    if (!date) { toastError('Tanggal wajib diisi.'); return; }
    if (editId) {
      store.updateTransaction(editId, { type, name, amount, categoryId, date, note });
      toastSuccess('Transaksi diperbarui.');
    } else {
      store.addTransaction({ type, name, amount, categoryId, date, note });
      toastSuccess('Transaksi ditambahkan.');
    }
    close();
    // re-render current view
    const container = document.getElementById('view-transactions');
    renderTransactions(container);
  });
}

function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }
function escapeAttr(s) { return String(s).replace(/"/g, '&quot;'); }
export { renderList };
