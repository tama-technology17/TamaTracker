# TamaTracker

Aplikasi pengelola keuangan pribadi berbasis web untuk mencatat pemasukan, pengeluaran, saldo, anggaran, transaksi, serta menganalisis kondisi keuangan melalui grafik dan laporan. Seluruh data disimpan secara lokal di browser (LocalStorage) — tidak ada backend dan tidak ada data yang dikirim ke server, kecuali teks perintah asisten suara yang diproses oleh Groq.

## Fitur Utama

- **Dashboard** — ringkasan saldo, pemasukan, pengeluaran, selisih, persentase perubahan; 4 grafik Chart.js (pemasukan vs pengeluaran, arus kas, pengeluaran per kategori, perkembangan saldo) dengan filter harian/mingguan/bulanan/tahunan; transaksi terbaru.
- **Manajemen Transaksi** — tambah, edit, hapus (dengan konfirmasi), validasi input, pencarian, filter kategori/jenis/tanggal, sorting nominal & tanggal.
- **Manajemen Kategori** — kategori bawaan pemasukan & pengeluaran, buat/edit/hapus kategori + pilih ikon; penghapusan kategori memindahkan transaksi ke "Lainnya" agar data tidak rusak.
- **Anggaran** — anggaran bulanan per kategori, progress bar, peringatan ≥80% dan terlampaui.
- **Laporan** — total pemasukan/pengeluaran, net cash flow, kategori terbesar, rata-rata pengeluaran, riwayat saldo; filter mingguan/bulanan/tahunan/custom range; export CSV & cetak.
- **Asisten Suara AI (Groq)** — buat/edit/hapus pemasukan & pengeluaran dengan perintah suara atau teks, anti-jailbreak (hanya perintah keuangan yang dilayani), badge True/False, mode konfirmasi/langsung simpan, undo.
- **Pengaturan** — tema terang/gelap, export/import JSON, reset data, API key Groq, catatan privasi.
- **Light/Dark mode** tersimpan di LocalStorage.
- Empty states, notification center, quick actions, global search.

## Teknologi

- HTML5, CSS3, Vanilla JavaScript (ES6+ Modules)
- Chart.js, Lucide Icons, Google Fonts (Plus Jakarta Sans)
- LocalStorage untuk persistensi
- Model AI: `openai/gpt-oss-20b` via Groq API

Tanpa React/Vue/Angular/Next.js, tanpa Tailwind/Bootstrap, tanpa backend.

## Cara Menjalankan

Karena menggunakan ES Modules, jalankan lewat server lokal (bukan `file://`):

```bash
# Python
python3 -m http.server 8080

# Node
npx serve .
```

Lalu buka `http://localhost:8080`.

Untuk asisten suara: buka **Pengaturan → Asisten Suara**, masukkan Groq API key (dapatkan di console.groq.com), klik **Tes koneksi**, lalu tekan tombol mic di tengah bawah atau `Ctrl/Cmd + K`.

## Struktur Proyek

```
TamaTracker/
├── index.html
├── css/
│   ├── tokens.css, base.css, layout.css, components.css, pages.css, voice.css
├── js/
│   ├── app.js, store.js, db.js
│   ├── utils/ (format, date, id, dom)
│   ├── components/ (nav, modal, toast, notification-center, voice-assistant)
│   ├── pages/ (dashboard, transactions, budgets, reports, categories, settings)
│   ├── charts/ (charts.js)
│   └── services/ (groq, voice, assistant)
└── assets/
```

## Catatan Keamanan

- Data keuangan disimpan lokal di browser.
- API key Groq disimpan lokal dan tidak ikut ter-export saat export JSON.
- Hanya teks perintah asisten suara yang dikirim ke Groq; data transaksi tidak dikirim.

## Lisensi

MIT — bebas digunakan dan dimodifikasi.
