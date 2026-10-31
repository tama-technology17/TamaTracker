// pages/settings.js
import * as store from '../store.js';
import { $, refreshIcons } from '../utils/dom.js';
import { openModal, confirmDialog } from '../components/modal.js';
import { toastSuccess, toastError } from '../components/toast.js';
import { testConnection } from '../services/groq.js';

export function renderSettings(container) {
  const s = store.getState().settings;
  const voice = store.getVoiceSettings();
  const hasKey = Boolean(voice.apiKey);
  container.innerHTML = `
    <h2 style="margin-bottom:var(--space-5);">Pengaturan</h2>
    <div class="card settings-card">
      <div class="settings-row">
        <div>
          <div class="label">Tema</div>
          <div class="desc">Pilih tampilan terang atau gelap.</div>
        </div>
        <div class="row" style="gap:8px;">
          <button class="btn btn-secondary btn-sm" id="setLight">Terang</button>
          <button class="btn btn-secondary btn-sm" id="setDark">Gelap</button>
        </div>
      </div>
      <div class="settings-row">
        <div>
          <div class="label">Mode gelap aktif</div>
          <div class="desc">Toggle cepat.</div>
        </div>
        <div class="toggle ${s.theme === 'dark' ? 'on' : ''}" id="themeToggle2"></div>
      </div>
      <div class="settings-row">
        <div>
          <div class="label">Export data (JSON)</div>
          <div class="desc">Unduh seluruh data keuangan.</div>
        </div>
        <button class="btn btn-secondary btn-sm" id="exportJsonBtn"><i data-lucide="download"></i> Export</button>
      </div>
      <div class="settings-row">
        <div>
          <div class="label">Import data (JSON)</div>
          <div class="desc">Pulihkan data dari file JSON.</div>
        </div>
        <button class="btn btn-secondary btn-sm" id="importJsonBtn"><i data-lucide="upload"></i> Import</button>
      </div>
      <div class="settings-row">
        <div>
          <div class="label">Reset data</div>
          <div class="desc">Hapus semua transaksi, kategori kustom, dan anggaran.</div>
        </div>
        <button class="btn btn-danger btn-sm" id="resetBtn"><i data-lucide="trash-2"></i> Reset</button>
      </div>
      <div class="settings-row">
        <div>
          <div class="label">Onboarding</div>
          <div class="desc">Tampilkan ulang panduan awal aplikasi.</div>
        </div>
        <button class="btn btn-secondary btn-sm" id="replayOnboardingBtn"><i data-lucide="sparkles"></i> Tampilkan ulang</button>
      </div>
      <div class="settings-row">
        <div>
          <div class="label">Privasi</div>
          <div class="desc">Data keuangan disimpan lokal di browser Anda. Hanya teks perintah asisten suara yang dikirim ke Groq.</div>
        </div>
      </div>
    </div>

    <div class="card settings-card" style="margin-top:var(--space-4);">
      <div class="section-head">
        <h3>Asisten suara</h3>
        <span class="voice-key-status ${hasKey ? 'ok' : 'empty'}" id="keyStatus">${hasKey ? 'Key tersimpan' : 'Belum diatur'}</span>
      </div>
      <div class="settings-row" style="flex-direction:column;align-items:stretch;gap:var(--space-3);">
        <div>
          <div class="label">Groq API key</div>
          <div class="desc">Dapatkan key di <a href="https://console.groq.com/keys" target="_blank" rel="noopener">console.groq.com</a>. Key disimpan lokal di browser ini.</div>
        </div>
        <div class="voice-key-row">
          <input id="groqKey" type="password" value="${escapeAttr(voice.apiKey)}" placeholder="gsk_..." autocomplete="off" spellcheck="false" />
          <button class="icon-btn" id="toggleKey" aria-label="Tampilkan key"><i data-lucide="eye"></i></button>
        </div>
        <div class="row" style="gap:8px;flex-wrap:wrap;">
          <button class="btn btn-primary btn-sm" id="saveKey">Simpan key</button>
          <button class="btn btn-secondary btn-sm" id="testKey">Tes koneksi</button>
          <button class="btn btn-ghost btn-sm" id="clearKey" ${hasKey ? '' : 'disabled'}>Hapus key</button>
        </div>
      </div>
      <div class="settings-row">
        <div>
          <div class="label">Mode simpan transaksi</div>
          <div class="desc">Mode langsung menyimpan setelah perintah dipahami. Edit dan hapus tetap meminta konfirmasi.</div>
        </div>
        <div class="segmented" id="saveMode">
          <button data-mode="confirm" class="${voice.saveMode !== 'direct' ? 'active' : ''}">Selalu konfirmasi</button>
          <button data-mode="direct" class="${voice.saveMode === 'direct' ? 'active' : ''}">Langsung simpan</button>
        </div>
      </div>
      <div class="settings-row">
        <div>
          <div class="label">Cakupan asisten</div>
          <div class="desc">Asisten hanya memproses perintah pemasukan, pengeluaran, anggaran, saldo, kategori, dan laporan. Perintah lain ditolak.</div>
        </div>
      </div>
    </div>

    <div class="card settings-card" style="margin-top:var(--space-4);">
      <div class="section-head"><h3>Tentang</h3></div>
      <p class="muted" style="font-size:var(--fs-sm);">TamaTracker v1.1 — Pengelola keuangan pribadi. Dibangun dengan HTML, CSS, dan JavaScript vanilla. Data disimpan di LocalStorage.</p>
    </div>
  `;
  refreshIcons(container);

  container.querySelector('#setLight').addEventListener('click', () => { store.setTheme('light'); toastSuccess('Tema terang aktif.'); renderSettings(container); });
  container.querySelector('#setDark').addEventListener('click', () => { store.setTheme('dark'); toastSuccess('Tema gelap aktif.'); renderSettings(container); });
  container.querySelector('#themeToggle2').addEventListener('click', () => { store.toggleTheme(); renderSettings(container); });
  container.querySelector('#exportJsonBtn').addEventListener('click', () => {
    const data = store.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `tamatracker-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toastSuccess('Data diexport.');
  });
  container.querySelector('#importJsonBtn').addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'application/json';
    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          store.importData(reader.result);
          toastSuccess('Data berhasil diimport.');
          renderSettings(container);
        } catch (err) {
          toastError('Format file tidak valid.');
        }
      };
      reader.readAsText(file);
    });
    input.click();
  });
  container.querySelector('#resetBtn').addEventListener('click', () => {
    confirmDialog({
      title: 'Reset semua data',
      message: 'Semua data akan dihapus permanen. Lanjutkan?',
      confirmText: 'Reset',
      danger: true,
      onConfirm: () => { store.resetAll(); toastSuccess('Data direset.'); renderSettings(container); },
    });
  });
  container.querySelector('#replayOnboardingBtn').addEventListener('click', () => {
    store.setOnboardingCompleted(false);
    location.reload();
  });

  // --- Voice assistant settings ---
  const keyInput = container.querySelector('#groqKey');
  const statusEl = container.querySelector('#keyStatus');
  container.querySelector('#toggleKey').addEventListener('click', () => {
    const show = keyInput.type === 'password';
    keyInput.type = show ? 'text' : 'password';
    container.querySelector('#toggleKey').innerHTML = `<i data-lucide="${show ? 'eye-off' : 'eye'}"></i>`;
    refreshIcons(container.querySelector('#toggleKey'));
  });
  container.querySelector('#saveKey').addEventListener('click', () => {
    const key = keyInput.value.trim();
    store.setVoiceSettings({ apiKey: key });
    statusEl.textContent = key ? 'Key tersimpan' : 'Belum diatur';
    statusEl.className = `voice-key-status ${key ? 'ok' : 'empty'}`;
    toastSuccess(key ? 'API key disimpan.' : 'API key dihapus.');
    renderSettings(container);
  });
  container.querySelector('#clearKey').addEventListener('click', () => {
    store.setVoiceSettings({ apiKey: '' });
    toastSuccess('API key dihapus.');
    renderSettings(container);
  });
  container.querySelector('#testKey').addEventListener('click', async () => {
    const key = keyInput.value.trim();
    if (!key) { toastError('Isi API key terlebih dahulu.'); return; }
    const btn = container.querySelector('#testKey');
    btn.disabled = true;
    btn.textContent = 'Menguji...';
    statusEl.textContent = 'Menguji koneksi...';
    statusEl.className = 'voice-key-status';
    try {
      await testConnection(key);
      statusEl.textContent = 'Terhubung';
      statusEl.className = 'voice-key-status ok';
      toastSuccess('Koneksi Groq berhasil.');
    } catch (err) {
      statusEl.textContent = 'Gagal terhubung';
      statusEl.className = 'voice-key-status bad';
      toastError(err.message || 'Koneksi gagal.');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Tes koneksi';
    }
  });
  container.querySelectorAll('#saveMode [data-mode]').forEach(btn => {
    btn.addEventListener('click', () => {
      store.setVoiceSettings({ saveMode: btn.dataset.mode });
      renderSettings(container);
    });
  });
}

function escapeAttr(s) { return String(s || '').replace(/"/g, '&quot;'); }
