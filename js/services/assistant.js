// services/assistant.js
import * as store from '../store.js';
import { classifyCommand, parseCommand, GroqError } from './groq.js';
import { formatCurrency, todayISO } from '../utils/format.js';

const ALLOWED_INTENTS = ['create_transaction', 'update_transaction', 'delete_transaction', 'query_finance', 'create_budget', 'unknown'];

export async function analyzeCommand(text) {
  const voice = store.getVoiceSettings();
  if (!voice.apiKey) {
    throw new GroqError('API key Groq belum diatur. Buka Pengaturan untuk menambahkannya.', 'no_key');
  }
  const classification = await classifyCommand(text, voice.apiKey);
  if (!classification.related) {
    return { classification, parsed: null, rejected: true };
  }
  const state = store.getState();
  const incomeCats = state.categories.filter(c => c.type === 'income').map(c => c.name);
  const expenseCats = state.categories.filter(c => c.type === 'expense').map(c => c.name);
  const parsed = await parseCommand(text, voice.apiKey, { today: todayISO(), incomeCats, expenseCats });
  return { classification, parsed, rejected: false };
}

export function buildPlan(parsed) {
  if (!parsed || typeof parsed !== 'object') {
    return { type: 'error', message: 'Perintah tidak dapat diproses. Coba ulangi dengan kalimat yang lebih jelas.' };
  }
  const intent = String(parsed.intent || 'unknown').trim().toLowerCase();
  if (!ALLOWED_INTENTS.includes(intent)) {
    return { type: 'error', message: 'Perintah tidak dikenali. Saya hanya bisa membantu mencatat pemasukan, pengeluaran, anggaran, dan laporan.' };
  }
  if (intent === 'unknown') {
    return { type: 'error', message: parsed.reply || 'Perintah belum jelas. Sebutkan nama, nominal, dan jenis transaksinya.' };
  }
  if (intent === 'query_finance') {
    return { type: 'query', answer: resolveQuery(parsed), reply: parsed.reply || '' };
  }
  if (intent === 'create_transaction') return buildCreate(parsed);
  if (intent === 'update_transaction' || intent === 'delete_transaction') return buildEditDelete(parsed, intent);
  if (intent === 'create_budget') return buildBudget(parsed);
  return { type: 'error', message: 'Perintah tidak dikenali.' };
}

function normType(value) {
  const t = String(value || '').trim().toLowerCase();
  return t === 'income' || t === 'expense' ? t : null;
}

function validateTransaction(parsed) {
  const type = normType(parsed.type);
  if (!type) return { error: 'Jenis transaksi harus pemasukan atau pengeluaran.' };
  const amount = Math.round(Number(parsed.amount));
  if (!Number.isFinite(amount) || amount <= 0) return { error: 'Nominal harus angka positif. Sebutkan nominalnya, misalnya "burger 10 ribu".' };
  const name = String(parsed.name || '').trim();
  if (!name) return { error: 'Nama transaksi belum disebutkan.' };
  const date = normalizeDate(parsed.date);
  const category = resolveCategory(parsed.category, type);
  return { type, amount, name, date, category };
}

function buildCreate(parsed) {
  const v = validateTransaction(parsed);
  if (v.error) return { type: 'error', message: v.error };
  const preview = {
    type: v.type, name: v.name, amount: v.amount, date: v.date,
    categoryId: v.category?.id || null, categoryName: v.category?.name || 'Lainnya',
    icon: v.category?.icon || 'tag', note: parsed.note || '',
  };
  const apply = () => {
    const tx = store.addTransaction({
      type: v.type, name: v.name, amount: v.amount,
      categoryId: v.category?.id || null, date: v.date, note: parsed.note || '',
    });
    return tx;
  };
  return {
    type: 'create',
    preview,
    apply,
    undo: (tx) => { if (tx) store.deleteTransaction(tx.id); },
    reply: parsed.reply || `Mencatat ${v.type === 'income' ? 'pemasukan' : 'pengeluaran'} ${v.name} sebesar ${formatCurrency(v.amount)}.`,
  };
}

function buildEditDelete(parsed, intent) {
  const type = normType(parsed.type);
  const target = parsed.target || {};
  const name = String(target.name || parsed.name || '').trim();
  const amount = Number(target.amount) || (intent === 'delete_transaction' ? Number(parsed.amount) : 0) || 0;
  const date = target.date ? normalizeDate(target.date) : '';
  if (!name && !amount && !date) {
    return { type: 'error', message: 'Sebutkan transaksi yang ingin diubah atau dihapus, misalnya "hapus burger tadi".' };
  }
  let list = store.getState().transactions.slice();
  if (type) list = list.filter(t => t.type === type);
  if (name) list = list.filter(t => t.name.toLowerCase().includes(name.toLowerCase()));
  if (date) list = list.filter(t => t.date === date);
  if (amount) list = list.filter(t => Number(t.amount) === Math.round(amount));
  list.sort((a, b) => new Date(b.date) - new Date(a.date));

  if (list.length === 0) {
    return { type: 'error', message: `Transaksi "${name || 'tersebut'}" tidak ditemukan.` };
  }
  if (list.length > 1) {
    return { type: 'matches', intent, matches: list.slice(0, 5), parsed };
  }
  return intent === 'delete_transaction' ? buildDelete(list[0], parsed) : buildUpdate(list[0], parsed);
}

function buildUpdate(tx, parsed) {
  const type = normType(parsed.type) || tx.type;
  const amount = Math.round(Number(parsed.amount)) || tx.amount;
  if (!Number.isFinite(amount) || amount <= 0) {
    return { type: 'error', message: 'Nominal baru harus angka positif.' };
  }
  const name = String(parsed.name || '').trim() || tx.name;
  const date = parsed.date ? normalizeDate(parsed.date) : tx.date;
  const category = parsed.category ? resolveCategory(parsed.category, type) : store.getCategory(tx.categoryId);
  const before = { ...tx };
  const patch = {
    type, name, amount,
    categoryId: category?.id || tx.categoryId, date,
    note: parsed.note ?? tx.note,
  };
  const preview = {
    type, name, amount, date,
    categoryId: patch.categoryId, categoryName: category?.name || 'Lainnya',
    icon: category?.icon || 'tag', note: patch.note,
  };
  return {
    type: 'update',
    preview,
    targetId: tx.id,
    apply: () => store.updateTransaction(tx.id, patch),
    undo: () => store.updateTransaction(tx.id, before),
    reply: parsed.reply || `Memperbarui transaksi ${name}.`,
  };
}

function buildDelete(tx, parsed) {
  const cat = store.getCategory(tx.categoryId);
  const preview = {
    type: tx.type, name: tx.name, amount: tx.amount, date: tx.date,
    categoryId: tx.categoryId, categoryName: cat?.name || 'Lainnya', icon: cat?.icon || 'tag', note: tx.note,
  };
  return {
    type: 'delete',
    preview,
    targetId: tx.id,
    apply: () => store.deleteTransaction(tx.id),
    undo: () => store.restoreTransaction({ ...tx }),
    reply: parsed.reply || `Menghapus transaksi ${tx.name}.`,
  };
}

function buildBudget(parsed) {
  const amount = Math.round(Number(parsed.amount));
  if (!Number.isFinite(amount) || amount <= 0) return { type: 'error', message: 'Batas anggaran harus angka positif.' };
  const category = resolveCategory(parsed.category, 'expense');
  if (!category) return { type: 'error', message: 'Kategori anggaran tidak ditemukan.' };
  const month = (parsed.date ? normalizeDate(parsed.date) : todayISO()).slice(0, 7);
  const existing = store.getBudgets(month).find(b => b.categoryId === category.id);
  const preview = {
    kind: 'budget', type: 'expense', name: `Anggaran ${category.name}`,
    amount, date: month + '-01', categoryId: category.id, categoryName: category.name,
    icon: category.icon || 'wallet', note: `Bulan ${month}`,
  };
  return {
    type: 'budget',
    preview,
    apply: () => { store.setBudget(month, category.id, amount); },
    undo: () => {
      const b = store.getBudgets(month).find(x => x.categoryId === category.id);
      if (b) store.deleteBudget(b.id);
    },
    reply: parsed.reply || `Mengatur anggaran ${category.name} sebesar ${formatCurrency(amount)}.`,
  };
}

function resolveCategory(name, type) {
  const cats = store.getState().categories.filter(c => c.type === type);
  if (!cats.length) return null;
  const q = String(name || '').trim().toLowerCase();
  if (q) {
    const exact = cats.find(c => c.name.toLowerCase() === q);
    if (exact) return exact;
    const partial = cats.find(c => c.name.toLowerCase().includes(q) || q.includes(c.name.toLowerCase()));
    if (partial) return partial;
  }
  return cats.find(c => c.name.toLowerCase() === 'lainnya') || cats[0];
}

function normalizeDate(value) {
  if (!value) return todayISO();
  const s = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (!isNaN(d)) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  return todayISO();
}

function resolveQuery(parsed) {
  const q = parsed.query || {};
  const metric = q.metric || 'expense';
  const period = q.period || 'month';
  const t = store.totalsFor(period);
  const label = periodLabel(period);
  if (metric === 'balance') return `Saldo Anda saat ini ${formatCurrency(store.balance())}.`;
  if (metric === 'income') return `Pemasukan ${label} sebesar ${formatCurrency(t.income)} dari ${t.count} transaksi.`;
  if (metric === 'expense') return `Pengeluaran ${label} sebesar ${formatCurrency(t.expense)} dari ${t.count} transaksi.`;
  if (metric === 'net') return `Arus kas bersih ${label} sebesar ${formatCurrency(t.net)} (pemasukan ${formatCurrency(t.income)}, pengeluaran ${formatCurrency(t.expense)}).`;
  if (metric === 'count') return `Ada ${t.count} transaksi ${label}.`;
  if (metric === 'top_category') {
    const map = {};
    for (const tx of t.list) {
      if (tx.type !== 'expense') continue;
      map[tx.categoryId] = (map[tx.categoryId] || 0) + tx.amount;
    }
    const top = Object.entries(map).sort((a, b) => b[1] - a[1])[0];
    if (!top) return `Belum ada pengeluaran ${label}.`;
    const cat = store.getCategory(top[0]);
    return `Kategori pengeluaran terbesar ${label} adalah ${cat ? cat.name : 'Lainnya'} sebesar ${formatCurrency(top[1])}.`;
  }
  return `Pengeluaran ${label} sebesar ${formatCurrency(t.expense)}.`;
}

function periodLabel(p) {
  return { day: 'hari ini', week: 'minggu ini', month: 'bulan ini', year: 'tahun ini', all: 'secara keseluruhan' }[p] || 'bulan ini';
}

export function planForTransaction(tx, intent, parsed) {
  return intent === 'delete_transaction' ? buildDelete(tx, parsed) : buildUpdate(tx, parsed);
}

export { resolveCategory };
