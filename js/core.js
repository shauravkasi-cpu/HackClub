/* Pennywise core: state, persistence, formatting and financial analytics.
   Everything is exposed on window.PW. Data never leaves the browser. */
(() => {
  'use strict';
  const PW = (window.PW = window.PW || {});
  PW.views = {};

  /* ---------- Config ---------- */
  const STORE = 'pennywise.v1'; // unchanged key so existing user data keeps working
  const CATS = {
    housing:   { n: 'Housing',   ic: 'home',      c: '#7c6cf2', t: 'expense' },
    food:      { n: 'Food',      ic: 'utensils',  c: '#f2a93b', t: 'expense' },
    transport: { n: 'Transport', ic: 'bus',       c: '#2ccbe0', t: 'expense' },
    shopping:  { n: 'Shopping',  ic: 'bag',       c: '#e56aa5', t: 'expense' },
    bills:     { n: 'Bills',     ic: 'zap',       c: '#5b8cff', t: 'expense' },
    health:    { n: 'Health',    ic: 'heart',     c: '#34d399', t: 'expense' },
    fun:       { n: 'Fun',       ic: 'gamepad',   c: '#fb7185', t: 'expense' },
    other:     { n: 'Other',     ic: 'box',       c: '#8d98b8', t: 'expense' },
    salary:    { n: 'Salary',    ic: 'briefcase', c: '#34d399', t: 'income' },
    freelance: { n: 'Freelance', ic: 'laptop',    c: '#2dd4bf', t: 'income' },
    invest:    { n: 'Investing', ic: 'trendUp',   c: '#5b8cff', t: 'income' },
    gift:      { n: 'Gift',      ic: 'gift',      c: '#e56aa5', t: 'income' },
  };
  const EXPENSE_CATS = Object.keys(CATS).filter(k => CATS[k].t === 'expense');
  const INCOME_CATS = Object.keys(CATS).filter(k => CATS[k].t === 'income');
  const DEFAULT_BUDGETS = { housing: 1200, food: 500, transport: 150, shopping: 250, bills: 250, health: 120, fun: 200, other: 100 };
  Object.assign(PW, { CATS, EXPENSE_CATS, INCOME_CATS, DEFAULT_BUDGETS, STORE });
  PW.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Helpers ---------- */
  const pad = n => String(n).padStart(2, '0');
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const isoDate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseDate = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const monthKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  const shiftMonth = (key, n) => { const [y, m] = key.split('-').map(Number); return monthKey(new Date(y, m - 1 + n, 1)); };
  const monthLabel = key => { const [y, m] = key.split('-').map(Number); return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }); };
  const shortMonth = key => { const [y, m] = key.split('-').map(Number); return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'short' }); };
  const daysIn = key => { const [y, m] = key.split('-').map(Number); return new Date(y, m, 0).getDate(); };
  const monthsBack = (key, n) => Array.from({ length: n }, (_, i) => shiftMonth(key, i - (n - 1)));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const sum = (arr, f = x => x) => arr.reduce((s, x) => s + f(x), 0);
  const THIS = monthKey(new Date());
  Object.assign(PW, { pad, uid, esc, isoDate, parseDate, monthKey, shiftMonth, monthLabel, shortMonth, daysIn, monthsBack, clamp, sum, THIS });

  function mulberry32(a) {
    return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }

  /* ---------- Demo data ---------- */
  function seed() {
    const rnd = mulberry32(42);
    const now = new Date();
    const tx = [];
    const since = shiftMonth(THIS, -5);
    const recurring = [
      { id: 'r-salary', type: 'income', cat: 'salary', amt: 4200, desc: 'Monthly salary', day: 1 },
      { id: 'r-rent', type: 'expense', cat: 'housing', amt: 1150, desc: 'Rent', day: 2 },
      { id: 'r-transit', type: 'expense', cat: 'transport', amt: 60, desc: 'Transit pass', day: 3 },
      { id: 'r-internet', type: 'expense', cat: 'bills', amt: 55, desc: 'Internet', day: 6 },
      { id: 'r-stream', type: 'expense', cat: 'fun', amt: 15.99, desc: 'Streaming', day: 7 },
      { id: 'r-gym', type: 'expense', cat: 'health', amt: 35, desc: 'Gym membership', day: 8 },
    ].map(r => ({ ...r, since }));
    const rmap = Object.fromEntries(recurring.map(r => [r.desc, r.id]));
    for (let k = 5; k >= 0; k--) {
      const d = new Date(now.getFullYear(), now.getMonth() - k, 1);
      const y = d.getFullYear(), m = d.getMonth() + 1;
      const last = k === 0 ? now.getDate() : new Date(y, m, 0).getDate();
      const add = (day, desc, cat, amt) => {
        if (day > last) return;
        const t = { id: uid(), type: CATS[cat].t, desc, cat, amt: Math.round(amt * 100) / 100, date: `${y}-${pad(m)}-${pad(day)}` };
        if (rmap[desc]) t.rid = rmap[desc];
        tx.push(t);
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
    const cd = (monthsAgo, day) => {
      const d = new Date(now.getFullYear(), now.getMonth() - monthsAgo, Math.min(day, monthsAgo === 0 ? now.getDate() : 28));
      return isoDate(d);
    };
    const dl = months => isoDate(new Date(now.getFullYear(), now.getMonth() + months, 28));
    const goals = [
      { id: uid(), name: 'Emergency fund', target: 6000, deadline: null, created: cd(5, 1),
        contribs: [[5, 400], [4, 350], [3, 400], [2, 300], [1, 400], [0, 150]].map(([a, v]) => ({ date: cd(a, 15), amt: v })) },
      { id: uid(), name: 'Trip to Japan', target: 3200, deadline: dl(7), created: cd(4, 1),
        contribs: [[3, 200], [2, 200], [1, 200], [0, 100]].map(([a, v]) => ({ date: cd(a, 16), amt: v })) },
      { id: uid(), name: 'New laptop', target: 1800, deadline: dl(3), created: cd(4, 1),
        contribs: [[3, 300], [2, 300], [1, 300], [0, 200]].map(([a, v]) => ({ date: cd(a, 17), amt: v })) },
    ];
    return { tx, recurring, goals };
  }
  PW.seed = seed;

  /* ---------- State ---------- */
  const defaults = () => ({
    currency: 'USD', theme: 'dark', sidebar: 'expanded', budgets: { ...DEFAULT_BUDGETS },
    tx: [], goals: [], recurring: [], skipped: [], demo: false, welcomed: false, upgradePrompt: false, v: 2,
  });

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORE));
      if (raw && Array.isArray(raw.tx)) {
        const s = { ...defaults(), ...raw, budgets: { ...DEFAULT_BUDGETS, ...(raw.budgets || {}) } };
        if (!['dark', 'light', 'system'].includes(s.theme)) s.theme = 'dark';
        ['goals', 'recurring', 'skipped'].forEach(k => { if (!Array.isArray(s[k])) s[k] = []; });
        s.tx = s.tx.filter(t => t && typeof t.amt === 'number' && /^\d{4}-\d{2}-\d{2}$/.test(t.date) && CATS[t.cat]);
        if (!raw.v) { s.upgradePrompt = true; s.v = 2; }   // came from the first version of the app
        return s;
      }
    } catch (e) { /* fall through to fresh state */ }
    const s = defaults();
    Object.assign(s, seed());
    s.demo = true;
    return s;
  }
  const state = (PW.state = load());

  let ver = 0;
  const cache = new Map();
  PW.save = () => { try { localStorage.setItem(STORE, JSON.stringify(state)); return true; } catch (e) { return false; } };
  PW.commit = () => { ver++; cache.clear(); PW.save(); if (PW.onChange) PW.onChange(); };
  PW.resetCache = () => cache.clear();

  /* ---------- Formatting ---------- */
  PW.setFormatters = () => {
    const base = { style: 'currency', currency: state.currency };
    const zero = state.currency === 'JPY';
    const f0 = new Intl.NumberFormat(undefined, { ...base, maximumFractionDigits: 0 });
    const f2 = new Intl.NumberFormat(undefined, { ...base, minimumFractionDigits: zero ? 0 : 2, maximumFractionDigits: zero ? 0 : 2 });
    const fc = new Intl.NumberFormat(undefined, { ...base, notation: 'compact', maximumFractionDigits: 1 });
    PW.fmt0 = v => f0.format(Math.round(v) === 0 ? 0 : v);
    PW.fmt2 = v => f2.format(v);
    PW.fmtC = v => fc.format(v);
    PW.currencySymbol = () => (f0.formatToParts(0).find(p => p.type === 'currency') || { value: '$' }).value;
  };
  PW.setFormatters();
  PW.pct = v => `${Math.round(v)}%`;
  PW.fmtDate = (s, opts = { month: 'short', day: 'numeric' }) => parseDate(s).toLocaleDateString(undefined, opts);

  /* ---------- Recurring items ---------- */
  const isPosted = (r, k) => state.tx.some(t => t.date.slice(0, 7) === k && (t.rid === r.id || (t.desc === r.desc && t.cat === r.cat && t.type === r.type)));
  PW.ensureRecurring = () => {
    let changed = false;
    const today = new Date().getDate();
    for (const r of state.recurring) {
      for (let k = r.since || THIS; k <= THIS; k = shiftMonth(k, 1)) {
        if (k === THIS && r.day > today) continue;
        if (state.skipped.includes(`${r.id}:${k}`) || isPosted(r, k)) continue;
        state.tx.push({ id: uid(), type: r.type, cat: r.cat, amt: r.amt, desc: r.desc, date: `${k}-${pad(Math.min(r.day, daysIn(k)))}`, rid: r.id });
        changed = true;
      }
    }
    return changed;
  };

  PW.upcomingBills = (limit = 6) => {
    const now = new Date(), today = now.getDate();
    const items = [];
    for (const r of state.recurring) {
      if (r.type !== 'expense') continue;
      let k = THIS;
      if (r.day <= today || isPosted(r, THIS)) k = shiftMonth(THIS, 1);
      items.push({ r, date: `${k}-${pad(Math.min(r.day, daysIn(k)))}`, thisMonth: k === THIS });
    }
    return items.sort((a, b) => a.date.localeCompare(b.date)).slice(0, limit);
  };

  /* ---------- Selectors ---------- */
  PW.inMonth = k => state.tx.filter(t => t.date.slice(0, 7) === k);
  PW.totalsFor = k => {
    let r = cache.get(k);
    if (r) return r;
    r = { income: 0, expense: 0, fixed: 0, byCat: {}, fixedCat: {}, count: 0 };
    for (const t of state.tx) {
      if (t.date.slice(0, 7) !== k) continue;
      r.count++;
      if (t.type === 'income') r.income += t.amt;
      else { r.expense += t.amt; r.byCat[t.cat] = (r.byCat[t.cat] || 0) + t.amt; if (t.rid) { r.fixed += t.amt; r.fixedCat[t.cat] = (r.fixedCat[t.cat] || 0) + t.amt; } }
    }
    cache.set(k, r);
    return r;
  };
  PW.balanceAt = k => sum(state.tx.filter(t => t.date.slice(0, 7) <= k), t => (t.type === 'income' ? t.amt : -t.amt));
  PW.series = (k, n = 6) => monthsBack(k, n).map(m => ({ key: m, ...PW.totalsFor(m) }));
  PW.totalBudget = () => sum(EXPENSE_CATS, c => state.budgets[c] || 0);
  const activeMonths = (k, n) => monthsBack(shiftMonth(k, -1), n).filter(m => PW.totalsFor(m).count > 0);
  PW.avgByCat = (k, n = 3) => {
    const ms = activeMonths(k, n), out = {};
    EXPENSE_CATS.forEach(c => { out[c] = ms.length ? sum(ms, m => PW.totalsFor(m).byCat[c] || 0) / ms.length : 0; });
    return out;
  };
  PW.avgOf = (k, field, n = 3) => { const ms = activeMonths(k, n); return ms.length ? sum(ms, m => PW.totalsFor(m)[field]) / ms.length : 0; };


  /* Projected month-end spend for one category: fixed bills are counted once, only variable
     spending is extrapolated, and the early-month pace is blended with history. */
  PW.catProjection = (k, c) => {
    const t = PW.totalsFor(k), spent = t.byCat[c] || 0;
    if (k !== THIS) return spent;
    const dim = daysIn(k), today = new Date().getDate();
    const upcoming = sum(state.recurring.filter(r => r.type === 'expense' && r.cat === c && r.day > today && !isPosted(r, k)), r => r.amt);
    const variable = spent - (t.fixedCat[c] || 0);
    const ms = activeMonths(k, 3);
    const prior = ms.length ? sum(ms, m => { const x = PW.totalsFor(m); return ((x.byCat[c] || 0) - (x.fixedCat[c] || 0)) / daysIn(m); }) / ms.length : 0;
    return spent + upcoming + ((variable + prior * 3) / (today + 3)) * (dim - today);
  };

  /* ---------- Forecast ---------- */
  PW.forecast = k => {
    const t = PW.totalsFor(k), dim = daysIn(k), budget = PW.totalBudget();
    const base = { actual: t.expense, budget, dim, income: t.income };
    if (k !== THIS) return { ...base, projected: t.expense, past: k < THIS, future: k > THIS, day: dim, daysLeft: 0, upcoming: 0, safePerDay: 0, rate: 0 };
    const today = new Date().getDate(), daysLeft = dim - today;
    const upcoming = sum(state.recurring.filter(r => r.type === 'expense' && r.day > today && !isPosted(r, k)), r => r.amt);
    const ms = activeMonths(k, 3);
    const priorDaily = ms.length ? sum(ms, m => { const x = PW.totalsFor(m); return (x.expense - x.fixed) / daysIn(m); }) / ms.length : 0;
    const variable = t.expense - t.fixed;
    const rate = (variable + priorDaily * 3) / (today + 3);     // smooth early-month noise with history
    const projected = t.expense + upcoming + rate * daysLeft;
    const safePerDay = daysLeft > 0 ? Math.max(0, (budget - t.expense - upcoming) / daysLeft) : 0;
    return { ...base, projected, past: false, future: false, day: today, daysLeft, upcoming, safePerDay, rate };
  };

  /* ---------- Financial health score ---------- */
  PW.health = k => {
    const t = PW.totalsFor(k), f = PW.forecast(k);
    const rate = t.income > 0 ? (t.income - t.expense) / t.income : (t.expense > 0 ? -1 : 0);
    const savingsPts = clamp(rate / 0.2, 0, 1) * 35;
    const limits = EXPENSE_CATS.filter(c => (state.budgets[c] || 0) > 0);
    let adherence = 0.5;
    if (limits.length) {
      const tot = sum(limits, c => state.budgets[c]);
      adherence = sum(limits, c => {
        const ratio = (t.byCat[c] || 0) / state.budgets[c];
        return state.budgets[c] * (ratio <= 1 ? 1 : Math.max(0, 1 - (ratio - 1)));
      }) / tot;
    }
    const avgExp = PW.avgOf(k, 'expense');
    const stability = avgExp > 0 ? clamp(1 - Math.max(0, f.projected / avgExp - 1) / 0.5, 0, 1) : 0.7;
    const monthlyCost = avgExp || t.expense;
    const buffer = monthlyCost > 0 ? clamp(PW.balanceAt(k) / monthlyCost / 3, 0, 1) : 0;
    const parts = [
      { key: 'save', label: 'Savings rate', pts: savingsPts, max: 35, hint: t.income > 0 ? `Saving ${Math.round(rate * 100)}% of income. Aim for 20%.` : 'No income recorded this month.' },
      { key: 'budget', label: 'Budget adherence', pts: adherence * 30, max: 30, hint: limits.length ? 'How well spending stays inside your category limits.' : 'Set category budgets to score this.' },
      { key: 'stable', label: 'Spending stability', pts: stability * 15, max: 15, hint: avgExp > 0 ? 'Compares spending with your 3-month average.' : 'Needs a few months of history.' },
      { key: 'buffer', label: 'Safety buffer', pts: buffer * 20, max: 20, hint: monthlyCost > 0 ? `Balance covers ${(PW.balanceAt(k) / monthlyCost).toFixed(1)} months of spending. Aim for 3.` : 'Add expenses to measure this.' },
    ];
    const score = Math.round(sum(parts, p => p.pts));
    const label = score >= 80 ? 'Excellent' : score >= 65 ? 'Good' : score >= 45 ? 'Fair' : 'Needs attention';
    const tone = score >= 65 ? 'pos' : score >= 45 ? 'warn' : 'neg';
    return { score, label, tone, parts };
  };

  /* ---------- Goals ---------- */
  PW.goalSaved = g => sum(g.contribs, c => c.amt);
  PW.goalInfo = g => {
    const saved = PW.goalSaved(g), remaining = Math.max(0, g.target - saved);
    const pct = g.target > 0 ? Math.min(1, saved / g.target) : 0;
    const now = new Date();
    const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 90);
    const rate = sum(g.contribs.filter(c => parseDate(c.date) >= cutoff), c => c.amt) / 3;
    let needed = null, monthsLeft = null, overdue = false;
    if (g.deadline) {
      const days = (parseDate(g.deadline) - now) / 86400000;
      overdue = days <= 0 && remaining > 0;
      monthsLeft = Math.max(1, Math.ceil(days / 30.44));
      needed = remaining / monthsLeft;
    }
    const eta = rate > 0 && remaining > 0 ? new Date(now.getFullYear(), now.getMonth() + Math.ceil(remaining / rate), now.getDate()) : null;
    let status;
    if (remaining === 0) status = 'done';
    else if (!g.deadline) status = rate > 0 ? 'ontrack' : 'idle';
    else if (overdue) status = 'behind';
    else status = eta && eta <= parseDate(g.deadline) ? 'ontrack' : 'behind';
    return { saved, remaining, pct, rate, needed, monthsLeft, overdue, eta, status };
  };

  /* ---------- Recurring-charge detection ---------- */
  PW.detectRecurring = () => {
    const ms = monthsBack(THIS, 4), groups = {};
    for (const t of state.tx) {
      if (t.type !== 'expense' || t.rid || !ms.includes(t.date.slice(0, 7))) continue;
      const key = t.desc.trim().toLowerCase();
      (groups[key] = groups[key] || []).push(t);
    }
    const known = new Set(state.recurring.map(r => r.desc.trim().toLowerCase()));
    const found = [];
    for (const [key, list] of Object.entries(groups)) {
      if (known.has(key)) continue;
      const months = new Set(list.map(t => t.date.slice(0, 7)));
      if (months.size < 3 || months.size !== list.length) continue;       // one charge per month
      const amts = list.map(t => t.amt).sort((a, b) => a - b), med = amts[Math.floor(amts.length / 2)];
      if (amts.some(a => Math.abs(a - med) / med > 0.05)) continue;
      const days = list.map(t => +t.date.slice(8)).sort((a, b) => a - b);
      found.push({ desc: list[0].desc, cat: list[0].cat, amt: Math.round(med * 100) / 100, day: Math.min(28, days[Math.floor(days.length / 2)]), months: months.size });
    }
    return found;
  };

  /* ---------- Insights engine ---------- */
  PW.insights = k => {
    const out = [], f = PW.forecast(k), t = PW.totalsFor(k), isCur = k === THIS;
    const { fmt0, fmt2 } = PW, B = state.budgets;
    if (f.budget > 0 && t.expense > 0 && !f.future) {
      const diff = f.projected - f.budget;
      if (isCur) out.push(diff > 0
        ? { tone: 'neg', icon: 'trendUp', title: `On pace to overspend by ${fmt0(diff)}`, body: `At this pace you'll spend about ${fmt0(f.projected)} against a ${fmt0(f.budget)} budget. Trimming ${fmt0(diff / Math.max(1, f.daysLeft))} a day would bring you back on track.`, go: 'budgets', cta: 'Review budgets' }
        : { tone: 'pos', icon: 'check', title: `On track to finish ${fmt0(-diff)} under budget`, body: `Projected spending is ${fmt0(f.projected)} against a ${fmt0(f.budget)} budget. You can spend about ${fmt0(f.safePerDay)} a day and stay on plan.` });
      else out.push(diff > 0
        ? { tone: 'neg', icon: 'trendUp', title: `Overspent by ${fmt0(diff)} in ${PW.monthLabel(k)}`, body: `You spent ${fmt0(t.expense)} against a ${fmt0(f.budget)} budget.` }
        : { tone: 'pos', icon: 'check', title: `Finished ${fmt0(-diff)} under budget`, body: `You spent ${fmt0(t.expense)} against a ${fmt0(f.budget)} budget.` });
    }
    EXPENSE_CATS.forEach(c => {
      const limit = B[c] || 0, spent = t.byCat[c] || 0;
      if (limit <= 0) return;
      const ratio = spent / limit;
      if (ratio >= 1) out.push({ tone: 'neg', icon: 'alert', cat: c, title: `${CATS[c].n} is ${fmt0(spent - limit)} over budget`, body: `${fmt0(spent)} spent of a ${fmt0(limit)} limit.`, go: 'budgets', cta: 'Adjust limit' });
      else if (ratio >= 0.85) out.push({ tone: 'warn', icon: 'alert', cat: c, title: `${CATS[c].n} is at ${Math.round(ratio * 100)}% of its limit`, body: `${fmt0(limit - spent)} left${isCur && f.daysLeft ? ` for the next ${f.daysLeft} days` : ''}.` });
    });
    const avg = PW.avgByCat(k, 3);
    EXPENSE_CATS.forEach(c => {
      const spent = t.byCat[c] || 0, a = avg[c];
      if (a > 20 && spent > a * 1.3 && spent - a > 30) out.push({ tone: 'warn', icon: 'trendUp', cat: c, title: `${CATS[c].n} is ${Math.round((spent / a - 1) * 100)}% above normal${isCur ? ' already' : ''}`, body: `${fmt0(spent)} so far against a 3-month average of ${fmt0(a)}.` });
    });
    if (t.income > 0 && !f.future) {
      const rate = (t.income - t.expense) / t.income;
      if (rate >= 0.2) out.push({ tone: 'pos', icon: 'trendUp', title: `You're saving ${Math.round(rate * 100)}% of your income`, body: 'That is above the common 20% guideline. Consider pointing the surplus at a goal.', go: 'goals', cta: 'View goals' });
      else if (rate >= 0) out.push({ tone: 'info', icon: 'target', title: `Savings rate is ${Math.round(rate * 100)}%`, body: `Reaching 20% would mean setting aside ${fmt0(t.income * 0.2 - (t.income - t.expense))} more this month.` });
      else out.push({ tone: 'neg', icon: 'trendDown', title: 'Spending exceeds income this month', body: `You're ${fmt0(t.expense - t.income)} in the red for ${PW.monthLabel(k)}.` });
    }
    const biggest = PW.inMonth(k).filter(x => x.type === 'expense').sort((a, b) => b.amt - a.amt)[0];
    if (biggest && t.expense > 0 && biggest.amt / t.expense > 0.15 && biggest.amt > 150 && !biggest.rid)
      out.push({ tone: 'info', icon: 'search', title: `Largest expense: ${biggest.desc} (${fmt0(biggest.amt)})`, body: `That is ${Math.round(biggest.amt / t.expense * 100)}% of everything you spent this month.` });
    if (isCur) PW.detectRecurring().slice(0, 2).forEach(d => out.push({
      tone: 'info', icon: 'repeat', title: `${d.desc} looks like a recurring charge`,
      body: `Charged ${d.months} months in a row at about ${fmt2(d.amt)}. Tracking it adds it to forecasts and upcoming bills.`,
      action: { type: 'addRecurring', data: d }, cta: 'Track as recurring',
    }));
    state.goals.forEach(g => {
      const gi = PW.goalInfo(g);
      if (gi.status === 'behind' && g.deadline) out.push({ tone: 'warn', icon: 'target', title: `"${g.name}" is behind schedule`, body: gi.overdue ? 'The deadline has passed.' : `You need about ${fmt0(gi.needed)} a month to finish by ${PW.fmtDate(g.deadline, { month: 'short', year: 'numeric' })}. Your recent pace is ${fmt0(gi.rate)}.`, go: 'goals', cta: 'Open goals' });
      else if (gi.status === 'done') out.push({ tone: 'pos', icon: 'check', title: `"${g.name}" is fully funded`, body: 'Goal reached. Nice work.' });
    });
    const monthly = PW.avgOf(k, 'expense') || t.expense;
    if (monthly > 0 && !f.future) {
      const months = PW.balanceAt(k) / monthly;
      if (months < 1) out.push({ tone: 'warn', icon: 'shield', title: 'Thin safety buffer', body: `Your balance covers ${Math.max(0, months).toFixed(1)} months of spending. Most experts suggest 3 to 6.`, go: 'goals', cta: 'Plan a buffer' });
      else if (months >= 3) out.push({ tone: 'pos', icon: 'shield', title: `Solid buffer: ${months.toFixed(1)} months covered`, body: 'You have at least three months of expenses set aside.' });
    }
    const order = { neg: 0, warn: 1, info: 2, pos: 3 };
    return out.sort((a, b) => order[a.tone] - order[b.tone]);
  };

  /* ---------- Mutations ---------- */
  PW.addRecurring = (r, { post = true } = {}) => {
    const rec = { id: uid(), type: r.type || 'expense', cat: r.cat, amt: r.amt, desc: r.desc, day: Math.min(28, r.day), since: r.since || THIS };
    state.recurring.push(rec);
    if (post) PW.ensureRecurring();
    return rec;
  };
  PW.removeTx = id => {
    const i = state.tx.findIndex(t => t.id === id);
    if (i < 0) return null;
    const [t] = state.tx.splice(i, 1);
    if (t.rid) state.skipped.push(`${t.rid}:${t.date.slice(0, 7)}`);
    return t;
  };
  PW.restoreTx = t => {
    state.tx.push(t);
    if (t.rid) state.skipped = state.skipped.filter(x => x !== `${t.rid}:${t.date.slice(0, 7)}`);
  };

  /* ---------- Shared view state ---------- */
  PW.view = { month: THIS };
})();
