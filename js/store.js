// store.js
import { loadState, saveState, defaultState, clearState as clearDB, exportJSON, importJSON } from './db.js';
import { uid } from './utils/id.js';

let state = loadState() || defaultState();
const listeners = new Set();

function notify() {
  for (const cb of listeners) {
    try { cb(state); } catch (e) { console.error(e); }
  }
}

export function getState() { return state; }
export function subscribe(cb) { listeners.add(cb); return () => listeners.delete(cb); }

function persist() { saveState(state); notify(); }

// --- Transactions ---
export function addTransaction(tx) {
  const item = {
    id: uid(),
    type: tx.type,
    name: String(tx.name).trim(),
    amount: Number(tx.amount),
    categoryId: tx.categoryId,
    date: tx.date,
    note: tx.note ? String(tx.note).trim() : '',
    createdAt: new Date().toISOString(),
  };
  state.transactions.unshift(item);
  persist();
  return item;
}
export function updateTransaction(id, patch) {
  const idx = state.transactions.findIndex(t => t.id === id);
  if (idx === -1) return null;
  state.transactions[idx] = { ...state.transactions[idx], ...patch, amount: Number(patch.amount ?? state.transactions[idx].amount) };
  persist();
  return state.transactions[idx];
}
export function deleteTransaction(id) {
  state.transactions = state.transactions.filter(t => t.id !== id);
  persist();
}
export function getTransaction(id) { return state.transactions.find(t => t.id === id) || null; }

// --- Categories ---
export function addCategory(cat) {
  const item = { id: uid(), name: String(cat.name).trim(), type: cat.type, icon: cat.icon || 'tag', isDefault: false };
  state.categories.push(item);
  persist();
  return item;
}
export function updateCategory(id, patch) {
  const idx = state.categories.findIndex(c => c.id === id);
  if (idx === -1) return null;
  state.categories[idx] = { ...state.categories[idx], ...patch };
  persist();
  return state.categories[idx];
}
export function deleteCategory(id) {
  // reassign transactions to "Lainnya" of same type or null
  const cat = state.categories.find(c => c.id === id);
  if (!cat) return;
  const fallback = state.categories.find(c => c.type === cat.type && c.name === 'Lainnya' && c.id !== id);
  state.transactions.forEach(t => {
    const tc = state.categories.find(c => c.id === t.categoryId);
    if (tc && tc.type === cat.type && t.categoryId === id) {
      t.categoryId = fallback ? fallback.id : null;
    }
  });
  state.categories = state.categories.filter(c => c.id !== id);
  // remove budgets tied
  state.budgets = state.budgets.filter(b => b.categoryId !== id);
  persist();
}
export function getCategory(id) { return state.categories.find(c => c.id === id) || null; }
export function categoriesByType(type) { return state.categories.filter(c => c.type === type); }

// --- Budgets ---
export function setBudget(month, categoryId, limit) {
  const existing = state.budgets.find(b => b.month === month && b.categoryId === categoryId);
  if (existing) { existing.limit = Number(limit); }
  else { state.budgets.push({ id: uid(), month, categoryId, limit: Number(limit) }); }
  persist();
}
export function deleteBudget(id) {
  state.budgets = state.budgets.filter(b => b.id !== id);
  persist();
}
export function getBudgets(month) { return state.budgets.filter(b => b.month === month); }

// --- Settings ---
export function setTheme(theme) {
  state.settings.theme = theme;
  persist();
  applyTheme(theme);
}
export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#0B1020' : '#F5F4F0');
}
export function toggleTheme() {
  setTheme(state.settings.theme === 'dark' ? 'light' : 'dark');
}

// --- Voice assistant settings ---
export function getVoiceSettings() {
  if (!state.settings.voice) state.settings.voice = { apiKey: '', saveMode: 'confirm' };
  return state.settings.voice;
}
export function setVoiceSettings(patch) {
  state.settings.voice = { ...getVoiceSettings(), ...patch };
  persist();
  return state.settings.voice;
}

export function restoreTransaction(tx) {
  state.transactions.unshift(tx);
  persist();
}

// --- Data management ---
export function resetAll() {
  const preserved = { theme: state.settings.theme, voice: { ...getVoiceSettings() } };
  clearDB();
  state = defaultState();
  state.settings.theme = preserved.theme;
  state.settings.voice = preserved.voice;
  persist();
  applyTheme(state.settings.theme);
}
export function importData(text) {
  const currentVoice = { ...getVoiceSettings() };
  state = importJSON(text);
  if (!state.settings.voice) state.settings.voice = currentVoice;
  else if (!state.settings.voice.apiKey) state.settings.voice.apiKey = currentVoice.apiKey;
  saveState(state);
  notify();
  applyTheme(state.settings.theme);
}
export function exportData() {
  const clone = JSON.parse(JSON.stringify(state));
  if (clone.settings?.voice) clone.settings.voice.apiKey = '';
  return exportJSON(clone);
}

function inRange2(iso, start, end) {
  const t = new Date(iso).getTime();
  return t >= start.getTime() && t <= end.getTime();
}

export function balance() {
  let b = 0;
  for (const t of state.transactions) {
    if (t.type === 'income') b += t.amount; else b -= t.amount;
  }
  return b;
}

export function spentInCategory(month, categoryId) {
  return state.transactions
    .filter(t => t.type === 'expense' && t.categoryId === categoryId && monthKey2(t.date) === month)
    .reduce((s, t) => s + t.amount, 0);
}
function monthKey2(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function categoryById(id) { return state.categories.find(c => c.id === id); }

// init theme
applyTheme(state.settings.theme);
export { rangeForPeriod } from './utils/date.js';
// expose for store internal
import { rangeForPeriod as _r } from './utils/date.js';
window.__rangeForPeriod = _r;
// fix totals to use proper range
// (override totals below by redefining? Instead patch: redefine totals properly)
// We'll instead export a corrected totals2
export function totalsFor(period, ref = new Date(), customStart = null, customEnd = null) {
  let list = state.transactions;
  let start, end;
  if (period === 'all') { start = new Date(0); end = new Date(8640000000000000); }
  else if (period === 'custom') { start = customStart || new Date(0); end = customEnd || new Date(8640000000000000); }
  else {
    const r = _r(period, ref);
    start = r.start; end = r.end;
  }
  list = list.filter(t => inRange2(t.date, start, end));
  let income = 0, expense = 0;
  for (const t of list) { if (t.type === 'income') income += t.amount; else expense += t.amount; }
  return { income, expense, net: income - expense, count: list.length, list, start, end };
}
// keep totals alias
export const totalsRange = totalsFor;
