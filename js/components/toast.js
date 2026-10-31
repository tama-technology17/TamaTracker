// components/toast.js
import { $ } from '../utils/dom.js';

let container = null;
function getContainer() {
  if (!container) container = document.getElementById('toastRoot');
  return container;
}

const icons = { success: 'check-circle', error: 'alert-circle', warning: 'alert-triangle', info: 'info' };

export function toast(message, type = 'info', duration = 3000) {
  const c = getContainer();
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<i data-lucide="${icons[type] || 'info'}"></i><span>${escapeHtml(message)}</span>`;
  c.appendChild(t);
  if (window.lucide) window.lucide.createIcons({ root: t });
  const timer = setTimeout(() => remove(t), duration);
  t.addEventListener('click', () => { clearTimeout(timer); remove(t); });
  return t;
}

function remove(t) {
  t.style.opacity = '0';
  t.style.transform = 'translateX(20px)';
  t.style.transition = 'opacity 180ms, transform 180ms';
  setTimeout(() => t.remove(), 180);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}
export const toastSuccess = (m) => toast(m, 'success');
export const toastError = (m) => toast(m, 'error');
export const toastWarn = (m) => toast(m, 'warning');
export const toastInfo = (m) => toast(m, 'info');
