/* Dashboard view. */
(() => {
  'use strict';
  const PW = window.PW, UI = PW.ui, { esc, CATS, state } = PW;
  const icon = UI.icon;
  const $ = (s, r = document) => r.querySelector(s);

  const delta = (cur, prev, goodUp) => {
    if (!prev) return '';
    const ch = (cur - prev) / prev * 100, up = ch >= 0;
    return UI.pill(`${icon(up ? 'arrowUp' : 'arrowDown')}${Math.abs(ch).toFixed(0)}% vs last month`, up === goodUp ? 'pos' : 'neg');
  };

  const kpi = (i, { label, ic, value, fmt, pill, spark, tone }) => `
    <article class="card kpi" style="--i:${i}">
      <div class="kpi-top"><span class="label">${label}</span><span class="kpi-ic ${tone}">${icon(ic)}</span></div>
      <div class="kpi-mid"><div class="figure">${UI.count(value, fmt)}</div>${spark ? `<span class="spark-wrap">${spark}</span>` : ''}</div>
      <div class="kpi-foot">${pill}</div>
    </article>`;

  const banner = () => {
    if (state.upgradePrompt) return `<div class="banner" style="--i:0"><span class="banner-ic">${icon('sparkles')}</span>
      <div><b>Pennywise just got a lot smarter.</b><p>Forecasts, a health score, savings goals, recurring bills and insights are new. Add sample goals and bills to explore them.</p></div>
      <div class="banner-act"><button class="btn primary" data-act="sample">Add sample goals &amp; bills</button><button class="btn" data-act="dismiss-upgrade">No thanks</button></div></div>`;
    if (state.demo && !state.welcomed) return `<div class="banner" style="--i:0"><span class="banner-ic">${icon('info')}</span>
      <div><b>You're exploring with sample data.</b><p>Everything here is editable. When you're ready, start fresh with your own numbers.</p></div>
      <div class="banner-act"><button class="btn primary" data-act="fresh">Start fresh</button><button class="btn" data-act="dismiss-demo">Keep exploring</button></div></div>`;
    return '';
  };

  /* ----- Month outlook (forecast) ----- */
  const outlook = (k, i) => {
    const f = PW.forecast(k), cur = k === PW.THIS;
    if (f.future) return `<article class="card span-7" style="--i:${i}"><header class="card-head"><div><h2>Month outlook</h2><p class="sub">${PW.monthLabel(k)}</p></div></header>
      <div class="empty compact"><div class="empty-ic">${icon('calendar')}</div><p>This month hasn't started yet.</p></div></article>`;
    const scale = Math.max(f.budget, f.projected, f.actual, 1) * 1.06;
    const over = f.projected > f.budget && f.budget > 0;
    const headline = cur
      ? (f.budget <= 0 ? 'Set budgets to see how you are pacing.' : over
        ? `You're on pace to overspend by <b class="neg">${PW.fmt0(f.projected - f.budget)}</b>.`
        : `You're on pace to finish <b class="pos">${PW.fmt0(f.budget - f.projected)}</b> under budget.`)
      : (f.actual <= 0 ? 'No spending was recorded this month.' : f.budget <= 0 ? 'Set budgets to compare against.' : f.actual > f.budget
        ? `You overspent by <b class="neg">${PW.fmt0(f.actual - f.budget)}</b>.` : `You finished <b class="pos">${PW.fmt0(f.budget - f.actual)}</b> under budget.`);
    const stats = cur ? [
      ['Spent so far', UI.count(f.actual)], ['Safe to spend / day', UI.count(f.safePerDay)], ['Upcoming bills', UI.count(f.upcoming)], ['Days left', UI.count(f.daysLeft, 'int')],
    ] : [['Total spent', UI.count(f.actual)], ['Budget', UI.count(f.budget)], ['Income', UI.count(f.income)], ['Saved', UI.count(Math.max(0, f.income - f.actual))]];
    return `<article class="card span-7" style="--i:${i}">
      <header class="card-head"><div><h2>${cur ? 'Month outlook' : 'Month summary'}</h2><p class="sub">${cur ? 'Forecast based on your pace, history and upcoming bills' : PW.monthLabel(k)}</p></div></header>
      <div class="outlook-top"><div><span class="label">${cur ? 'Projected spending' : 'Total spending'}</span><div class="figure">${UI.count(f.projected)}</div></div>
        <div class="outlook-vs"><span class="label">Budget</span><div class="figure sm">${PW.fmt0(f.budget)}</div></div></div>
      <div class="pace" aria-hidden="true">
        <span class="pace-actual fillx" style="--p:${f.actual / scale}"></span>
        ${cur ? `<span class="pace-proj ${over ? 'neg' : ''}" style="left:${f.actual / scale * 100}%;width:${Math.max(0, f.projected - f.actual) / scale * 100}%"></span>` : ''}
        ${f.budget > 0 ? `<span class="pace-budget" style="left:${f.budget / scale * 100}%"><i>Budget</i></span>` : ''}
      </div>
      <p class="headline">${headline}</p>
      <dl class="stat-row">${stats.map(([l, v]) => `<div><dt>${l}</dt><dd>${v}</dd></div>`).join('')}</dl>
    </article>`;
  };

  /* ----- Health score ----- */
  const healthCard = (k, i) => {
    if (PW.totalsFor(k).count === 0) return `<article class="card span-5" style="--i:${i}">
      <header class="card-head"><div><h2>Financial health</h2><p class="sub">A score out of 100 from four signals</p></div></header>
      <div class="empty compact"><div class="empty-ic">${icon('shield')}</div><p>Record some income and spending and your score appears here.</p></div></article>`;
    const h = PW.health(k);
    return `<article class="card span-5" style="--i:${i}">
      <header class="card-head"><div><h2>Financial health</h2><p class="sub">A score out of 100 from four signals</p></div></header>
      <div class="health">
        ${UI.ring(h.score / 100, { size: 132, stroke: 11, tone: h.tone, inner: `<b class="figure">${UI.count(h.score, 'int')}</b><span class="ring-sub ${h.tone}">${h.label}</span>` })}
        <ul class="parts">${h.parts.map(p => `<li title="${esc(p.hint)}"><div class="part-top"><span>${p.label}</span><span class="num">${Math.round(p.pts)}/${p.max}</span></div>
          <div class="bar"><span class="fillx" style="--p:${p.pts / p.max}"></span></div></li>`).join('')}</ul>
      </div></article>`;
  };

  /* ----- Insights strip ----- */
  PW.insightCard = (x, i = 0) => `<article class="insight ${x.tone}" style="--i:${i}">
    <span class="insight-ic">${icon(x.icon)}</span>
    <div><h3>${esc(x.title)}</h3><p>${esc(x.body)}</p>
    ${x.cta ? `<button class="link" data-insight="${esc(JSON.stringify({ go: x.go, action: x.action }))}">${esc(x.cta)}${icon('arrowRight')}</button>` : ''}</div></article>`;

  /* ----- Cash flow chart ----- */
  PW.cashFlow = (data, i = 0) => {
    if (data.every(d => !d.income && !d.expense)) return `<div class="empty compact"><div class="empty-ic">${icon('trendUp')}</div><p>Your cash flow will chart here once you add transactions.</p></div>`;
    const max = Math.max(1, ...data.map(d => Math.max(d.income, d.expense)));
    return `<div class="cf"><div class="cf-axis"><span>${PW.fmtC(max)}</span><span>${PW.fmtC(max / 2)}</span><span>0</span></div>
      <div class="cf-plot">${data.map((d, n) => `<div class="cf-col ${n === data.length - 1 ? 'current' : ''}" data-tip="${esc(`${PW.monthLabel(d.key)}|Income ${PW.fmt0(d.income)}|Expenses ${PW.fmt0(d.expense)}|Net ${PW.fmt0(d.income - d.expense)}`)}">
        <div class="cf-bars"><span class="cf-bar inc fillyy" style="--p:${d.income / max};--d:${n * 60}"></span><span class="cf-bar exp fillyy" style="--p:${d.expense / max};--d:${n * 60 + 70}"></span></div>
        <span class="cf-label">${PW.shortMonth(d.key)}</span></div>`).join('')}</div></div>`;
  };

  PW.views.dashboard = {
    title: 'Dashboard',
    sub: () => `Your money at a glance · ${PW.monthLabel(PW.view.month)}`,
    monthly: true,
    render(root, play) {
      const k = PW.view.month, t = PW.totalsFor(k), prev = PW.totalsFor(PW.shiftMonth(k, -1));
      const series = PW.series(k, 6), f = PW.forecast(k);
      const balance = PW.balanceAt(k), net = t.income - t.expense;
      const rate = t.income > 0 ? Math.max(0, (t.income - t.expense) / t.income * 100) : 0;
      const prevRate = prev.income > 0 ? Math.max(0, (prev.income - prev.expense) / prev.income * 100) : 0;
      let n = 1; const i = () => n++;

      const cats = PW.EXPENSE_CATS.map(c => ({ key: c, label: CATS[c].n, color: CATS[c].c, value: t.byCat[c] || 0 })).sort((a, b) => b.value - a.value);
      const budgets = PW.EXPENSE_CATS.map(c => ({ c, spent: t.byCat[c] || 0, limit: state.budgets[c] || 0 }))
        .filter(b => b.limit > 0).map(b => ({ ...b, ratio: b.spent / b.limit })).sort((a, b) => b.ratio - a.ratio).slice(0, 5);
      const ins = PW.insights(k).slice(0, 3);
      const bills = PW.upcomingBills(5);
      const recent = PW.inMonth(k).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)).slice(0, 6);
      const balances = PW.monthsBack(k, 6).map(PW.balanceAt);

      root.innerHTML = `${banner()}
        <section class="grid kpis">
          ${kpi(i(), { label: 'Total balance', ic: 'wallet', tone: 'accent', value: balance, fmt: 'c0', pill: UI.pill(`${icon(net >= 0 ? 'arrowUp' : 'arrowDown')}${net >= 0 ? '+' : '−'}${PW.fmt0(Math.abs(net))} this month`, net >= 0 ? 'pos' : 'neg'), spark: UI.sparkline(balances, 'accent') })}
          ${kpi(i(), { label: 'Income', ic: 'arrowDown', tone: 'pos', value: t.income, fmt: 'c0', pill: delta(t.income, prev.income, true), spark: UI.sparkline(series.map(s => s.income), 'pos') })}
          ${kpi(i(), { label: 'Expenses', ic: 'arrowUp', tone: 'neg', value: t.expense, fmt: 'c0', pill: delta(t.expense, prev.expense, false), spark: UI.sparkline(series.map(s => s.expense), 'neg') })}
          ${kpi(i(), { label: 'Savings rate', ic: 'percent', tone: 'info', value: rate, fmt: 'pct', pill: prev.income ? UI.pill(`${rate >= prevRate ? '+' : '−'}${Math.abs(rate - prevRate).toFixed(0)} pts vs last month`, rate >= prevRate ? 'pos' : 'neg') : '', spark: UI.sparkline(series.map(s => s.income ? Math.max(0, (s.income - s.expense) / s.income * 100) : 0), 'info') })}
        </section>

        <section class="grid">
          ${outlook(k, i())}
          ${healthCard(k, i())}
        </section>

        ${ins.length ? `<section class="insights-strip"><header class="strip-head"><h2>Insights for you</h2><a class="link" href="#/insights">All insights${icon('arrowRight')}</a></header>
          <div class="insight-grid">${ins.map(x => PW.insightCard(x, i())).join('')}</div></section>` : ''}

        <section class="grid">
          <article class="card span-7" style="--i:${i()}">
            <header class="card-head"><div><h2>Cash flow</h2><p class="sub">Income vs. expenses, last 6 months</p></div>
              <div class="key"><span><i class="dot pos"></i>Income</span><span><i class="dot neg"></i>Expenses</span></div></header>
            ${PW.cashFlow(series)}
          </article>
          <article class="card span-5" style="--i:${i()}">
            <header class="card-head"><div><h2>Spending breakdown</h2><p class="sub">${PW.monthLabel(k)}</p></div></header>
            ${t.expense ? `<div class="donut-wrap"><div class="donut" id="donut">${UI.donut(cats)}
              <div class="donut-center"><span class="label" id="dcLabel">Spent</span><b class="figure sm">${UI.count(t.expense)}</b></div></div>
              <ul class="legend">${cats.filter(c => c.value > 0).map(c => `<li data-cat="${c.key}" style="--c:${c.color}"><span class="sw"></span><span>${c.label}</span><b class="num">${PW.fmt0(c.value)}</b><small class="num">${Math.round(c.value / t.expense * 100)}%</small></li>`).join('')}</ul></div>`
              : `<div class="empty compact"><div class="empty-ic">${icon('pie')}</div><p>No expenses recorded for this month.</p></div>`}
          </article>
        </section>

        <section class="grid">
          <article class="card span-7" style="--i:${i()}">
            <header class="card-head"><div><h2>Budgets</h2><p class="sub">Categories closest to their limits</p></div><a class="link" href="#/budgets">Manage${icon('arrowRight')}</a></header>
            <ul class="b-list">${budgets.map((b, n) => `<li class="b-row ${b.ratio >= 1 ? 'over' : b.ratio >= 0.85 ? 'warn' : ''}" style="--c:${CATS[b.c].c}">
              ${UI.catChip(b.c)}<div class="b-body"><div class="b-top"><span>${CATS[b.c].n}</span><span class="num"><b>${PW.fmt0(b.spent)}</b> / ${PW.fmt0(b.limit)}</span></div>
              <div class="bar"><span class="fillx" style="--p:${Math.min(1, b.ratio)};--d:${n * 70}"></span></div></div></li>`).join('') || '<li class="muted">No budgets set yet.</li>'}</ul>
          </article>
          <article class="card span-5" style="--i:${i()}">
            <header class="card-head"><div><h2>Goals</h2><p class="sub">Progress toward what matters</p></div><a class="link" href="#/goals">Open${icon('arrowRight')}</a></header>
            ${state.goals.length ? `<ul class="goal-mini">${state.goals.slice(0, 3).map(g => {
              const gi = PW.goalInfo(g);
              return `<li>${UI.ring(gi.pct, { size: 46, stroke: 5, tone: gi.status === 'behind' ? 'warn' : 'pos', inner: `<span class="ring-mini">${Math.round(gi.pct * 100)}</span>` })}
                <div><b>${esc(g.name)}</b><small class="num">${PW.fmt0(gi.saved)} of ${PW.fmt0(g.target)}</small></div>
                ${UI.pill(gi.status === 'done' ? 'Complete' : gi.status === 'behind' ? 'Behind' : gi.status === 'ontrack' ? 'On track' : 'No pace yet', gi.status === 'behind' ? 'warn' : gi.status === 'idle' ? '' : 'pos')}</li>`;
            }).join('')}</ul>`
              : `<div class="empty compact"><div class="empty-ic">${icon('target')}</div><p>Set a savings goal to start tracking progress.</p><a class="btn" href="#/goals">Create a goal</a></div>`}
          </article>
        </section>

        <section class="grid">
          <article class="card span-7" style="--i:${i()}">
            <header class="card-head"><div><h2>Recent transactions</h2><p class="sub">${PW.monthLabel(k)}</p></div><a class="link" href="#/transactions">View all${icon('arrowRight')}</a></header>
            ${recent.length ? `<ul class="tx-list flat">${recent.map(x => PW.txRow(x, { actions: false })).join('')}</ul>`
              : `<div class="empty compact"><div class="empty-ic">${icon('wallet')}</div><p>Nothing recorded for this month yet.</p><button class="btn primary" data-act="add">Add transaction</button></div>`}
          </article>
          <article class="card span-5" style="--i:${i()}">
            <header class="card-head"><div><h2>Upcoming bills</h2><p class="sub">Recurring payments</p></div><a class="link" href="#/budgets">Manage${icon('arrowRight')}</a></header>
            ${bills.length ? `<ul class="bills">${bills.map(b => { const d = PW.parseDate(b.date); return `<li>
              <span class="date-badge"><b>${d.getDate()}</b><small>${d.toLocaleDateString(undefined, { month: 'short' })}</small></span>
              <div><b>${esc(b.r.desc)}</b><small>${CATS[b.r.cat].n}${b.thisMonth ? '' : ' · next month'}</small></div><span class="num">${PW.fmt2(b.r.amt)}</span></li>`; }).join('')}</ul>`
              : `<div class="empty compact"><div class="empty-ic">${icon('repeat')}</div><p>Add recurring bills to see what's due next.</p><a class="btn" href="#/budgets">Add a bill</a></div>`}
          </article>
        </section>`;

      /* donut hover: show category in centre */
      const donut = $('#donut', root);
      if (donut) {
        const lab = $('#dcLabel', donut);
        const set = c => {
          donut.classList.toggle('hovering', !!c);
          donut.querySelectorAll('.dseg').forEach(s => s.classList.toggle('on', s.dataset.cat === c));
          root.querySelectorAll('.legend li').forEach(l => l.classList.toggle('on', l.dataset.cat === c));
          lab.textContent = c ? CATS[c].n : 'Spent';
        };
        donut.addEventListener('mouseover', e => { const s = e.target.closest('.dseg'); if (s) set(s.dataset.cat); });
        donut.addEventListener('mouseleave', () => set(null));
        root.querySelectorAll('.legend li').forEach(l => { l.addEventListener('mouseenter', () => set(l.dataset.cat)); l.addEventListener('mouseleave', () => set(null)); });
      }

      root.onclick = e => {
        const a = e.target.closest('[data-act]');
        if (a) {
          const act = a.dataset.act;
          if (act === 'add') PW.openTxDialog();
          else if (act === 'dismiss-demo') { state.welcomed = true; PW.commit(); }
          else if (act === 'dismiss-upgrade') { state.upgradePrompt = false; PW.commit(); }
          else if (act === 'fresh') UI.confirm({ title: 'Start fresh?', message: 'This removes the sample transactions, goals and bills so you can enter your own.', label: 'Clear sample data', danger: true, onConfirm: () => PW.clearAll() });
          else if (act === 'sample') { PW.addSample(); }
          return;
        }
        const ins = e.target.closest('[data-insight]');
        if (ins) PW.runInsight(JSON.parse(ins.dataset.insight));
      };
      UI.hydrateCounts(root, play);
    },
  };

  /* Shared insight action handler */
  PW.runInsight = ({ go, action }) => {
    if (action && action.type === 'addRecurring') {
      PW.addRecurring({ ...action.data, type: 'expense' }); PW.commit();
      UI.toast(`Now tracking ${action.data.desc} as recurring`);
    } else if (go) location.hash = `#/${go}`;
  };
})();
