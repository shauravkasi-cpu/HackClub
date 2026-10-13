/* Insights view: forecast, trends, patterns and a what-if simulator. */
(() => {
  'use strict';
  const PW = window.PW, UI = PW.ui, { esc, CATS, state } = PW;
  const icon = UI.icon;
  const $ = (s, r = document) => r.querySelector(s);
  const whatIf = {};   // category -> percent cut, remembered while the app is open

  /* Cumulative spend vs budget pace (SVG; labels are HTML so they never distort). */
  function paceChart(k) {
    const dim = PW.daysIn(k), f = PW.forecast(k), cur = k === PW.THIS;
    if (f.future) return `<div class="empty compact"><div class="empty-ic">${icon('calendar')}</div><p>This month hasn't started yet.</p></div>`;
    const last = cur ? f.day : dim, daily = Array(dim + 1).fill(0);
    PW.inMonth(k).forEach(t => { if (t.type === 'expense') daily[+t.date.slice(8)] += t.amt; });
    const actual = [0]; for (let d = 1; d <= last; d++) actual[d] = actual[d - 1] + daily[d];
    const proj = actual.slice();
    if (cur) {
      const due = Array(dim + 1).fill(0);
      state.recurring.forEach(r => { if (r.type === 'expense' && r.day > last && !state.tx.some(t => t.rid === r.id && t.date.startsWith(k))) due[Math.min(r.day, dim)] += r.amt; });
      for (let d = last + 1; d <= dim; d++) proj[d] = proj[d - 1] + f.rate + due[d];
    }
    const top = Math.max(f.budget, proj[dim] || 0, actual[last], 1) * 1.08, W = 600, H = 220;
    const x = d => ((d - 1) / Math.max(1, dim - 1)) * W, y = v => H - 8 - (v / top) * (H - 16);
    const path = (arr, from, to) => { let p = ''; for (let d = from; d <= to; d++) p += `${p ? 'L' : 'M'}${x(d).toFixed(1)},${y(arr[d]).toFixed(1)}`; return p; };
    const grid = [0, .25, .5, .75, 1].map(g => `<line x1="0" x2="${W}" y1="${y(top / 1.08 * g).toFixed(1)}" y2="${y(top / 1.08 * g).toFixed(1)}" class="gl"/>`).join('');
    const ticks = [1, Math.round(dim / 4), Math.round(dim / 2), Math.round(dim * 3 / 4), dim].filter((v, i, a) => a.indexOf(v) === i);
    return `<div class="line-chart"><div class="cf-axis"><span>${PW.fmtC(top / 1.08)}</span><span>${PW.fmtC(top / 1.08 / 2)}</span><span>0</span></div>
      <div class="lc-plot"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Cumulative spending compared with budget pace">
        ${grid}
        ${f.budget > 0 ? `<path class="l-budget" d="M${x(1)},${y(f.budget / dim)}L${x(dim)},${y(f.budget)}"/>` : ''}
        <path class="l-area" d="${path(actual, 1, last)}L${x(last)},${y(0)}L${x(1)},${y(0)}Z"/>
        ${cur && last < dim ? `<path class="l-proj ${proj[dim] > f.budget && f.budget > 0 ? 'neg' : ''}" d="${path(proj, last, dim)}"/>` : ''}
        <path class="l-actual" d="${path(actual, 1, last)}"/></svg>
        <div class="lc-x">${ticks.map(d => `<span style="left:${x(d) / W * 100}%">${d}</span>`).join('')}</div></div></div>
      <div class="key row"><span><i class="line solid"></i>Actual</span>${cur ? `<span><i class="line dashed accent"></i>Projected</span>` : ''}${f.budget > 0 ? `<span><i class="line dashed muted"></i>Budget pace</span>` : ''}</div>`;
  }

  function stacked(k) {
    const series = PW.series(k, 6), max = Math.max(1, ...series.map(s => s.expense));
    return `<div class="cf stacked"><div class="cf-axis"><span>${PW.fmtC(max)}</span><span>${PW.fmtC(max / 2)}</span><span>0</span></div><div class="cf-plot">
      ${series.map((s, n) => `<div class="cf-col ${n === 5 ? 'current' : ''}"><div class="cf-bars"><div class="stack fillyy" style="--p:${s.expense / max};--d:${n * 60}" data-tip="${esc(`${PW.monthLabel(s.key)}|Total ${PW.fmt0(s.expense)}`)}">
        ${PW.EXPENSE_CATS.filter(c => s.byCat[c]).map(c => `<i style="height:${s.byCat[c] / s.expense * 100}%;background:${CATS[c].c}" data-tip="${esc(`${CATS[c].n}|${PW.fmt0(s.byCat[c])} · ${PW.shortMonth(s.key)}`)}"></i>`).join('')}</div></div>
        <span class="cf-label">${PW.shortMonth(s.key)}</span></div>`).join('')}</div></div>
      <ul class="key wrap">${PW.EXPENSE_CATS.map(c => `<li><i class="dot" style="background:${CATS[c].c}"></i>${CATS[c].n}</li>`).join('')}</ul>`;
  }

  function weekdays(k) {
    const months = PW.monthsBack(k, 3), tot = Array(7).fill(0), cnt = Array(7).fill(0);
    const today = new Date(), todayS = PW.isoDate(today);
    months.forEach(m => {
      for (let d = 1; d <= PW.daysIn(m); d++) {
        const ds = `${m}-${PW.pad(d)}`; if (ds > todayS) break;
        cnt[(PW.parseDate(ds).getDay() + 6) % 7]++;
      }
      PW.inMonth(m).forEach(t => { if (t.type === 'expense') tot[(PW.parseDate(t.date).getDay() + 6) % 7] += t.amt; });
    });
    const avg = tot.map((v, i) => cnt[i] ? v / cnt[i] : 0), max = Math.max(1, ...avg), best = avg.indexOf(Math.max(...avg));
    const names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return { html: `<div class="dow">${avg.map((v, i) => `<div class="dow-col ${i === best && v > 0 ? 'peak' : ''}" data-tip="${esc(`${names[i]}|${PW.fmt0(v)} average`)}"><div class="dow-bar"><span class="fillyy" style="--p:${v / max};--d:${i * 50}"></span></div><small>${names[i]}</small></div>`).join('')}</div>`,
      note: avg[best] > 0 ? `You spend the most on ${['Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays', 'Sundays'][best]}, about ${PW.fmt0(avg[best])} on average.` : 'Not enough spending history yet.' };
  }

  function topSpend(k) {
    const months = PW.monthsBack(k, 3), map = {};
    months.forEach(m => PW.inMonth(m).forEach(t => {
      if (t.type !== 'expense') return;
      const key = t.desc.trim().toLowerCase(), e = map[key] || (map[key] = { desc: t.desc, cat: t.cat, total: 0, n: 0 });
      e.total += t.amt; e.n++;
    }));
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 6);
  }

  function simulator(k) {
    const avg = PW.avgByCat(k, 3);
    const cats = PW.EXPENSE_CATS.filter(c => avg[c] > 0).sort((a, b) => avg[b] - avg[a]).slice(0, 5);
    if (!cats.length) return `<div class="empty compact"><div class="empty-ic">${icon('sparkles')}</div><p>Add a few months of spending to try what-if scenarios.</p></div>`;
    return `<div class="sim" id="sim">${cats.map(c => { const v = whatIf[c] ?? 10; return `<div class="sim-row" style="--c:${CATS[c].c}">
      <div class="sim-top">${UI.catChip(c, 'sm')}<span>${CATS[c].n}</span><small class="num">${PW.fmt0(avg[c])}/mo</small><b class="num" data-pct="${c}">−${v}%</b></div>
      <input type="range" min="0" max="50" step="5" value="${v}" data-sim="${c}" aria-label="Reduce ${CATS[c].n} spending"></div>`; }).join('')}
      <div class="sim-out" id="simOut"></div></div>`;
  }
  function updateSim(root, k) {
    const out = $('#simOut', root); if (!out) return;
    const avg = PW.avgByCat(k, 3), exp = PW.avgOf(k, 'expense'), inc = PW.avgOf(k, 'income');
    let save = 0;
    $('#sim', root).querySelectorAll('[data-sim]').forEach(r => { save += avg[r.dataset.sim] * (+r.value) / 100; });
    const now = inc ? (inc - exp) / inc * 100 : 0, next = inc ? (inc - exp + save) / inc * 100 : 0;
    out.innerHTML = `<div><span>Saved each month</span><b class="num pos">${PW.fmt0(save)}</b></div><div><span>Saved per year</span><b class="num pos">${PW.fmt0(save * 12)}</b></div>
      ${inc ? `<div><span>Savings rate</span><b class="num">${Math.round(Math.max(0, now))}% <i>→</i> ${Math.round(Math.max(0, next))}%</b></div>` : ''}`;
  }

  PW.views.insights = {
    title: 'Insights',
    sub: () => `What your numbers are telling you · ${PW.monthLabel(PW.view.month)}`,
    monthly: true,
    render(root, play) {
      const k = PW.view.month, ins = PW.insights(k), dow = weekdays(k), top = topSpend(k), topMax = top[0] ? top[0].total : 1;
      let n = 0; const i = () => n++;
      root.innerHTML = `
        <section class="insights-strip"><header class="strip-head"><h2>Highlights</h2><span class="sub">${ins.length} ${ins.length === 1 ? 'insight' : 'insights'}</span></header>
          ${ins.length ? `<div class="insight-grid">${ins.map(x => PW.insightCard(x, i())).join('')}</div>`
            : `<div class="card"><div class="empty compact"><div class="empty-ic">${icon('sparkles')}</div><p>Nothing to flag. Add transactions and budgets and insights will appear here.</p></div></div>`}</section>

        <section class="grid">
          <article class="card span-7" style="--i:${i()}"><header class="card-head"><div><h2>Spending pace</h2><p class="sub">Cumulative spending against your budget</p></div></header>${paceChart(k)}</article>
          <article class="card span-5" style="--i:${i()}"><header class="card-head"><div><h2>What if you cut back?</h2><p class="sub">Drag to see the effect of spending less</p></div></header>${simulator(k)}</article>
        </section>

        <section class="grid">
          <article class="card span-7" style="--i:${i()}"><header class="card-head"><div><h2>Where spending is heading</h2><p class="sub">Expenses by category, last 6 months</p></div></header>${stacked(k)}</article>
          <article class="card span-5" style="--i:${i()}"><header class="card-head"><div><h2>Weekly rhythm</h2><p class="sub">Average spend by weekday, last 3 months</p></div></header>${dow.html}<p class="note">${dow.note}</p></article>
        </section>

        <section class="grid">
          <article class="card span-12" style="--i:${i()}"><header class="card-head"><div><h2>Top spending</h2><p class="sub">Biggest totals by description, last 3 months</p></div></header>
            ${top.length ? `<ul class="top-list">${top.map((t, x) => `<li style="--c:${CATS[t.cat].c}">${UI.catChip(t.cat)}<div class="top-main"><div class="b-top"><span>${esc(t.desc)}</span><span class="num"><b>${PW.fmt0(t.total)}</b><small> · ${t.n}×</small></span></div>
              <div class="bar"><span class="fillx" style="--p:${t.total / topMax};--d:${x * 60}"></span></div></div></li>`).join('')}</ul>`
              : `<div class="empty compact"><div class="empty-ic">${icon('list')}</div><p>No expenses yet.</p></div>`}</article>
        </section>`;
      updateSim(root, k);
      root.oninput = e => {
        const r = e.target.closest('[data-sim]'); if (!r) return;
        whatIf[r.dataset.sim] = +r.value;
        $(`[data-pct="${r.dataset.sim}"]`, root).textContent = `−${r.value}%`;
        updateSim(root, k);
      };
      root.onclick = e => { const b = e.target.closest('[data-insight]'); if (b) PW.runInsight(JSON.parse(b.dataset.insight)); };
    },
  };
})();
