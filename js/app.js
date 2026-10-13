/* Pennywise – a tiny, dependency-free budgeting app.
   All data lives in localStorage; nothing is sent anywhere. */
(() => {
  'use strict';

  /* ---------- Config ---------- */
  const STORE = 'pennywise.v1';
  const CATS = {
    housing:   { n: 'Housing',    i: '🏠', c: '#6366f1', t: 'expense' },
    food:      { n: 'Food',       i: '🍜', c: '#f59e0b', t: 'expense' },
    transport: { n: 'Transport',  i: '🚌', c: '#06b6d4', t: 'expense' },
    shopping:  { n: 'Shopping',   i: '🛍️', c: '#ec4899', t: 'expense' },
    bills:     { n: 'Bills',      i: '💡', c: '#8b5cf6', t: 'expense' },
    health:    { n: 'Health',     i: '💊', c: '#10b981', t: 'expense' },
    fun:       { n: 'Fun',        i: '🎮', c: '#f43f5e', t: 'expense' },
    other:     { n: 'Other',      i: '📦', c: '#94a3b8', t: 'expense' },
    salary:    { n: 'Salary',     i: '💼', c: '#10b981', t: 'income' },
    freelance: { n: 'Freelance',  i: '💻', c: '#14b8a6', t: 'income' },
    invest:    { n: 'Investing',  i: '📈', c: '#22c55e', t: 'income' },
    gift:      { n: 'Gift',       i: '🎁', c: '#a3e635', t: 'income' },
  };
  const EXPENSE_CATS = Object.keys(CATS).filter(k => CATS[k].t === 'expense');
  const INCOME_CATS = Object.keys(CATS).filter(k => CATS[k].t === 'income');
  const DEFAULT_BUDGETS = { housing: 1200, food: 500, transport: 150, shopping: 250, bills: 250, health: 120, fun: 200, other: 100 };
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Helpers ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const pad = n => String(n).padStart(2, '0');
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const isoDate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const monthKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  const shiftMonth = (key, n) => { const [y, m] = key.split('-').map(Number); return monthKey(new Date(y, m - 1 + n, 1)); };
  const monthLabel = key => { const [y, m] = key.split('-').map(Number); return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }); };
  const shortMonth = key => { const [y, m] = key.split('-').map(Number); return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'short' }); };
  const daysIn = key => { const [y, m] = key.split('-').map(Number); return new Date(y, m, 0).getDate(); };
  const THIS_MONTH = monthKey(new Date());

  function mulberry32(a) {
    return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }

  /* ---------- State ---------- */
  function seed() {
    const rnd = mulberry32(42);
    const now = new Date();
    const out = [];
    for (let k = 5; k >= 0; k--) {
      const d = new Date(now.getFullYear(), now.getMonth() - k, 1);
      const y = d.getFullYear(), m = d.getMonth() + 1;
      const last = k === 0 ? now.getDate() : new Date(y, m, 0).getDate();
      const add = (day, desc, cat, amt) => {
        if (day > last) return;
        out.push({ id: uid(), type: CATS[cat].t, desc, cat, amt: Math.round(amt * 100) / 100, date: `${y}-${pad(m)}-${pad(day)}` });
      };
      add(1, 'Monthly salary', 'salary', 4200);
      if (rnd() > 0.35) add(12, 'Freelance project', 'freelance', 300 + Math.floor(rnd() * 600));
      if (k % 2 === 0) add(20, 'Dividends', 'invest', 60 + Math.floor(rnd() * 80));
      add(2, 'Rent', 'housing', 1150);
      add(5, 'Electricity & water', 'bills', 80 + rnd() * 40);
      add(6, 'Internet', 'bills', 55);
      add(8, 'Gym membership', 'health', 35);
      [4, 11, 18, 25].forEach(day => add(day, 'Groceries', 'food', 60 + rnd() * 50));
      add(9, 'Dinner out', 'food', 30 + rnd() * 40);
      add(21, 'Coffee & brunch', 'food', 18 + rnd() * 20);
      add(3, 'Transit pass', 'transport', 60);
      add(15, 'Ride share', 'transport', 15 + rnd() * 25);
      add(14, 'New clothes', 'shopping', 40 + rnd() * 120);
      add(23, 'Home goods', 'shopping', 20 + rnd() * 60);
      add(7, 'Streaming', 'fun', 15.99);
      add(16, 'Movie night', 'fun', 20 + rnd() * 30);
      add(26, 'Concert tickets', 'fun', 50 + rnd() * 60);
      if (rnd() > 0.5) add(19, 'Pharmacy', 'health', 12 + rnd() * 30);
      if (rnd() > 0.6) add(10, 'Birthday gift', 'other', 25 + rnd() * 40);
    }
    return out;
  }

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORE));
      if (raw && Array.isArray(raw.tx)) return { currency: 'USD', theme: null, budgets: { ...DEFAULT_BUDGETS }, ...raw, budgets: { ...DEFAULT_BUDGETS, ...(raw.budgets || {}) } };
    } catch (e) { /* ignore */ }
    return { currency: 'USD', theme: null, budgets: { ...DEFAULT_BUDGETS }, tx: seed() };
  }
  const state = load();
  const save = () => { try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) { /* storage unavailable */ } };

  const view = { month: THIS_MONTH, q: '', type: 'all', justAdded: null, firstList: true };

  /* ---------- Formatting ---------- */
  let fmt0, fmt2;
  function setFormatters() {
    const base = { style: 'currency', currency: state.currency };
    const zeroDec = state.currency === 'JPY';
    fmt0 = new Intl.NumberFormat(undefined, { ...base, maximumFractionDigits: 0 });
    fmt2 = new Intl.NumberFormat(undefined, { ...base, minimumFractionDigits: zeroDec ? 0 : 2, maximumFractionDigits: zeroDec ? 0 : 2 });
  }
  const currencySymbol = () => (fmt0.formatToParts(0).find(p => p.type === 'currency') || { value: '$' }).value;

  /* ---------- Data selectors ---------- */
  const inMonth = key => state.tx.filter(t => t.date.slice(0, 7) === key);
  function totalsFor(key) {
    let income = 0, expense = 0;
    const byCat = {};
    for (const t of inMonth(key)) {
      if (t.type === 'income') income += t.amt;
      else { expense += t.amt; byCat[t.cat] = (byCat[t.cat] || 0) + t.amt; }
    }
    return { income, expense, byCat };
  }

  /* ---------- Animated numbers ---------- */
  function countTo(el, to, format) {
    const first = el._v === undefined;
    const from = first ? 0 : el._v;
    el._v = to;
    cancelAnimationFrame(el._raf);
    if (reduced || (!first && from === to)) { el.textContent = format(to); return; }
    const t0 = performance.now(), dur = 900;
    const step = now => {
      const p = Math.min(1, (now - t0) / dur);
      el.textContent = format(from + (to - from) * (1 - Math.pow(1 - p, 4)));
      if (p < 1) el._raf = requestAnimationFrame(step);
    };
    el._raf = requestAnimationFrame(step);
  }

  function setPill(el, text, good) {
    el.textContent = text;
    el.classList.toggle('good', good === true);
    el.classList.toggle('bad', good === false);
  }
  const pctChange = (cur, prev) => prev === 0 ? null : ((cur - prev) / prev) * 100;
  function deltaText(cur, prev, goodWhenUp) {
    const ch = pctChange(cur, prev);
    if (ch === null) return ['', undefined];
    const up = ch >= 0;
    return [`${up ? '▲' : '▼'} ${Math.abs(ch).toFixed(0)}% vs last month`, up === goodWhenUp];
  }

  /* ---------- Elements ---------- */
  const el = {
    balance: $('#balance'), balanceDelta: $('#balanceDelta'),
    income: $('#income'), incomeDelta: $('#incomeDelta'),
    expense: $('#expense'), expenseDelta: $('#expenseDelta'),
    savings: $('#savings'), savingsBar: $('#savingsBar'),
    segs: $('#segs'), donut: $('#donut'), legend: $('#legend'),
    dcLabel: $('#dcLabel'), dcValue: $('#dcValue'), dcSub: $('#dcSub'),
    budgets: $('#budgets'), insight: $('#budgetInsight'),
    trend: $('#trend'), list: $('#txList'), empty: $('#empty'), count: $('#txCount'),
    monthLabel: $('#monthLabel'), nextMonth: $('#nextMonth'),
    dlg: $('#dlg'), form: $('#txForm'), chips: $('#chips'), err: $('#formErr'),
    toasts: $('#toasts'), currency: $('#currency'),
  };

  /* ---------- Build static skeletons (so later updates animate smoothly) ---------- */
  const R = 78, C = 2 * Math.PI * R;
  const segEls = {}, legendEls = {}, budgetEls = {};
  let trendCols = [];

  EXPENSE_CATS.forEach(k => {
    const seg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    seg.setAttribute('class', 'seg');
    seg.setAttribute('cx', 100); seg.setAttribute('cy', 100); seg.setAttribute('r', R);
    seg.style.stroke = CATS[k].c;
    seg.style.strokeDasharray = `0 ${C}`;
    seg.style.strokeDashoffset = 0;
    seg.dataset.cat = k;
    el.segs.appendChild(seg);
    segEls[k] = seg;

    const li = document.createElement('li');
    li.style.setProperty('--c', CATS[k].c);
    li.dataset.cat = k;
    li.innerHTML = `<span class="sw"></span><span class="nm">${CATS[k].n}</span><span class="am"></span><span class="pc"></span>`;
    el.legend.appendChild(li);
    legendEls[k] = li;

    const row = document.createElement('li');
    row.className = 'b-row';
    row.style.setProperty('--c', CATS[k].c);
    row.innerHTML = `
      <span class="b-icon" aria-hidden="true">${CATS[k].i}</span>
      <div>
        <div class="b-top">
          <span class="b-name">${CATS[k].n}</span>
          <span class="b-amt"><b class="spent">0</b> of
            <input class="b-limit" type="number" min="0" step="10" inputmode="numeric" aria-label="${CATS[k].n} monthly limit">
          </span>
        </div>
        <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100"><span></span></div>
        <div class="b-status"></div>
      </div>`;
    el.budgets.appendChild(row);
    budgetEls[k] = {
      row, spent: $('.spent', row), limit: $('.b-limit', row), fill: $('.bar span', row), bar: $('.bar', row), status: $('.b-status', row),
    };
    budgetEls[k].limit.addEventListener('change', e => {
      const v = Math.max(0, parseFloat(e.target.value) || 0);
      state.budgets[k] = v; save(); renderBudgets();
    });
    budgetEls[k].limit.addEventListener('keydown', e => { if (e.key === 'Enter') e.target.blur(); });
  });

  for (let i = 0; i < 6; i++) {
    const col = document.createElement('div');
    col.className = 't-col';
    col.innerHTML = `<div class="t-bars"><span class="t-bar inc"></span><span class="t-bar exp"></span></div><span class="t-label"></span>`;
    el.trend.appendChild(col);
    trendCols.push({ col, inc: $('.inc', col), exp: $('.exp', col), label: $('.t-label', col) });
  }

  /* ---------- Render: summary ---------- */
  function renderStats() {
    const cur = totalsFor(view.month), prev = totalsFor(shiftMonth(view.month, -1));
    const upTo = view.month;
    const balance = state.tx.filter(t => t.date.slice(0, 7) <= upTo).reduce((s, t) => s + (t.type === 'income' ? t.amt : -t.amt), 0);
    const net = cur.income - cur.expense;
    countTo(el.balance, balance, fmt0.format);
    setPill(el.balanceDelta, `${net >= 0 ? '▲ +' : '▼ −'}${fmt0.format(Math.abs(net))} this month`);

    countTo(el.income, cur.income, fmt0.format);
    setPill(el.incomeDelta, ...deltaText(cur.income, prev.income, true));
    countTo(el.expense, cur.expense, fmt0.format);
    setPill(el.expenseDelta, ...deltaText(cur.expense, prev.expense, false));

    const rate = cur.income > 0 ? Math.max(0, ((cur.income - cur.expense) / cur.income) * 100) : 0;
    countTo(el.savings, rate, v => `${v.toFixed(0)}%`);
    el.savingsBar.style.setProperty('--p', Math.min(1, rate / 100));
  }

  /* ---------- Render: donut + legend ---------- */
  let hoverCat = null;
  function renderDonut() {
    const { expense, byCat } = totalsFor(view.month);
    let offset = 0;
    const order = EXPENSE_CATS.slice().sort((a, b) => (byCat[b] || 0) - (byCat[a] || 0));
    EXPENSE_CATS.forEach(k => {
      const v = byCat[k] || 0, frac = expense ? v / expense : 0, len = frac * C;
      const gap = frac > 0 && frac < 1 ? 3 : 0;
      segEls[k].style.strokeDasharray = `${Math.max(len - gap, 0)} ${C}`;
      segEls[k].style.strokeDashoffset = -offset;
      offset += len;
      const li = legendEls[k];
      $('.am', li).textContent = fmt0.format(v);
      $('.pc', li).textContent = expense ? `${(frac * 100).toFixed(0)}%` : '–';
      li.classList.toggle('zero', v === 0);
      li.style.order = order.indexOf(k);
    });
    updateCenter();
  }
  function updateCenter() {
    const { expense, byCat } = totalsFor(view.month);
    if (hoverCat) {
      const v = byCat[hoverCat] || 0;
      el.dcLabel.textContent = CATS[hoverCat].n;
      el.dcValue.textContent = fmt0.format(v);
      el.dcValue._v = v;
      el.dcSub.textContent = expense ? `${((v / expense) * 100).toFixed(0)}% of spending` : '';
    } else {
      el.dcLabel.textContent = 'Spent';
      countTo(el.dcValue, expense, fmt0.format);
      el.dcSub.textContent = expense ? 'this month' : 'no expenses yet';
    }
  }
  function setHover(cat) {
    hoverCat = cat;
    el.donut.classList.toggle('hovering', !!cat);
    EXPENSE_CATS.forEach(k => { segEls[k].classList.toggle('on', k === cat); legendEls[k].classList.toggle('on', k === cat); });
    updateCenter();
  }
  EXPENSE_CATS.forEach(k => {
    [segEls[k], legendEls[k]].forEach(n => {
      n.addEventListener('mouseenter', () => setHover(k));
      n.addEventListener('mouseleave', () => setHover(null));
    });
  });

  /* ---------- Render: budgets ---------- */
  function renderBudgets() {
    const { byCat } = totalsFor(view.month);
    let totalLimit = 0, totalSpent = 0;
    EXPENSE_CATS.forEach(k => {
      const b = budgetEls[k], limit = state.budgets[k] || 0, spent = byCat[k] || 0;
      totalLimit += limit; totalSpent += spent;
      const ratio = limit > 0 ? spent / limit : (spent > 0 ? 2 : 0);
      b.spent.textContent = fmt0.format(spent);
      if (document.activeElement !== b.limit) b.limit.value = limit;
      b.fill.style.setProperty('--p', Math.min(1, ratio));
      b.bar.setAttribute('aria-valuenow', Math.round(Math.min(ratio, 1) * 100));
      b.row.classList.toggle('warn', ratio >= 0.8 && ratio < 1);
      b.row.classList.toggle('over', ratio >= 1);
      b.status.textContent = limit === 0 && spent === 0 ? 'No limit set'
        : ratio >= 1 ? `${fmt0.format(spent - limit)} over budget`
        : `${fmt0.format(limit - spent)} left · ${(ratio * 100).toFixed(0)}% used`;
    });
    const left = totalLimit - totalSpent;
    if (view.month === THIS_MONTH) {
      const now = new Date();
      const daysLeft = daysIn(view.month) - now.getDate() + 1;
      el.insight.textContent = left >= 0
        ? `You can spend about ${fmt0.format(left / daysLeft)}/day for the next ${daysLeft} day${daysLeft === 1 ? '' : 's'}`
        : `Over your total budget by ${fmt0.format(-left)}`;
    } else {
      el.insight.textContent = totalLimit
        ? `Used ${((totalSpent / totalLimit) * 100).toFixed(0)}% of your ${fmt0.format(totalLimit)} total budget`
        : 'Set limits to track your spending';
    }
  }

  /* ---------- Render: trend ---------- */
  const tip = document.createElement('div');
  tip.className = 't-tip';
  el.trend.style.position = 'relative';
  el.trend.appendChild(tip);

  function renderTrend() {
    const keys = [-5, -4, -3, -2, -1, 0].map(n => shiftMonth(view.month, n));
    const data = keys.map(totalsFor);
    const max = Math.max(1, ...data.map(d => Math.max(d.income, d.expense)));
    keys.forEach((key, i) => {
      const t = trendCols[i], d = data[i];
      t.label.textContent = shortMonth(key);
      t.col.classList.toggle('current', i === 5);
      t.inc.style.setProperty('--h', d.income / max);
      t.exp.style.setProperty('--h', d.expense / max);
      t.inc.style.setProperty('--d', `${i * 60}ms`);
      t.exp.style.setProperty('--d', `${i * 60 + 80}ms`);
      t.col.dataset.tip = `${monthLabel(key)}|Income ${fmt0.format(d.income)}|Expenses ${fmt0.format(d.expense)}`;
    });
  }
  el.trend.addEventListener('mousemove', e => {
    const col = e.target.closest('.t-col');
    if (!col) { tip.classList.remove('show'); return; }
    const [m, a, b] = col.dataset.tip.split('|');
    tip.innerHTML = `<b>${esc(m)}</b><br>${esc(a)}<br>${esc(b)}`;
    const box = el.trend.getBoundingClientRect();
    tip.style.left = `${Math.min(box.width - 150, Math.max(0, e.clientX - box.left - 60))}px`;
    tip.style.top = `${e.clientY - box.top - 78}px`;
    tip.classList.add('show');
  });
  el.trend.addEventListener('mouseleave', () => tip.classList.remove('show'));

  /* ---------- Render: transactions ---------- */
  function renderList() {
    const q = view.q.trim().toLowerCase();
    const all = inMonth(view.month).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
    const rows = all.filter(t => (view.type === 'all' || t.type === view.type) &&
      (!q || t.desc.toLowerCase().includes(q) || CATS[t.cat].n.toLowerCase().includes(q)));

    el.count.textContent = `${all.length} in ${monthLabel(view.month)}`;
    el.empty.hidden = rows.length > 0;
    const h3 = $('h3', el.empty), p = $('p', el.empty), btn = $('#emptyAdd');
    if (!rows.length) {
      const filtered = all.length > 0;
      h3.textContent = filtered ? 'No matches' : 'Nothing here yet';
      p.textContent = filtered ? 'Try a different search or filter.' : 'Add your first transaction to start tracking.';
      btn.hidden = filtered;
    }

    el.list.innerHTML = rows.map((t, n) => {
      const c = CATS[t.cat] || CATS.other;
      const d = new Date(t.date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      const cls = ['tx', t.id === view.justAdded ? 'enter' : (view.firstList || view.listFresh ? 'stagger' : '')].join(' ');
      return `<li class="${cls}" data-id="${esc(t.id)}" style="--c:${c.c};--n:${Math.min(n, 14)}">
        <span class="tx-icon" aria-hidden="true">${c.i}</span>
        <div class="tx-main"><strong>${esc(t.desc || c.n)}</strong><small>${c.n} · ${d}</small></div>
        <span class="amt ${t.type}">${t.type === 'income' ? '+' : '−'}${fmt2.format(t.amt)}</span>
        <button class="del" data-del="${esc(t.id)}" aria-label="Delete ${esc(t.desc || c.n)}">✕</button>
      </li>`;
    }).join('');
    view.justAdded = null; view.firstList = false; view.listFresh = false;
  }

  /* ---------- Month label / nav ---------- */
  function renderMonth(animate) {
    el.monthLabel.textContent = monthLabel(view.month);
    if (animate) { el.monthLabel.classList.remove('swap'); void el.monthLabel.offsetWidth; el.monthLabel.classList.add('swap'); }
    el.nextMonth.disabled = view.month >= shiftMonth(THIS_MONTH, 12);
  }

  function renderAll(animateMonth) {
    renderMonth(animateMonth);
    renderStats(); renderDonut(); renderBudgets(); renderTrend(); renderList();
  }

  /* ---------- Theme ---------- */
  function applyTheme() {
    if (state.theme) document.documentElement.dataset.theme = state.theme;
    else delete document.documentElement.dataset.theme;
  }
  $('#themeBtn').addEventListener('click', () => {
    const isDark = state.theme ? state.theme === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    state.theme = isDark ? 'light' : 'dark';
    applyTheme(); save();
  });

  /* ---------- Toasts ---------- */
  function toast(msg, actionLabel, onAction) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = `<span>${esc(msg)}</span>`;
    const close = () => { t.classList.add('out'); setTimeout(() => t.remove(), 300); };
    if (actionLabel) {
      const b = document.createElement('button');
      b.textContent = actionLabel;
      b.addEventListener('click', () => { onAction(); close(); });
      t.appendChild(b);
    }
    el.toasts.appendChild(t);
    setTimeout(close, 5000);
  }

  /* ---------- Month navigation, filters ---------- */
  function goMonth(key) { view.month = key; view.listFresh = true; renderAll(true); }
  $('#prevMonth').addEventListener('click', () => goMonth(shiftMonth(view.month, -1)));
  el.nextMonth.addEventListener('click', () => goMonth(shiftMonth(view.month, 1)));
  document.addEventListener('keydown', e => {
    if (el.dlg.open || /input|select|textarea/i.test(e.target.tagName)) return;
    if (e.key === 'ArrowLeft') goMonth(shiftMonth(view.month, -1));
    if (e.key === 'ArrowRight' && !el.nextMonth.disabled) goMonth(shiftMonth(view.month, 1));
  });

  $('#search').addEventListener('input', e => { view.q = e.target.value; renderList(); });
  $('#typeTabs').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    view.type = b.dataset.type; view.listFresh = true;
    document.querySelectorAll('#typeTabs button').forEach(x => {
      const on = x === b; x.classList.toggle('active', on); x.setAttribute('aria-selected', on);
    });
    renderList();
  });

  el.currency.value = state.currency;
  el.currency.addEventListener('change', () => { state.currency = el.currency.value; save(); setFormatters(); resetCounters(); renderAll(); });
  function resetCounters() { [el.balance, el.income, el.expense, el.savings, el.dcValue].forEach(n => { n._v = undefined; }); }

  /* ---------- Delete with undo ---------- */
  el.list.addEventListener('click', e => {
    const b = e.target.closest('[data-del]'); if (!b) return;
    const id = b.dataset.del, li = b.closest('.tx');
    const idx = state.tx.findIndex(t => t.id === id); if (idx < 0) return;
    const removed = state.tx[idx];
    li.classList.add('leaving');
    setTimeout(() => {
      state.tx.splice(idx, 1); save(); renderAll();
      toast('Transaction deleted', 'Undo', () => { state.tx.push(removed); view.justAdded = removed.id; save(); renderAll(); });
    }, reduced ? 0 : 300);
  });

  /* ---------- Add dialog ---------- */
  function buildChips(type, selected) {
    const keys = type === 'income' ? INCOME_CATS : EXPENSE_CATS;
    const pick = keys.includes(selected) ? selected : keys[0];
    el.chips.innerHTML = keys.map((k, n) => `
      <span class="chip" style="--c:${CATS[k].c};--n:${n}">
        <input type="radio" name="cat" id="c-${k}" value="${k}" ${k === pick ? 'checked' : ''}>
        <label for="c-${k}"><span aria-hidden="true">${CATS[k].i}</span>${CATS[k].n}</label>
      </span>`).join('');
  }
  function openDialog() {
    el.form.reset();
    el.err.hidden = true;
    $('#date').value = isoDate(new Date());
    $('#curSym').textContent = currencySymbol();
    buildChips('expense');
    if (!el.dlg.open) el.dlg.showModal();
    setTimeout(() => $('#amount').focus(), 50);
  }
  function closeDialog() {
    if (!el.dlg.open) return;
    if (reduced) { el.dlg.close(); return; }
    el.dlg.classList.add('closing');
    setTimeout(() => { el.dlg.classList.remove('closing'); el.dlg.close(); }, 200);
  }
  $('#addBtn').addEventListener('click', openDialog);
  $('#emptyAdd').addEventListener('click', openDialog);
  $('#closeDlg').addEventListener('click', closeDialog);
  el.dlg.addEventListener('cancel', e => { e.preventDefault(); closeDialog(); });
  el.dlg.addEventListener('click', e => { if (e.target === el.dlg) closeDialog(); });
  el.form.addEventListener('change', e => { if (e.target.name === 'type') buildChips(e.target.value); });

  el.form.addEventListener('submit', e => {
    e.preventDefault();
    const f = new FormData(el.form);
    const rawAmt = parseFloat($('#amount').value);
    const date = $('#date').value;
    const fail = msg => { el.err.textContent = msg; el.err.hidden = false; el.err.style.animation = 'none'; void el.err.offsetWidth; el.err.style.animation = ''; };
    if (!(rawAmt > 0)) return fail('Enter an amount greater than zero.');
    if (!date) return fail('Pick a date.');
    const type = f.get('type'), cat = f.get('cat');
    const tx = {
      id: uid(), type, cat, amt: Math.round(rawAmt * 100) / 100, date,
      desc: $('#desc').value.trim().slice(0, 60) || CATS[cat].n,
    };
    state.tx.push(tx); save();
    view.justAdded = tx.id;
    const k = date.slice(0, 7);
    view.month = k;
    view.q = ''; $('#search').value = '';
    view.type = 'all';
    document.querySelectorAll('#typeTabs button').forEach(x => { const on = x.dataset.type === 'all'; x.classList.toggle('active', on); x.setAttribute('aria-selected', on); });
    closeDialog();
    renderAll(true);
    const hero = $('.stat.hero'); hero.classList.remove('pulse'); void hero.offsetWidth; hero.classList.add('pulse');
    toast(`${type === 'income' ? 'Income' : 'Expense'} of ${fmt2.format(tx.amt)} added`);
  });

  /* ---------- Footer actions ---------- */
  $('#exportBtn').addEventListener('click', () => {
    const q = v => `"${String(v).replace(/"/g, '""')}"`;
    const rows = [['Date', 'Type', 'Category', 'Description', 'Amount'].join(',')]
      .concat(state.tx.slice().sort((a, b) => a.date.localeCompare(b.date))
        .map(t => [t.date, t.type, CATS[t.cat].n, q(t.desc), t.amt.toFixed(2)].join(',')));
    const url = URL.createObjectURL(new Blob([rows.join('\n')], { type: 'text/csv' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `pennywise-${isoDate(new Date())}.csv` });
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    toast('Exported to CSV');
  });
  $('#demoBtn').addEventListener('click', () => {
    if (state.tx.length && !confirm('Replace your current data with demo data?')) return;
    state.tx = seed(); save(); view.month = THIS_MONTH; view.listFresh = true; renderAll(true); toast('Demo data loaded');
  });
  $('#clearBtn').addEventListener('click', () => {
    if (!confirm('Delete all transactions? This cannot be undone.')) return;
    state.tx = []; save(); view.listFresh = true; renderAll(); toast('All data cleared');
  });

  /* ---------- Init ---------- */
  applyTheme();
  setFormatters();
  renderMonth(false);
  void document.body.offsetWidth;            // flush layout so first render animates from zero
  requestAnimationFrame(() => renderAll(false));
})();
