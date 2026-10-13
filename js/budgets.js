/* Budgets view: category limits, projections, recurring bills. */
(() => {
  'use strict';
  const PW = window.PW, UI = PW.ui, { esc, CATS, state } = PW;
  const icon = UI.icon;

  function recurringDialog(prefill = {}) {
    const opts = `<optgroup label="Expenses">${PW.EXPENSE_CATS.map(k => `<option value="${k}" ${prefill.cat === k ? 'selected' : ''}>${CATS[k].n}</option>`).join('')}</optgroup>
      <optgroup label="Income">${PW.INCOME_CATS.map(k => `<option value="${k}" ${prefill.cat === k ? 'selected' : ''}>${CATS[k].n}</option>`).join('')}</optgroup>`;
    UI.modal({
      title: 'New recurring item', submit: 'Add recurring item',
      body: `<label class="field"><span>Description</span><input name="desc" type="text" maxlength="60" placeholder="e.g. Rent, Netflix, Salary" value="${esc(prefill.desc || '')}" autocomplete="off"></label>
        <div class="row2"><label class="field"><span>Amount</span><div class="amount-wrap sm"><i>${esc(PW.currencySymbol())}</i><input name="amount" type="number" step="0.01" min="0.01" inputmode="decimal" placeholder="0.00" value="${prefill.amt || ''}"></div></label>
        <label class="field"><span>Day of month</span><input name="day" type="number" min="1" max="28" value="${prefill.day || 1}"></label></div>
        <label class="field"><span>Category</span><select name="cat">${opts}</select></label>
        <p class="m-text small">It posts automatically each month on that day. Days are capped at 28 so every month has one.</p>`,
      onSubmit: fd => {
        const amt = Math.round(parseFloat(fd.get('amount')) * 100) / 100, day = parseInt(fd.get('day'), 10), desc = String(fd.get('desc') || '').trim();
        if (!desc) return 'Give it a name.';
        if (!(amt > 0)) return 'Enter an amount greater than zero.';
        if (!(day >= 1 && day <= 28)) return 'Day must be between 1 and 28.';
        const cat = fd.get('cat');
        PW.addRecurring({ type: CATS[cat].t, cat, amt, desc, day });
        PW.commit();
        UI.toast(`${desc} will repeat monthly`);
        return null;
      },
    });
  }

  PW.views.budgets = {
    title: 'Budgets',
    sub: () => `Limits, pace and recurring bills · ${PW.monthLabel(PW.view.month)}`,
    monthly: true,
    render(root, play) {
      const k = PW.view.month, t = PW.totalsFor(k), f = PW.forecast(k), cur = k === PW.THIS;
      const avg = PW.avgByCat(k, 3), months = PW.monthsBack(k, 6);
      const totalLimit = PW.totalBudget();
      const left = totalLimit - t.expense, ratio = totalLimit ? t.expense / totalLimit : 0;
      const scale = Math.max(totalLimit, f.projected, t.expense, 1) * 1.06;
      const fixedOut = PW.sum(state.recurring.filter(r => r.type === 'expense'), r => r.amt);
      const fixedIn = PW.sum(state.recurring.filter(r => r.type === 'income'), r => r.amt);
      const suggestions = PW.detectRecurring();
      let n = 0;
      const i = () => n++;

      const cards = PW.EXPENSE_CATS.map(c => {
        const spent = t.byCat[c] || 0, limit = state.budgets[c] || 0, r = limit > 0 ? spent / limit : (spent > 0 ? 2 : 0);
        const proj = PW.catProjection(k, c);
        const tone = r >= 1 ? 'over' : r >= 0.85 ? 'warn' : '';
        const status = !limit ? (spent ? 'No limit' : 'Not set') : r >= 1 ? `${PW.fmt0(spent - limit)} over` : `${PW.fmt0(limit - spent)} left`;
        return `<article class="card b-card ${tone}" style="--c:${CATS[c].c};--i:${i()}">
          <div class="b-card-top">${UI.catChip(c)}<div><h3>${CATS[c].n}</h3><span class="sub num">${limit ? `${Math.round(r * 100)}% used` : 'No limit set'}</span></div>
            ${UI.pill(status, tone === 'over' ? 'neg' : tone === 'warn' ? 'warn' : limit ? 'pos' : '')}</div>
          <div class="b-amount"><b class="figure sm num">${PW.fmt0(spent)}</b><span class="of">of
            <input class="limit" type="number" min="0" step="10" inputmode="numeric" value="${limit}" data-cat="${c}" aria-label="${CATS[c].n} monthly limit"></span></div>
          <div class="bar"><span class="fillx" style="--p:${Math.min(1, r)};--d:${n * 40}"></span></div>
          <div class="b-meta"><div><span>3-mo average</span><b class="num">${PW.fmt0(avg[c])}</b></div>
            <div><span>${cur ? 'Projected' : 'Spent'}</span><b class="num ${limit && proj > limit ? 'neg' : ''}">${PW.fmt0(proj)}</b></div>
            <div class="b-spark">${UI.sparkline(months.map(m => PW.totalsFor(m).byCat[c] || 0), tone === 'over' ? 'neg' : 'accent')}</div></div>
        </article>`;
      }).join('');

      root.innerHTML = `
        <section class="card summary-card" style="--i:${i()}">
          <header class="card-head"><div><h2>Overall budget</h2><p class="sub">${PW.fmt0(t.expense)} of ${PW.fmt0(totalLimit)} used across all categories</p></div>
            <div class="head-actions"><button class="btn" data-act="avg">${icon('sparkles')}Set from 3-month average</button><button class="btn" data-act="defaults">Reset limits</button></div></header>
          <div class="pace" aria-hidden="true"><span class="pace-actual fillx ${ratio >= 1 ? 'neg' : ''}" style="--p:${t.expense / scale}"></span>
            ${cur ? `<span class="pace-proj ${f.projected > totalLimit ? 'neg' : ''}" style="left:${t.expense / scale * 100}%;width:${Math.max(0, f.projected - t.expense) / scale * 100}%"></span>` : ''}
            ${totalLimit ? `<span class="pace-budget" style="left:${totalLimit / scale * 100}%"><i>Limit</i></span>` : ''}</div>
          <dl class="stat-row"><div><dt>Total budget</dt><dd>${UI.count(totalLimit)}</dd></div><div><dt>Spent</dt><dd>${UI.count(t.expense)}</dd></div>
            <div><dt>${left >= 0 ? 'Remaining' : 'Over by'}</dt><dd class="${left >= 0 ? 'pos' : 'neg'}">${UI.count(Math.abs(left))}</dd></div>
            <div><dt>${cur ? 'Projected' : 'Saved'}</dt><dd>${UI.count(cur ? f.projected : Math.max(0, t.income - t.expense))}</dd></div></dl>
        </section>
        <section class="b-grid">${cards}</section>

        <section class="grid">
          <article class="card span-7" style="--i:${i()}">
            <header class="card-head"><div><h2>Recurring bills &amp; subscriptions</h2><p class="sub">Posted automatically, included in forecasts</p></div>
              <button class="btn primary" data-act="add-rec">${icon('plus')}Add</button></header>
            ${state.recurring.length ? `<ul class="rec-list">${state.recurring.slice().sort((a, b) => a.day - b.day).map(r => `<li>
              ${UI.catChip(r.cat)}<div class="rec-main"><b>${esc(r.desc)}</b><small>${CATS[r.cat].n} · day ${r.day} of each month</small></div>
              <span class="amt num ${r.type}">${r.type === 'income' ? '+' : '−'}${PW.fmt2(r.amt)}</span>
              <button class="icon-btn sm" data-del-rec="${esc(r.id)}" aria-label="Stop ${esc(r.desc)}" title="Stop repeating">${icon('trash')}</button></li>`).join('')}</ul>
              <div class="rec-total"><span>Fixed monthly costs</span><b class="num">${PW.fmt2(fixedOut)}</b><span class="sub">${PW.fmt0(fixedOut * 12)} a year${fixedIn ? ` · ${PW.fmt0(fixedIn)} recurring income` : ''}</span></div>`
              : `<div class="empty compact"><div class="empty-ic">${icon('repeat')}</div><p>No recurring items yet. Add rent, subscriptions or salary and Pennywise will post them for you.</p></div>`}
          </article>
          <article class="card span-5" style="--i:${i()}">
            <header class="card-head"><div><h2>Detected subscriptions</h2><p class="sub">Charges that repeat monthly</p></div></header>
            ${suggestions.length ? `<ul class="rec-list">${suggestions.map((s, x) => `<li>${UI.catChip(s.cat)}<div class="rec-main"><b>${esc(s.desc)}</b><small>${s.months} months in a row · ~${PW.fmt2(s.amt)}</small></div>
              <button class="btn sm" data-track="${x}">Track</button></li>`).join('')}</ul>`
              : `<div class="empty compact"><div class="empty-ic">${icon('search')}</div><p>No untracked repeating charges found. We look for the same charge three months running.</p></div>`}
          </article>
        </section>`;

      root.onclick = e => {
        const b = e.target.closest('[data-act]');
        if (b) {
          const act = b.dataset.act;
          if (act === 'add-rec') recurringDialog();
          else if (act === 'avg') {
            const a = PW.avgByCat(k, 3);
            if (!PW.sum(Object.values(a))) return UI.toast('Not enough history yet', { tone: 'warn' });
            UI.confirm({ title: 'Set limits from your average?', message: 'Each category limit becomes its 3-month average, rounded up to the nearest 10.', label: 'Apply', onConfirm: () => { PW.EXPENSE_CATS.forEach(c => { if (a[c] > 0) state.budgets[c] = Math.ceil(a[c] / 10) * 10; }); PW.commit(); UI.toast('Budgets updated'); } });
          } else if (act === 'defaults') UI.confirm({ title: 'Reset budget limits?', message: 'All category limits go back to the defaults.', label: 'Reset', onConfirm: () => { state.budgets = { ...PW.DEFAULT_BUDGETS }; PW.commit(); } });
          return;
        }
        const del = e.target.closest('[data-del-rec]');
        if (del) {
          const idx = state.recurring.findIndex(r => r.id === del.dataset.delRec);
          const [r] = state.recurring.splice(idx, 1);
          PW.commit();
          UI.toast(`${r.desc} will no longer repeat`, { action: 'Undo', onAction: () => { state.recurring.push(r); PW.commit(); } });
          return;
        }
        const tr = e.target.closest('[data-track]');
        if (tr) { const s = suggestions[+tr.dataset.track]; PW.addRecurring({ ...s, type: 'expense' }); PW.commit(); UI.toast(`Now tracking ${s.desc}`); }
      };
      root.onchange = e => {
        if (!e.target.classList.contains('limit')) return;
        state.budgets[e.target.dataset.cat] = Math.max(0, parseFloat(e.target.value) || 0);
        PW.commit();
      };
      root.onkeydown = e => { if (e.key === 'Enter' && e.target.classList.contains('limit')) e.target.blur(); };
      UI.hydrateCounts(root, play);
    },
  };
})();
