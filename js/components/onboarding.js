// components/onboarding.js
import { $, refreshIcons } from '../utils/dom.js';
import * as store from '../store.js';
import { toastSuccess } from './toast.js';

const STEPS = [
  {
    icon: null,
    title: 'Selamat datang di TamaTracker',
    copy: 'Catat pemasukan dan pengeluaran, atur anggaran, dan pantau kondisi keuangan Anda dalam satu tempat. Semua data tersimpan lokal di browser.',
  },
  {
    icon: 'receipt',
    title: 'Catat transaksi dalam hitungan detik',
    copy: 'Tambah pemasukan dan pengeluaran lengkap dengan kategori, tanggal, dan catatan. Saldo, dashboard, dan grafik diperbarui otomatis.',
  },
  {
    icon: 'wallet',
    title: 'Atur batas pengeluaran',
    copy: 'Tetapkan anggaran bulanan per kategori dan dapatkan peringatan saat mendekati atau melebihi batas.',
  },
  {
    icon: 'bar-chart-3',
    title: 'Pahami kondisi keuangan',
    copy: 'Lihat grafik dan laporan untuk mengetahui pengeluaran terbesar, tren saldo, dan arus kas per periode.',
  },
  {
    icon: 'mic',
    title: 'Catat dengan suara',
    copy: 'Ucapkan perintah seperti “burger 10 ribu” dan asisten AI akan mencatatnya. Memerlukan API key Groq di Pengaturan.',
  },
];

let backdrop = null;
let card = null;
let step = 0;
let onComplete = null;

export function isOnboardingNeeded() {
  return !store.getOnboardingCompleted();
}

export function mountOnboarding(done) {
  if (backdrop) return;
  onComplete = done || (() => {});
  step = 0;
  document.body.style.overflow = 'hidden';
  backdrop = document.createElement('div');
  backdrop.className = 'onboarding-backdrop';
  backdrop.innerHTML = `
    <div class="onboarding-card" role="dialog" aria-modal="true" aria-labelledby="obTitle">
      <div class="onboarding-logo">
        <img src="assets/logo.svg" alt="TamaTracker" width="64" height="64" />
      </div>
      <div class="onboarding-progress" id="obProgress" aria-live="polite"></div>
      <h2 id="obTitle"></h2>
      <p class="onboarding-copy" id="obCopy"></p>
      <div class="onboarding-actions">
        <button class="btn btn-ghost" id="obSkip">Lewati</button>
        <button class="btn btn-primary" id="obNext">Lanjut</button>
      </div>
    </div>
  `;
  document.body.appendChild(backdrop);
  card = backdrop.querySelector('.onboarding-card');
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) skip(); });
  document.addEventListener('keydown', onKey);
  render();
  refreshIcons(card);
}

function onKey(e) {
  if (e.key === 'Escape') skip();
}

function render() {
  if (!card) return;
  const s = STEPS[step];
  const title = card.querySelector('#obTitle');
  const copy = card.querySelector('#obCopy');
  const next = card.querySelector('#obNext');
  const progress = card.querySelector('#obProgress');

  // title with optional icon
  if (s.icon) {
    title.innerHTML = `<span class="onboarding-icon"><i data-lucide="${s.icon}"></i></span> ${escapeHtml(s.title)}`;
  } else {
    title.textContent = s.title;
  }
  copy.textContent = s.copy;
  next.textContent = step === STEPS.length - 1 ? 'Mulai' : 'Lanjut';

  // progress dots
  progress.innerHTML = `
    <span class="ob-step-label">Langkah ${step + 1} dari ${STEPS.length}</span>
    <span class="ob-dots">${STEPS.map((_, i) => `<span class="ob-dot ${i === step ? 'active' : i < step ? 'done' : ''}"></span>`).join('')}</span>
  `;
  refreshIcons(card);

  // bind
  card.querySelector('#obNext').onclick = () => {
    if (step < STEPS.length - 1) { step++; render(); }
    else finish();
  };
  card.querySelector('#obSkip').onclick = skip;
}

function skip() {
  finish(true);
}

function finish(skipped = false) {
  store.setOnboardingCompleted(true);
  if (backdrop) backdrop.remove();
  backdrop = null;
  card = null;
  document.body.style.overflow = '';
  document.removeEventListener('keydown', onKey);
  if (onComplete) onComplete(skipped);
}

export function resetOnboarding() {
  store.setOnboardingCompleted(false);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
