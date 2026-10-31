// components/modal.js
import { $ } from '../utils/dom.js';
import { refreshIcons } from '../utils/dom.js';

let root = null;
function getRoot() { if (!root) root = document.getElementById('modalRoot'); return root; }

export function openModal({ title, body, footer, size = 'md', onClose } = {}) {
  const r = getRoot();
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  const modal = document.createElement('div');
  modal.className = 'modal';
  if (size === 'lg') modal.style.maxWidth = '720px';
  if (size === 'sm') modal.style.maxWidth = '400px';
  modal.innerHTML = `
    <div class="modal-header">
      <h2>${escapeHtml(title || '')}</h2>
      <button class="icon-btn" data-close aria-label="Tutup"><i data-lucide="x"></i></button>
    </div>
    <div class="modal-body"></div>
    <div class="modal-footer"></div>
  `;
  const bodyEl = modal.querySelector('.modal-body');
  if (typeof body === 'string') bodyEl.innerHTML = body;
  else if (body instanceof Node) bodyEl.appendChild(body);
  const footerEl = modal.querySelector('.modal-footer');
  if (footer) {
    if (typeof footer === 'string') footerEl.innerHTML = footer;
    else if (footer instanceof Node) footerEl.appendChild(footer);
  } else footerEl.remove();
  backdrop.appendChild(modal);
  r.appendChild(backdrop);
  refreshIcons(modal);

  const close = () => { backdrop.remove(); if (onClose) onClose(); };
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
  modal.querySelector('[data-close]').addEventListener('click', close);
  const onKey = (e) => { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); } };
  document.addEventListener('keydown', onKey);
  return { close, modal, bodyEl, footerEl };
}

export function confirmDialog({ title = 'Konfirmasi', message, confirmText = 'Hapus', danger = true, onConfirm }) {
  const footer = document.createElement('div');
  footer.style.display = 'flex'; footer.style.gap = '8px';
  const cancel = document.createElement('button'); cancel.className = 'btn btn-secondary'; cancel.textContent = 'Batal';
  const ok = document.createElement('button'); ok.className = danger ? 'btn btn-danger' : 'btn btn-primary'; ok.textContent = confirmText;
  footer.appendChild(cancel); footer.appendChild(ok);
  const { close } = openModal({ title, body: `<p>${escapeHtml(message)}</p>`, footer });
  cancel.addEventListener('click', close);
  ok.addEventListener('click', () => { close(); if (onConfirm) onConfirm(); });
}

function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }
