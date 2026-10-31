// components/notification-center.js
import { $, refreshIcons } from '../utils/dom.js';
import * as store from '../store.js';
import { formatCurrency } from '../utils/format.js';

let open = false;
let panel = null;

export function toggleNotificationCenter() {
  if (open) { closeNotif(); return; }
  openNotif();
}

function closeNotif() {
  if (panel) { panel.remove(); panel = null; }
  open = false;
}

function openNotif() {
  closeNotif();
  panel = document.createElement('div');
  panel.className = 'notif-panel';
  const items = buildNotifications();
  if (items.length === 0) {
    panel.innerHTML = `<div class="notif-item"><div class="notif-title">Tidak ada notifikasi</div><div class="notif-body">Semua dalam kondisi baik.</div></div>`;
  } else {
    panel.innerHTML = items.map(n => `
      <div class="notif-item">
        <div class="notif-title">${escapeHtml(n.title)}</div>
        <div class="notif-body">${escapeHtml(n.body)}</div>
      </div>`).join('');
  }
  document.getElementById('notifRoot').appendChild(panel);
  open = true;
  // close on outside click
  setTimeout(() => {
    const handler = (e) => {
      if (panel && !panel.contains(e.target) && e.target.id !== 'notifBtn' && !e.target.closest('#notifBtn')) {
        closeNotif();
        document.removeEventListener('click', handler);
      }
    };
    document.addEventListener('click', handler);
  }, 0);
}

function buildNotifications() {
  const state = store.getState();
  const out = [];
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  // budget warnings
  const budgets = store.getBudgets(month);
  for (const b of budgets) {
    const cat = store.getCategory(b.categoryId);
    if (!cat) continue;
    const spent = store.spentInCategory(month, b.categoryId);
    const pct = b.limit > 0 ? spent / b.limit : 0;
    if (pct >= 1) {
      out.push({ title: `Anggaran ${cat.name} terlampaui`, body: `Terpakai ${formatCurrency(spent)} dari ${formatCurrency(b.limit)}.` });
    } else if (pct >= 0.8) {
      out.push({ title: `Anggaran ${cat.name} mendekati batas`, body: `${Math.round(pct * 100)}% terpakai (${formatCurrency(spent)}).` });
    }
  }
  // recent transactions count
  const recent = state.transactions.slice(0, 1);
  if (state.transactions.length === 0) {
    out.push({ title: 'Belum ada transaksi', body: 'Tambahkan transaksi pertama Anda untuk mulai melacak keuangan.' });
  }
  // balance health
  const bal = store.balance();
  if (bal < 0) {
    out.push({ title: 'Saldo negatif', body: `Saldo saat ini ${formatCurrency(bal)}. Periksa pengeluaran Anda.` });
  }
  // last transaction
  if (state.transactions.length > 0) {
    const last = state.transactions[0];
    const cat = store.getCategory(last.categoryId);
    out.push({ title: 'Transaksi terakhir', body: `${last.name} — ${formatCurrency(last.amount)} (${cat ? cat.name : '-'})` });
  }
  return out;
}

function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }
export { closeNotif as closeNotificationCenter };
