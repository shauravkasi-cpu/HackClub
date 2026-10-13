/* Transactions view + shared add/edit dialog and row renderer. */
(() => {
  'use strict';
  const PW = window.PW, UI = PW.ui, { esc, CATS, state } = PW;
  const icon = UI.icon;
  const $ = (s, r = document) => r.querySelector(s);

  /* ---------- Shared row ---------- */
  PW.txRow = (t, { actions = true } = {}) => {
    const c = CATS[t.cat] || CATS.other;
    return `<li class="tx" data-id="${esc(t.id)}">
      ${UI.catChip(t.cat)}
      <div class="tx-main"><strong>${esc(t.desc || c.n)}</strong>
        <small>${c.n} · ${PW.fmtDate(t.date)}${t.rid ? `<span class="badge">${icon('repeat')}Recurring</span>` : ''}</small></div>
      <span class="amt num ${t.type}">${t.type === 'income' ? '+' : '−'}${PW.fmt2(t.amt)}</span>
      ${actions ? `<div class="tx-act">
        <button type="button" data-edit="${esc(t.id)}" aria-label="Edit ${esc(t.desc || c.n)}" title="Edit">${icon('edit')}</button>
        <button type="button" data-del="${esc(t.id)}" aria-label="Delete ${esc(t.desc || c.n)}" title="Delete">${icon('trash')}</button></div>` : ''}
    </li>`;
  };

  /* ---------- Add / edit dialog ---------- */
  function chipsFor(type, selected) {
    const keys = type === 'income' ? PW.INCOME_CATS : PW.EXPENSE_CATS;
    const pick = keys.includes(selected) ? selected : keys[0];
    return keys.map((k, n) => `<span class="chip" style="--c:${CATS[k].c};--n:${n}">
      <input type="radio" name="cat" id="c-${k}" value="${k}" ${k === pick ? 'checked' : ''}>
      <label for="c-${k}">${icon(CATS[k].ic)}${CATS[k].n}</label></span>`).join('');
  }

  PW.openTxDialog = (existing = null) => {
    const isEdit = !!existing;
    const t = existing || { type: 'expense', amt: '', desc: '', date: PW.isoDate(new Date()), cat: 'food' };
    UI.modal({
      title: isEdit ? 'Edit transaction' : 'New transaction', submit: isEdit ? 'Save changes' : 'Add transaction',
      body: `
        <div class="seg" role="radiogroup" aria-label="Transaction type">
          <input type="radio" name="type" id="tExp" value="expense" ${t.type !== 'income' ? 'checked' : ''}><label for="tExp">Expense</label>
          <input type="radio" name="type" id="tInc" value="income" ${t.type === 'income' ? 'checked' : ''}><label for="tInc">Income</label>
          <span class="seg-thumb" aria-hidden="true"></span>
        </div>
        <label class="field"><span>Amount</span>
          <div class="amount-wrap"><i>${esc(PW.currencySymbol())}</i><input name="amount" type="number" inputmode="decimal" step="0.01" min="0.01" placeholder="0.00" value="${t.amt}"></div></label>
        <label class="field"><span>Description</span>
          <input name="desc" type="text" maxlength="60" placeholder="e.g. Weekly groceries" autocomplete="off" value="${esc(t.desc)}"></label>
        <fieldset class="field"><legend>Category</legend><div class="chips" id="chips">${chipsFor(t.type, t.cat)}</div></fieldset>
        <label class="field"><span>Date</span><input name="date" type="date" value="${t.date}"></label>
        ${isEdit ? '' : `<label class="check"><input type="checkbox" name="repeat"><span>Repeat every month <small>Adds it to forecasts and upcoming bills</small></span></label>`}`,
      onOpen: form => form.addEventListener('change', e => { if (e.target.name === 'type') $('#chips', form).innerHTML = chipsFor(e.target.value); }),
      onSubmit: fd => {
        const amt = Math.round(parseFloat(fd.get('amount')) * 100) / 100;
        const date = fd.get('date'), type = fd.get('type'), cat = fd.get('cat');
        if (!(amt > 0)) return 'Enter an amount greater than zero.';
        if (!date) return 'Pick a date.';
        if (!cat) return 'Choose a category.';
        const desc = String(fd.get('desc') || '').trim().slice(0, 60) || CATS[cat].n;
        const month = date.slice(0, 7);
        if (isEdit) {
          Object.assign(existing, { type, cat, amt, date, desc });
          PW.commit();
          UI.toast('Transaction updated');
          return null;
        }
        const before = type === 'expense' ? (PW.totalsFor(month).byCat[cat] || 0) : 0;
        const tx = { id: PW.uid(), type, cat, amt, date, desc };
        state.tx.push(tx);
        if (fd.get('repeat')) { const r = PW.addRecurring({ type, cat, amt, desc, day: +date.slice(8), since: month }, { post: false }); tx.rid = r.id; }
        PW.view.month = month;
        PW.view.justAdded = tx.id;
        PW.commit();
        UI.toast(`${type === 'income' ? 'Income' : 'Expense'} of ${PW.fmt2(amt)} added`);
        const limit = state.budgets[cat] || 0;
        if (type === 'expense' && limit > 0) {
          const after = PW.totalsFor(month).byCat[cat] || 0;
          if (before / limit < 1 && after / limit >= 1) setTimeout(() => UI.toast(`${CATS[cat].n} is now over budget`, { tone: 'warn' }), 600);
          else if (before / limit < 0.8 && after / limit >= 0.8) setTimeout(() => UI.toast(`${CATS[cat].n} is at ${Math.round(after / limit * 100)}% of its budget`, { tone: 'warn' }), 600);
        }
        return null;
      },
    });
  };

  PW.deleteTx = (id, li) => {
    const done = () => {
      const t = PW.removeTx(id);
      if (!t) return;
      PW.commit();
      UI.toast('Transaction deleted', { action: 'Undo', onAction: () => { PW.restoreTx(t); PW.commit(); } });
    };
    if (li && !PW.reduced) { li.classList.add('leaving'); setTimeout(done, 240); } else done();
  };

  /* ---------- Transactions view ---------- */
  const f = { q: '', type: 'all', cat: 'all', sort: 'date-desc', scope: 'month', limit: 40 };

  const dayLabel = ds => {
    const today = PW.isoDate(new Date()), y = new Date(); y.setDate(y.getDate() - 1);
    if (ds === today) return 'Today';
    if (ds === PW.isoDate(y)) return 'Yesterday';
    return PW.fmtDate(ds, { weekday: 'short', month: 'short', day: 'numeric' });
  };

  function filtered() {
    const q = f.q.trim().toLowerCase();
    let rows = f.scope === 'all' ? state.tx.slice() : PW.inMonth(PW.view.month);
    rows = rows.filter(t => (f.type === 'all' || t.type === f.type) && (f.cat === 'all' || t.cat === f.cat) &&
      (!q || t.desc.toLowerCase().includes(q) || CATS[t.cat].n.toLowerCase().includes(q) || String(t.amt).includes(q)));
    const by = {
      'date-desc': (a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id),
      'date-asc': (a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id),
      'amt-desc': (a, b) => b.amt - a.amt,
      'amt-asc': (a, b) => a.amt - b.amt,
    }[f.sort];
    return rows.sort(by);
  }

  function updateList(root) {
    const rows = filtered(), shown = rows.slice(0, f.limit);
    const inc = PW.sum(rows.filter(t => t.type === 'income'), t => t.amt), exp = PW.sum(rows.filter(t => t.type === 'expense'), t => t.amt);
    $('#txSummary', root).innerHTML = `
      <div><span>Transactions</span><b class="num">${rows.length}</b></div>
      <div><span>Money in</span><b class="num pos">${PW.fmt2(inc)}</b></div>
      <div><span>Money out</span><b class="num">${PW.fmt2(exp)}</b></div>
      <div><span>Net</span><b class="num ${inc - exp >= 0 ? 'pos' : 'neg'}">${inc - exp >= 0 ? '+' : '−'}${PW.fmt2(Math.abs(inc - exp))}</b></div>`;
    const list = $('#txList', root), empty = $('#txEmpty', root);
    let html = '', lastDay = '';
    const grouped = f.sort.startsWith('date');
    shown.forEach(t => {
      if (grouped && t.date !== lastDay) { lastDay = t.date; html += `<li class="day-head">${dayLabel(t.date)}</li>`; }
      html += PW.txRow(t);
    });
    list.innerHTML = html;
    if (PW.view.justAdded) { const n = list.querySelector(`[data-id="${PW.view.justAdded}"]`); if (n) n.classList.add('enter'); PW.view.justAdded = null; }
    empty.hidden = rows.length > 0;
    if (!rows.length) {
      const any = (f.scope === 'all' ? state.tx.length : PW.inMonth(PW.view.month).length) > 0;
      empty.innerHTML = `<div class="empty-ic">${icon(any ? 'search' : 'wallet')}</div>
        <h3>${any ? 'No matching transactions' : 'No transactions yet'}</h3>
        <p>${any ? 'Try a different search or clear a filter.' : `Nothing recorded for ${PW.monthLabel(PW.view.month)}.`}</p>
        ${any ? '<button class="btn" data-act="reset">Clear filters</button>' : '<button class="btn primary" data-act="add">Add transaction</button>'}`;
    }
    const more = $('#txMore', root);
    more.hidden = rows.length <= shown.length;
    more.textContent = `Show ${Math.min(40, rows.length - shown.length)} more (${rows.length - shown.length} remaining)`;
  }

  PW.views.transactions = {
    title: 'Transactions',
    sub: () => f.scope === 'all' ? 'Everything you have recorded' : `Activity for ${PW.monthLabel(PW.view.month)}`,
    monthly: true,
    render(root, play) {
      if (play || !$('.toolbar', root)) {
        const catOpts = `<option value="all">All categories</option>
          <optgroup label="Expenses">${PW.EXPENSE_CATS.map(k => `<option value="${k}">${CATS[k].n}</option>`).join('')}</optgroup>
          <optgroup label="Income">${PW.INCOME_CATS.map(k => `<option value="${k}">${CATS[k].n}</option>`).join('')}</optgroup>`;
        root.innerHTML = `
          <section class="card" style="--i:0">
            <div id="txSummary" class="mini-stats"></div>
            <div class="toolbar">
              <label class="search">${icon('search')}<span class="sr-only">Search transactions</span>
                <input type="search" id="txSearch" placeholder="Search description, category or amount" autocomplete="off" value="${esc(f.q)}"></label>
              <div class="tabs" role="tablist" aria-label="Filter by type" id="txTabs">
                ${['all', 'income', 'expense'].map(t => `<button role="tab" data-type="${t}" class="${f.type === t ? 'active' : ''}" aria-selected="${f.type === t}">${t === 'all' ? 'All' : t === 'income' ? 'Income' : 'Expenses'}</button>`).join('')}
              </div>
              <select id="txCat" aria-label="Category">${catOpts}</select>
              <select id="txSort" aria-label="Sort">
                <option value="date-desc">Newest first</option><option value="date-asc">Oldest first</option>
                <option value="amt-desc">Largest first</option><option value="amt-asc">Smallest first</option></select>
              <select id="txScope" aria-label="Date range"><option value="month">This month</option><option value="all">All time</option></select>
            </div>
            <ul class="tx-list" id="txList"></ul>
            <div class="empty" id="txEmpty" hidden></div>
            <button class="btn wide-more" id="txMore" hidden></button>
          </section>`;
        $('#txCat', root).value = f.cat; $('#txSort', root).value = f.sort; $('#txScope', root).value = f.scope;
        root.onclick = e => {
          const tab = e.target.closest('#txTabs button');
          if (tab) { f.type = tab.dataset.type; f.limit = 40; root.querySelectorAll('#txTabs button').forEach(b => { const on = b === tab; b.classList.toggle('active', on); b.setAttribute('aria-selected', on); }); return updateList(root); }
          const del = e.target.closest('[data-del]');
          if (del) return PW.deleteTx(del.dataset.del, del.closest('.tx'));
          const ed = e.target.closest('[data-edit]');
          if (ed) return PW.openTxDialog(state.tx.find(t => t.id === ed.dataset.edit));
          const act = e.target.closest('[data-act]');
          if (act && act.dataset.act === 'add') return PW.openTxDialog();
          if (act && act.dataset.act === 'reset') { Object.assign(f, { q: '', type: 'all', cat: 'all' }); return PW.views.transactions.render(root, true); }
          if (e.target.closest('#txMore')) { f.limit += 40; updateList(root); }
        };
        root.oninput = e => { if (e.target.id === 'txSearch') { f.q = e.target.value; f.limit = 40; updateList(root); } };
        root.onchange = e => {
          if (e.target.id === 'txCat') f.cat = e.target.value;
          else if (e.target.id === 'txSort') f.sort = e.target.value;
          else if (e.target.id === 'txScope') { f.scope = e.target.value; PW.refreshHead(); }
          else return;
          f.limit = 40; updateList(root);
        };
      }
      updateList(root);
    },
  };
})();
