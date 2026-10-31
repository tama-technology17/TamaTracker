// pages/categories.js
import * as store from '../store.js';
import { $, refreshIcons } from '../utils/dom.js';
import { openModal, confirmDialog } from '../components/modal.js';
import { toastSuccess, toastError } from '../components/toast.js';

const LUCIDE_ICONS = ['tag','briefcase','laptop','store','trending-up','gift','more-horizontal','utensils','car','shopping-bag','receipt','film','heart-pulse','graduation-cap','home','plane','smartphone','coffee','book','music','dumbbell','baby','dog','leaf','zap'];

export function renderCategories(container) {
  const state = store.getState();
  const income = state.categories.filter(c => c.type === 'income');
  const expense = state.categories.filter(c => c.type === 'expense');
  container.innerHTML = `
    <div class="row-between" style="margin-bottom:var(--space-5);">
      <h2>Kategori</h2>
      <button class="btn btn-primary btn-sm" id="addCatBtn"><i data-lucide="plus"></i> Tambah kategori</button>
    </div>
    <div class="cat-section">
      <h4>Pemasukan</h4>
      <div class="cat-grid" id="incomeCats"></div>
    </div>
    <div class="cat-section">
      <h4>Pengeluaran</h4>
      <div class="cat-grid" id="expenseCats"></div>
    </div>
  `;
  refreshIcons(container);
  renderCatGrid(container.querySelector('#incomeCats'), income);
  renderCatGrid(container.querySelector('#expenseCats'), expense);
  container.querySelector('#addCatBtn').addEventListener('click', () => openCatForm());
}

function renderCatGrid(el, cats) {
  el.innerHTML = cats.map(c => `
    <div class="cat-card" data-id="${c.id}">
      <div class="cat-icon"><i data-lucide="${c.icon || 'tag'}"></i></div>
      <div style="flex:1;">
        <div style="font-weight:600;font-size:var(--fs-sm);">${escapeHtml(c.name)}</div>
        <div class="muted" style="font-size:var(--fs-xs);">${c.isDefault ? 'Bawaan' : 'Kustom'}</div>
      </div>
      <button class="icon-btn" data-edit="${c.id}" aria-label="Edit"><i data-lucide="pencil"></i></button>
      <button class="icon-btn" data-del="${c.id}" aria-label="Hapus"><i data-lucide="trash-2"></i></button>
    </div>
  `).join('');
  refreshIcons(el);
  el.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', (e) => { e.stopPropagation(); openCatForm(b.dataset.edit); }));
  el.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', (e) => {
    e.stopPropagation();
    const cat = store.getCategory(b.dataset.del);
    if (!cat) return;
    confirmDialog({
      title: 'Hapus kategori',
      message: `Hapus kategori "${cat.name}"? Transaksi terkait akan dipindah ke kategori "Lainnya".`,
      onConfirm: () => { store.deleteCategory(b.dataset.del); toastSuccess('Kategori dihapus.'); renderCategories(document.getElementById('view-categories')); },
    });
  }));
}

function openCatForm(editId = null) {
  const cat = editId ? store.getCategory(editId) : null;
  const body = document.createElement('div');
  body.innerHTML = `
    <form id="catForm" class="stack">
      <div class="field">
        <label>Jenis</label>
        <select name="type" ${editId ? 'disabled' : ''}>
          <option value="income" ${cat?.type === 'income' || !cat ? 'selected' : ''}>Pemasukan</option>
          <option value="expense" ${cat?.type === 'expense' ? 'selected' : ''}>Pengeluaran</option>
        </select>
      </div>
      <div class="field">
        <label>Nama kategori</label>
        <input name="name" type="text" required value="${escapeAttr(cat?.name || '')}" />
      </div>
      <div class="field">
        <label>Ikon</label>
        <div id="iconPicker" style="display:grid;grid-template-columns:repeat(8,1fr);gap:6px;max-height:160px;overflow-y:auto;padding:8px;border:1px solid var(--border);border-radius:var(--r-md);"></div>
        <input type="hidden" name="icon" id="catIcon" value="${cat?.icon || 'tag'}" />
      </div>
    </form>
  `;
  const picker = body.querySelector('#iconPicker');
  for (const ic of LUCIDE_ICONS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'icon-btn';
    btn.style.border = (cat?.icon || 'tag') === ic ? '2px solid var(--primary)' : '1px solid var(--border)';
    btn.innerHTML = `<i data-lucide="${ic}"></i>`;
    btn.addEventListener('click', () => {
      body.querySelector('#catIcon').value = ic;
      picker.querySelectorAll('button').forEach(b => b.style.border = '1px solid var(--border)');
      btn.style.border = '2px solid var(--primary)';
    });
    picker.appendChild(btn);
  }
  refreshIcons(picker);

  const footer = document.createElement('div');
  footer.style.display = 'flex'; footer.style.gap = '8px'; footer.style.justifyContent = 'flex-end';
  const cancel = document.createElement('button'); cancel.className = 'btn btn-secondary'; cancel.textContent = 'Batal';
  const save = document.createElement('button'); save.className = 'btn btn-primary'; save.textContent = editId ? 'Simpan' : 'Tambah';
  footer.appendChild(cancel); footer.appendChild(save);

  const { close, modal } = openModal({ title: editId ? 'Edit kategori' : 'Tambah kategori', body, footer });
  cancel.addEventListener('click', close);
  save.addEventListener('click', () => {
    const form = modal.querySelector('#catForm');
    const name = form.name.value.trim();
    const type = form.type.value;
    const icon = form.icon.value;
    if (!name) { toastError('Nama kategori wajib diisi.'); return; }
    if (editId) {
      store.updateCategory(editId, { name, icon });
      toastSuccess('Kategori diperbarui.');
    } else {
      store.addCategory({ name, type, icon });
      toastSuccess('Kategori ditambahkan.');
    }
    close();
    renderCategories(document.getElementById('view-categories'));
  });
}

function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }
function escapeAttr(s) { return String(s).replace(/"/g, '&quot;'); }
