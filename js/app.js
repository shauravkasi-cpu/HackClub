/* Pennywise shell: routing, navigation, theme, month selector, command palette. */
(() => {
  'use strict';
  const PW = window.PW, UI = PW.ui, { state } = PW;
  const $ = (s, r = document) => r.querySelector(s);

  const ROUTES = ['dashboard', 'transactions', 'budgets', 'goals', 'insights', 'settings'];
  const NAV = [
    ['dashboard', 'Dashboard', 'dashboard'], ['transactions', 'Transactions', 'list'], ['budgets', 'Budgets', 'pie'],
    ['goals', 'Goals', 'target'], ['insights', 'Insights', 'sparkles'], ['settings', 'Settings', 'settings'],
  ];
  let current = 'dashboard';

  /* ---------- Theme ---------- */
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  PW.applyTheme = () => {
    const t = state.theme === 'system' ? (mq.matches ? 'dark' : 'light') : state.theme;
    document.documentElement.dataset.theme = t;
    $('#themeBtn').innerHTML = UI.icon(t === 'dark' ? 'sun' : 'moon');
    $('#themeBtn').setAttribute('aria-label', t === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    const meta = $('meta[name="theme-color"]'); if (meta) meta.content = t === 'dark' ? '#0b1020' : '#f5f7fb';
  };
  mq.addEventListener && mq.addEventListener('change', () => { if (state.theme === 'system') PW.applyTheme(); });

  /* ---------- Sidebar ---------- */
  const applySidebar = () => document.documentElement.classList.toggle('nav-collapsed', state.sidebar === 'collapsed');

  /* ---------- Header / month nav ---------- */
  PW.refreshHead = () => {
    const v = PW.views[current];
    $('#pageTitle').textContent = v.title;
    $('#pageSub').textContent = typeof v.sub === 'function' ? v.sub() : v.sub;
    $('#monthNav').hidden = !v.monthly;
    $('#monthLabel').textContent = PW.monthLabel(PW.view.month);
    $('#nextMonth').disabled = PW.view.month >= PW.shiftMonth(PW.THIS, 12);
    document.title = `${v.title} · Pennywise`;
  };

  function renderCurrent(play) {
    const root = $(`#v-${current}`);
    root.classList.toggle('play', !!play);
    PW.refreshHead();
    PW.views[current].render(root, !!play);
  }

  function show(name, play = true) {
    current = name;
    document.querySelectorAll('.view').forEach(v => { v.hidden = v.id !== `v-${name}`; });
    document.querySelectorAll('#nav a').forEach(a => { const on = a.dataset.route === name; a.classList.toggle('active', on); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    renderCurrent(play);
    window.scrollTo({ top: 0 });
  }
  const route = () => { const h = (location.hash.replace(/^#\/?/, '') || 'dashboard').split('?')[0]; show(ROUTES.includes(h) ? h : 'dashboard'); };

  PW.onChange = () => renderCurrent(false);
  PW.setMonth = k => { PW.view.month = k; renderCurrent(true); };

  /* ---------- Command palette ---------- */
  const commands = () => [
    { label: 'Add transaction', group: 'Action', icon: 'plus', run: () => PW.openTxDialog() },
    { label: 'New goal', group: 'Action', icon: 'target', run: () => { location.hash = '#/goals'; setTimeout(PW.openGoalDialog, 60); } },
    ...NAV.map(([r, label, ic]) => ({ label: `Go to ${label}`, group: 'Navigate', icon: ic, run: () => { location.hash = `#/${r}`; } })),
    { label: 'Previous month', group: 'Navigate', icon: 'chevL', run: () => PW.setMonth(PW.shiftMonth(PW.view.month, -1)) },
    { label: 'Jump to current month', group: 'Navigate', icon: 'calendar', run: () => PW.setMonth(PW.THIS) },
    { label: 'Toggle light / dark theme', group: 'Appearance', icon: 'sun', run: toggleTheme },
    { label: 'Export transactions (CSV)', group: 'Data', icon: 'download', run: PW.exportCSV },
    { label: 'Download backup (JSON)', group: 'Data', icon: 'download', run: PW.exportJSON },
  ];
  function toggleTheme() {
    const dark = document.documentElement.dataset.theme === 'dark';
    state.theme = dark ? 'light' : 'dark';
    PW.applyTheme(); PW.save();
    if (current === 'settings') renderCurrent(false);
  }

  /* ---------- Init ---------- */
  function init() {
    $('#nav').innerHTML = NAV.map(([r, label, ic]) => `<a href="#/${r}" data-route="${r}" title="${label}"><span class="nav-ic">${UI.icon(ic)}</span><span class="nav-label">${label}</span></a>`).join('');
    UI.hydrateIcons();
    PW.applyTheme(); applySidebar();

    if (PW.ensureRecurring()) PW.save();

    $('#prevMonth').addEventListener('click', () => PW.setMonth(PW.shiftMonth(PW.view.month, -1)));
    $('#nextMonth').addEventListener('click', () => PW.setMonth(PW.shiftMonth(PW.view.month, 1)));
    $('#monthLabel').addEventListener('click', () => { if (PW.view.month !== PW.THIS) PW.setMonth(PW.THIS); });
    $('#addBtn').addEventListener('click', () => PW.openTxDialog());
    $('#cmdBtn').addEventListener('click', () => UI.openPalette(commands()));
    $('#themeBtn').addEventListener('click', toggleTheme);
    $('#collapseBtn').addEventListener('click', () => { state.sidebar = state.sidebar === 'collapsed' ? 'expanded' : 'collapsed'; applySidebar(); PW.save(); });

    document.addEventListener('keydown', e => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); if (!$('#palette').open) UI.openPalette(commands()); return; }
      if ($('dialog[open]') || /input|select|textarea/i.test(e.target.tagName) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'n' || e.key === 'N') { e.preventDefault(); PW.openTxDialog(); }
      else if (PW.views[current].monthly && e.key === 'ArrowLeft') PW.setMonth(PW.shiftMonth(PW.view.month, -1));
      else if (PW.views[current].monthly && e.key === 'ArrowRight' && !$('#nextMonth').disabled) PW.setMonth(PW.shiftMonth(PW.view.month, 1));
    });

    window.addEventListener('hashchange', route);
    route();
  }
  init();
})();
