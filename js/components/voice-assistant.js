// components/voice-assistant.js
import * as store from '../store.js';
import { analyzeCommand, buildPlan, planForTransaction } from '../services/assistant.js';
import { createRecognizer, isSpeechSupported } from '../services/voice.js';
import { formatCurrency, formatDate } from '../utils/format.js';
import { refreshIcons } from '../utils/dom.js';
import { toastSuccess } from './toast.js';

let backdrop = null;
let sheet = null;
let recognizer = null;
let lastFocused = null;

const ui = {
  phase: 'idle',
  transcript: '',
  interim: '',
  classification: null,
  plan: null,
  saved: null,
  answer: '',
  error: '',
  errorCode: '',
  matches: null,
};

const SAMPLES = ['burger 10 ribu', 'gaji 5 juta', 'kemarin bensin 50rb', 'berapa pengeluaran bulan ini?'];

export function mountVoiceAssistant() {
  const fab = document.getElementById('voiceFab');
  if (fab) fab.addEventListener('click', openAssistant);
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      openAssistant();
    }
  });
}

export function openAssistant() {
  if (backdrop) return;
  lastFocused = document.activeElement;
  resetUI();
  backdrop = document.createElement('div');
  backdrop.className = 'voice-backdrop';
  backdrop.innerHTML = `
    <div class="voice-sheet" role="dialog" aria-modal="true" aria-labelledby="vaTitle">
      <div class="voice-grabber" aria-hidden="true"></div>
      <div class="voice-head">
        <h2 id="vaTitle">Asisten suara</h2>
        <button class="icon-btn" id="vaCloseBtn" aria-label="Tutup asisten"><i data-lucide="x"></i></button>
      </div>
      <div class="voice-body" id="vaBody" aria-live="polite"></div>
    </div>
  `;
  document.getElementById('voiceRoot').appendChild(backdrop);
  sheet = backdrop.querySelector('.voice-sheet');
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeAssistant(); });
  backdrop.querySelector('#vaCloseBtn').addEventListener('click', closeAssistant);
  document.addEventListener('keydown', onKey);
  render();
}

export function closeAssistant() {
  if (recognizer) { recognizer.abort(); recognizer = null; }
  if (backdrop) backdrop.remove();
  backdrop = null;
  sheet = null;
  document.removeEventListener('keydown', onKey);
  if (lastFocused && lastFocused.focus) lastFocused.focus();
}

function onKey(e) {
  if (e.key === 'Escape') closeAssistant();
}

function resetUI() {
  Object.assign(ui, {
    phase: 'idle', transcript: '', interim: '', classification: null,
    plan: null, saved: null, answer: '', error: '', errorCode: '', matches: null,
  });
}

function apiKeyMissing() {
  return !store.getVoiceSettings().apiKey;
}

function render() {
  if (!sheet) return;
  sheet.scrollTop = 0;
  const body = sheet.querySelector('#vaBody');
  const title = sheet.querySelector('#vaTitle');
  if (apiKeyMissing() && ui.phase !== 'setup') ui.phase = 'setup';

  const titles = {
    setup: 'Hubungkan Groq', idle: 'Asisten suara', listening: 'Mendengarkan',
    review: 'Periksa transkrip', processing: 'Memeriksa perintah', false: 'Tidak terkait keuangan',
    confirm: 'Konfirmasi', saved: 'Selesai', query: 'Jawaban', matches: 'Pilih transaksi', error: 'Terjadi kesalahan',
  };
  title.textContent = titles[ui.phase] || 'Asisten suara';

  switch (ui.phase) {
    case 'setup': body.innerHTML = setupHtml(); break;
    case 'idle': body.innerHTML = idleHtml(); break;
    case 'listening': body.innerHTML = listeningHtml(); break;
    case 'review': body.innerHTML = reviewHtml(); break;
    case 'processing': body.innerHTML = processingHtml(); break;
    case 'false': body.innerHTML = falseHtml(); break;
    case 'confirm': body.innerHTML = confirmHtml(); break;
    case 'saved': body.innerHTML = savedHtml(); break;
    case 'query': body.innerHTML = queryHtml(); break;
    case 'matches': body.innerHTML = matchesHtml(); break;
    case 'error': body.innerHTML = errorHtml(); break;
  }
  refreshIcons(body);
  bind();
}

function setupHtml() {
  return `
    <div class="voice-center">
      <div class="voice-orb idle"><i data-lucide="key-round"></i></div>
      <h3>Tambahkan API key Groq</h3>
      <p class="voice-copy">Asisten suara memakai Groq untuk memahami perintah. Key disimpan lokal di browser dan hanya dikirim ke Groq.</p>
      <button class="btn btn-primary" id="vaOpenSettings">Buka Pengaturan</button>
    </div>`;
}

function idleHtml() {
  const supported = isSpeechSupported();
  return `
    <div class="voice-center">
      <button class="voice-orb idle" id="vaMic" aria-label="Mulai merekam suara">
        <i data-lucide="mic"></i>
      </button>
      <p class="voice-hint">${supported ? 'Tekan mic lalu ucapkan perintah' : 'Browser ini belum mendukung mikrofon. Ketik perintah di bawah.'}</p>
    </div>
    <div class="voice-chips" aria-label="Contoh perintah">
      ${SAMPLES.map(s => `<button class="voice-chip" data-sample="${escapeAttr(s)}">${escapeHtml(s)}</button>`).join('')}
    </div>
    <form class="voice-type" id="vaForm">
      <input id="vaText" type="text" maxlength="500" placeholder="Atau ketik perintah..." autocomplete="off" />
      <button class="btn btn-primary btn-sm" type="submit">Kirim</button>
    </form>
    <p class="voice-foot">Teks perintah dikirim ke Groq. Data transaksi tidak dikirim.</p>`;
}

function listeningHtml() {
  return `
    <div class="voice-center">
      <div class="voice-orb listening"><i data-lucide="mic"></i></div>
      <div class="waveform" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span></div>
      <p class="voice-transcript live" id="vaLive">${escapeHtml(ui.interim || 'Mendengarkan...')}</p>
      <button class="btn btn-secondary" id="vaStop">Berhenti</button>
    </div>`;
}

function reviewHtml() {
  return `
    <div class="voice-field">
      <label class="voice-label" for="vaTranscript">Transkrip</label>
      <textarea id="vaTranscript" rows="3" maxlength="500">${escapeHtml(ui.transcript)}</textarea>
      <p class="voice-foot">Periksa dan perbaiki bila perlu, lalu kirim.</p>
    </div>
    <div class="voice-actions">
      <button class="btn btn-secondary" id="vaRetry">Ulangi</button>
      <button class="btn btn-primary" id="vaSubmit">Periksa</button>
    </div>`;
}

function processingHtml() {
  return `
    <div class="voice-center">
      <div class="voice-orb thinking"><i data-lucide="scan-text"></i></div>
      <p class="voice-transcript">${escapeHtml(ui.transcript)}</p>
      <div class="voice-steps"><span class="active">Klasifikasi</span><span>Parsing</span></div>
    </div>`;
}

function falseHtml() {
  return `
    <div class="voice-center">
      <div class="voice-badge false">False</div>
      <h3>Tidak berhubungan dengan keuangan</h3>
      <p class="voice-copy">${escapeHtml(ui.classification?.reason || 'Perintah ini berada di luar cakupan asisten keuangan.')}</p>
      <p class="voice-copy muted">Saya hanya bisa membantu mencatat pemasukan, pengeluaran, anggaran, dan laporan keuangan.</p>
    </div>
    <div class="voice-actions">
      <button class="btn btn-secondary" id="vaReset">Coba lagi</button>
      <button class="btn btn-ghost" id="vaClose2">Tutup</button>
    </div>`;
}

function confirmHtml() {
  const p = ui.plan.preview;
  const isDelete = ui.plan.type === 'delete';
  const isBudget = ui.plan.type === 'budget';
  const sign = p.type === 'income' ? '+' : '-';
  return `
    <div class="voice-badge true">True</div>
    <div class="voice-preview">
      <div class="voice-preview-icon ${p.type}"><i data-lucide="${p.icon}"></i></div>
      <div class="voice-preview-main">
        <div class="voice-preview-name">${escapeHtml(p.name)}</div>
        <div class="voice-preview-meta">${escapeHtml(p.categoryName)} · ${isBudget ? 'Bulan ' + escapeHtml(p.date.slice(0, 7)) : formatDate(p.date)}</div>
      </div>
      <div class="voice-preview-amount ${p.type}">${isBudget ? '' : sign}${formatCurrency(p.amount)}</div>
    </div>
    <p class="voice-reply">${escapeHtml(ui.plan.reply)}</p>
    ${isDelete ? '<p class="voice-warning">Transaksi akan dihapus permanen.</p>' : ''}
    <div class="voice-actions">
      <button class="btn btn-secondary" id="vaCancel">Batal</button>
      <button class="btn ${isDelete ? 'btn-danger' : 'btn-primary'}" id="vaConfirm">${isDelete ? 'Hapus' : 'Simpan'}</button>
    </div>`;
}

function savedHtml() {
  const p = ui.saved?.preview;
  return `
    <div class="voice-badge true">True</div>
    <div class="voice-success">
      <div class="voice-success-icon"><i data-lucide="check"></i></div>
      <div>
        <div class="voice-success-title">${escapeHtml(ui.saved?.message || 'Berhasil.')}</div>
        ${p ? `<div class="voice-preview-meta">${escapeHtml(p.name)} · ${formatCurrency(p.amount)}</div>` : ''}
      </div>
    </div>
    <div class="voice-actions">
      <button class="btn btn-secondary" id="vaUndo">Urungkan</button>
      <button class="btn btn-primary" id="vaDone">Selesai</button>
    </div>`;
}

function queryHtml() {
  return `
    <div class="voice-badge true">True</div>
    <div class="voice-answer">${escapeHtml(ui.answer)}</div>
    <div class="voice-actions">
      <button class="btn btn-secondary" id="vaReset">Tanya lagi</button>
      <button class="btn btn-primary" id="vaDone">Selesai</button>
    </div>`;
}

function matchesHtml() {
  const matches = ui.matches?.matches || [];
  return `
    <div class="voice-badge true">True</div>
    <p class="voice-copy">Ada ${matches.length} transaksi yang cocok. Pilih satu.</p>
    <div class="voice-match-list">
      ${matches.map(t => {
        const cat = store.getCategory(t.categoryId);
        return `<button class="voice-match" data-match="${t.id}">
          <span class="voice-match-icon ${t.type}"><i data-lucide="${cat ? cat.icon : 'tag'}"></i></span>
          <span class="voice-match-main">
            <span class="voice-match-name">${escapeHtml(t.name)}</span>
            <span class="voice-preview-meta">${escapeHtml(cat ? cat.name : 'Lainnya')} · ${formatDate(t.date)}</span>
          </span>
          <span class="voice-match-amount ${t.type}">${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount)}</span>
        </button>`;
      }).join('')}
    </div>
    <div class="voice-actions"><button class="btn btn-secondary" id="vaCancel">Batal</button></div>`;
}

function errorHtml() {
  return `
    ${ui.classification?.related ? '<div class="voice-badge true">True</div>' : ''}
    <div class="voice-center">
      <div class="voice-orb error"><i data-lucide="alert-circle"></i></div>
      <h3>Perintah belum berhasil</h3>
      <p class="voice-copy">${escapeHtml(ui.error)}</p>
    </div>
    <div class="voice-actions">
      ${ui.errorCode === 'no_key' || ui.errorCode === 'auth' ? '<button class="btn btn-secondary" id="vaOpenSettings">Buka Pengaturan</button>' : '<button class="btn btn-secondary" id="vaReset">Coba lagi</button>'}
      <button class="btn btn-primary" id="vaClose2">Tutup</button>
    </div>`;
}

function bind() {
  const body = sheet.querySelector('#vaBody');
  body.querySelector('#vaMic')?.addEventListener('click', startListening);
  body.querySelector('#vaStop')?.addEventListener('click', () => { if (recognizer) recognizer.stop(); });
  body.querySelector('#vaRetry')?.addEventListener('click', () => { ui.transcript = ''; ui.phase = 'idle'; render(); });
  body.querySelector('#vaSubmit')?.addEventListener('click', () => {
    const val = body.querySelector('#vaTranscript')?.value || '';
    submitCommand(val);
  });
  body.querySelectorAll('[data-sample]').forEach(btn => {
    btn.addEventListener('click', () => submitCommand(btn.dataset.sample));
  });
  body.querySelector('#vaForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    submitCommand(body.querySelector('#vaText')?.value || '');
  });
  body.querySelector('#vaReset')?.addEventListener('click', () => { resetUI(); render(); });
  body.querySelector('#vaClose2')?.addEventListener('click', closeAssistant);
  body.querySelector('#vaOpenSettings')?.addEventListener('click', () => {
    closeAssistant();
    document.dispatchEvent(new CustomEvent('navigate', { detail: 'settings' }));
  });
  body.querySelector('#vaCancel')?.addEventListener('click', () => { ui.phase = 'idle'; render(); });
  body.querySelector('#vaConfirm')?.addEventListener('click', () => { if (ui.plan) executePlan(ui.plan); });
  body.querySelector('#vaUndo')?.addEventListener('click', () => {
    if (ui.saved?.undo) { ui.saved.undo(); toastSuccess('Perubahan diurungkan.'); }
    resetUI(); render();
  });
  body.querySelector('#vaDone')?.addEventListener('click', closeAssistant);
  body.querySelectorAll('[data-match]').forEach(btn => {
    btn.addEventListener('click', () => {
      const tx = store.getTransaction(btn.dataset.match);
      if (!tx || !ui.matches) return;
      const plan = planForTransaction(tx, ui.matches.intent, ui.matches.parsed);
      if (plan.type === 'error') { ui.error = plan.message; ui.phase = 'error'; render(); return; }
      ui.plan = plan;
      ui.phase = 'confirm';
      render();
    });
  });
}

function startListening() {
  if (!isSpeechSupported()) {
    ui.error = 'Browser ini tidak mendukung pengenalan suara. Ketik perintah di kolom teks.';
    ui.phase = 'error';
    render();
    return;
  }
  ui.interim = '';
  ui.phase = 'listening';
  render();
  try {
    recognizer = createRecognizer({
      onInterim: (text) => {
        ui.interim = text;
        const live = sheet?.querySelector('#vaLive');
        if (live) live.textContent = text || 'Mendengarkan...';
      },
      onFinal: (text) => {
        recognizer = null;
        if (ui.phase !== 'listening') return;
        if (text) { ui.transcript = text; ui.phase = 'review'; }
        else { ui.phase = 'idle'; }
        render();
      },
      onError: (message) => {
        if (ui.phase !== 'listening') return;
        ui.error = message;
        ui.phase = 'error';
        render();
      },
    });
    recognizer.start();
  } catch (e) {
    ui.error = e.message || 'Tidak dapat memulai mikrofon.';
    ui.phase = 'error';
    render();
  }
}

async function submitCommand(raw) {
  const text = String(raw || '').trim();
  if (!text) return;
  if (text.length > 500) {
    ui.error = 'Perintah terlalu panjang. Maksimal 500 karakter.';
    ui.phase = 'error';
    render();
    return;
  }
  ui.transcript = text;
  ui.phase = 'processing';
  ui.classification = null;
  ui.error = '';
  render();

  try {
    const result = await analyzeCommand(text);
    ui.classification = result.classification;
    if (result.rejected) { ui.phase = 'false'; render(); return; }
    const plan = buildPlan(result.parsed);
    if (plan.type === 'error') { ui.error = plan.message; ui.phase = 'error'; render(); return; }
    if (plan.type === 'query') { ui.answer = plan.answer; ui.phase = 'query'; render(); return; }
    if (plan.type === 'matches') { ui.matches = plan; ui.phase = 'matches'; render(); return; }
    ui.plan = plan;
    const mode = store.getVoiceSettings().saveMode;
    if (mode === 'direct' && (plan.type === 'create' || plan.type === 'budget')) {
      executePlan(plan);
    } else {
      ui.phase = 'confirm';
      render();
    }
  } catch (err) {
    ui.error = err?.message || 'Terjadi kesalahan. Coba lagi.';
    ui.errorCode = err?.code || '';
    ui.phase = 'error';
    render();
  }
}

function executePlan(plan) {
  try {
    const result = plan.apply();
    ui.saved = { message: plan.reply, preview: plan.preview, undo: () => plan.undo(result) };
    ui.phase = 'saved';
    toastSuccess(plan.reply);
    render();
  } catch (e) {
    ui.error = 'Gagal menyimpan perubahan. Coba lagi.';
    ui.phase = 'error';
    render();
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function escapeAttr(s) { return String(s).replace(/"/g, '&quot;'); }
