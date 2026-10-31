// app.js
import * as store from './store.js';
import { renderSidebarNav, renderBottomNav, updateTitles } from './components/nav.js';
import { toggleNotificationCenter } from './components/notification-center.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderTransactions } from './pages/transactions.js';
import { renderBudgets } from './pages/budgets.js';
import { renderReports } from './pages/reports.js';
import { renderCategories } from './pages/categories.js';
import { renderSettings } from './pages/settings.js';
import { $, refreshIcons } from './utils/dom.js';
import { toastInfo, toastSuccess } from './components/toast.js';
import { mountVoiceAssistant } from './components/voice-assistant.js';
import { mountOnboarding, isOnboardingNeeded } from './components/onboarding.js';

const VIEWS = ['dashboard', 'transactions', 'budgets', 'reports', 'categories', 'settings'];
let currentView = 'dashboard';

function navigate(view) {
  if (!VIEWS.includes(view)) view = 'dashboard';
  currentView = view;
  // toggle views
  document.querySelectorAll('.view').forEach(v => {
    v.classList.toggle('active', v.dataset.view === view);
  });
  renderSidebarNav(view, navigate);
  renderBottomNav(view, navigate);
  updateTitles(view);
  refreshIcons();
  renderCurrent();
  // hash
  if (location.hash !== '#' + view) history.replaceState(null, '', '#' + view);
}

function renderCurrent() {
  const container = document.getElementById('view-' + currentView);
  if (!container) return;
  switch (currentView) {
    case 'dashboard': renderDashboard(container); break;
    case 'transactions': renderTransactions(container); break;
    case 'budgets': renderBudgets(container); break;
    case 'reports': renderReports(container); break;
    case 'categories': renderCategories(container); break;
    case 'settings': renderSettings(container); break;
  }
}

// theme toggle in sidebar
function setupThemeToggle() {
  const btn = document.getElementById('themeToggle');
  const label = document.getElementById('themeLabel');
  function update() {
    const dark = store.getState().settings.theme === 'dark';
    label.textContent = dark ? 'Mode terang' : 'Mode gelap';
    const icon = btn.querySelector('i');
    if (icon) icon.setAttribute('data-lucide', dark ? 'sun' : 'moon');
    refreshIcons(btn);
  }
  btn.addEventListener('click', () => { store.toggleTheme(); update(); renderCurrent(); });
  update();
}

// global search -> transactions view with search prefilled? Just filter current if transactions
const searchInput = document.getElementById('globalSearch');
searchInput.addEventListener('input', (e) => {
  const q = e.target.value;
  // store in transactions state via module? We'll navigate to transactions and set
  if (currentView !== 'transactions') {
    navigate('transactions');
  }
  // set search after render
  setTimeout(() => {
    const inp = document.getElementById('txSearch');
    if (inp) { inp.value = q; inp.dispatchEvent(new Event('input')); }
  }, 50);
});

// notif
document.getElementById('notifBtn').addEventListener('click', (e) => { e.stopPropagation(); toggleNotificationCenter(); });

// quick add
document.getElementById('quickAddBtn').addEventListener('click', () => {
  navigate('transactions');
  setTimeout(() => {
    const btn = document.querySelector('#txAddBtn');
    if (btn) btn.click();
  }, 80);
});

// navigate event from dashboard
document.addEventListener('navigate', (e) => navigate(e.detail));

// store subscribe -> re-render current view (debounced-ish)
let renderTimer = null;
store.subscribe(() => {
  clearTimeout(renderTimer);
  renderTimer = setTimeout(() => {
    // Settings manages its own re-render; avoid wiping transient status text.
    if (currentView === 'settings') return;
    renderCurrent();
  }, 120);
});

// initial
function init() {
  // apply theme
  store.applyTheme(store.getState().settings.theme);
  setupThemeToggle();
  mountVoiceAssistant();
  refreshIcons();
  if (isOnboardingNeeded()) {
    mountOnboarding(() => {
      toastSuccess('Selamat datang di TamaTracker!');
      const hash = location.hash.replace('#', '');
      navigate(VIEWS.includes(hash) ? hash : 'dashboard');
      refreshIcons();
      if (store.getState().transactions.length === 0) {
        toastInfo('Tambahkan transaksi pertama Anda untuk mulai melacak keuangan.');
      }
    });
    return;
  }
  // route from hash
  const hash = location.hash.replace('#', '');
  navigate(VIEWS.includes(hash) ? hash : 'dashboard');
  refreshIcons();
  // welcome toast if no data
  if (store.getState().transactions.length === 0) {
    toastInfo('Selamat datang di TamaTracker. Tambahkan transaksi pertama Anda.');
  }
}

init();
window.addEventListener('hashchange', () => {
  const hash = location.hash.replace('#', '');
  if (VIEWS.includes(hash) && hash !== currentView) navigate(hash);
});
