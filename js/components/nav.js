// components/nav.js
import { $, icon, refreshIcons } from '../utils/dom.js';

const ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
  { id: 'transactions', label: 'Transaksi', icon: 'arrow-left-right' },
  { id: 'budgets', label: 'Anggaran', icon: 'wallet' },
  { id: 'reports', label: 'Laporan', icon: 'bar-chart-3' },
  { id: 'categories', label: 'Kategori', icon: 'tags' },
  { id: 'settings', label: 'Pengaturan', icon: 'settings' },
];

export function renderSidebarNav(active, onClick) {
  const nav = document.getElementById('sidebarNav');
  nav.innerHTML = '';
  for (const it of ITEMS) {
    const btn = document.createElement('button');
    btn.className = 'nav-item' + (it.id === active ? ' active' : '');
    btn.dataset.view = it.id;
    btn.appendChild(icon(it.icon));
    const span = document.createElement('span'); span.textContent = it.label; btn.appendChild(span);
    btn.addEventListener('click', () => onClick(it.id));
    nav.appendChild(btn);
  }
  refreshIcons(nav);
}

export function renderBottomNav(active, onClick) {
  const nav = document.getElementById('bottomNav');
  nav.innerHTML = '';
  for (const it of ITEMS) {
    const btn = document.createElement('button');
    btn.className = 'nav-item' + (it.id === active ? ' active' : '');
    btn.dataset.view = it.id;
    btn.appendChild(icon(it.icon));
    const span = document.createElement('span'); span.textContent = it.label; btn.appendChild(span);
    btn.addEventListener('click', () => onClick(it.id));
    nav.appendChild(btn);
  }
  refreshIcons(nav);
}

export function updateTitles(view) {
  const map = { dashboard: 'Dashboard', transactions: 'Transaksi', budgets: 'Anggaran', reports: 'Laporan', categories: 'Kategori', settings: 'Pengaturan' };
  document.getElementById('pageTitle').textContent = map[view] || 'TamaTracker';
}
export { ITEMS };
