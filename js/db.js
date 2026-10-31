// db.js
const KEY = 'tamatracker:data:v1';

const DEFAULT_CATEGORIES = {
  income: [
    { name: 'Gaji', icon: 'briefcase' },
    { name: 'Freelance', icon: 'laptop' },
    { name: 'Bisnis', icon: 'store' },
    { name: 'Investasi', icon: 'trending-up' },
    { name: 'Hadiah', icon: 'gift' },
    { name: 'Lainnya', icon: 'more-horizontal' },
  ],
  expense: [
    { name: 'Makanan', icon: 'utensils' },
    { name: 'Transportasi', icon: 'car' },
    { name: 'Belanja', icon: 'shopping-bag' },
    { name: 'Tagihan', icon: 'receipt' },
    { name: 'Hiburan', icon: 'film' },
    { name: 'Kesehatan', icon: 'heart-pulse' },
    { name: 'Pendidikan', icon: 'graduation-cap' },
    { name: 'Lainnya', icon: 'more-horizontal' },
  ],
};

function makeCategories() {
  const out = [];
  for (const type of ['income', 'expense']) {
    for (const c of DEFAULT_CATEGORIES[type]) {
      out.push({ id: 'cat_' + type + '_' + c.name.toLowerCase().replace(/\s+/g, '_'), name: c.name, type, icon: c.icon, isDefault: true });
    }
  }
  return out;
}

export function defaultState() {
  return {
    transactions: [],
    categories: makeCategories(),
    budgets: [],
    settings: { theme: 'light', seeded: false, voice: { apiKey: '', saveMode: 'confirm' }, onboardingCompleted: false },
  };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.transactions)) return null;
    // ensure categories exist
    if (!Array.isArray(parsed.categories) || parsed.categories.length === 0) {
      parsed.categories = makeCategories();
    }
    if (!parsed.settings) parsed.settings = { theme: 'light' };
    if (!parsed.settings.voice || typeof parsed.settings.voice !== 'object') {
      parsed.settings.voice = { apiKey: '', saveMode: 'confirm' };
    }
    if (typeof parsed.settings.onboardingCompleted !== 'boolean') {
      parsed.settings.onboardingCompleted = false;
    }
    if (!Array.isArray(parsed.budgets)) parsed.budgets = [];
    return parsed;
  } catch (e) {
    console.error('loadState failed', e);
    return null;
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    console.error('saveState failed', e);
  }
}

export function clearState() {
  localStorage.removeItem(KEY);
}

export function exportJSON(state) {
  return JSON.stringify(state, null, 2);
}

export function importJSON(text) {
  const parsed = JSON.parse(text);
  if (!parsed || !Array.isArray(parsed.transactions)) throw new Error('Format data tidak valid');
  if (!Array.isArray(parsed.categories)) parsed.categories = makeCategories();
  if (!Array.isArray(parsed.budgets)) parsed.budgets = [];
  if (!parsed.settings) parsed.settings = { theme: 'light' };
  if (!parsed.settings.voice || typeof parsed.settings.voice !== 'object') {
    parsed.settings.voice = { apiKey: '', saveMode: 'confirm' };
  }
  if (typeof parsed.settings.onboardingCompleted !== 'boolean') {
    parsed.settings.onboardingCompleted = false;
  }
  return parsed;
}

export { DEFAULT_CATEGORIES };
