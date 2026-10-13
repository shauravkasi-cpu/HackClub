/* Settings view + data import/export helpers. */
(() => {
  'use strict';
  const PW = window.PW, UI = PW.ui, { esc, CATS, state } = PW;
  const icon = UI.icon;

  const download = (name, text, type) => {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = Object.assign(document.createElement('a'), { href: url, download: name });
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  PW.exportCSV = () => {
    const q = v => `"${String(v).replace(/"/g, '""')}"`;
    const rows = ['Date,Type,Category,Description,Amount,Recurring']
      .concat(state.tx.slice().sort((a, b) => a.date.localeCompare(b.date)).map(t => [t.date, t.type, CATS[t.cat].n, q(t.desc), t.amt.toFixed(2), t.rid ? 'yes' : 'no'].join(',')));
    download(`pennywise-transactions-${PW.isoDate(new Date())}.csv`, rows.join('\n'), 'text/csv');
    UI.toast('Transactions exported as CSV');
  };
  PW.exportJSON = () => {
    download(`pennywise-backup-${PW.isoDate(new Date())}.json`, JSON.stringify(state, null, 2), 'application/json');
    UI.toast('Backup downloaded');
  };

  function importJSON(file) {
    const reader = new FileReader();
    reader.onerror = () => UI.toast('Could not read that file', { tone: 'warn' });
    reader.onload = () => {
      let d;
      try { d = JSON.parse(reader.result); } catch (e) { return UI.toast('That file is not valid JSON', { tone: 'warn' }); }
      if (!d || !Array.isArray(d.tx)) return UI.toast('This does not look like a Pennywise backup', { tone: 'warn' });
      const tx = d.tx.filter(t => t && typeof t.amt === 'number' && t.amt > 0 && /^\d{4}-\d{2}-\d{2}$/.test(t.date) && CATS[t.cat] && (t.type === 'income' || t.type === 'expense'))
        .map(t => ({ ...t, id: String(t.id || PW.uid()), desc: String(t.desc || '').slice(0, 60) }));
      UI.confirm({
        title: 'Restore this backup?', label: 'Replace my data', danger: true,
        message: `This replaces everything with ${tx.length} transactions, ${(d.goals || []).length} goals and ${(d.recurring || []).length} recurring items from the file.`,
        onConfirm: () => {
          state.tx = tx;
          state.goals = Array.isArray(d.goals) ? d.goals.filter(g => g && g.name && g.target > 0 && Array.isArray(g.contribs)) : [];
          state.recurring = Array.isArray(d.recurring) ? d.recurring.filter(r => r && CATS[r.cat] && r.amt > 0 && r.day) : [];
          state.skipped = Array.isArray(d.skipped) ? d.skipped : [];
          state.budgets = { ...PW.DEFAULT_BUDGETS, ...(d.budgets || {}) };
          if (typeof d.currency === 'string' && /^[A-Z]{3}$/.test(d.currency)) state.currency = d.currency;
          state.demo = false; state.welcomed = true; state.upgradePrompt = false;
          PW.setFormatters(); PW.view.month = PW.THIS; PW.commit(); UI.toast('Backup restored');
        },
      });
    };
    reader.readAsText(file);
  }

  PW.clearAll = () => {
    Object.assign(state, { tx: [], goals: [], recurring: [], skipped: [], demo: false, welcomed: true, upgradePrompt: false });
    PW.commit(); UI.toast('All data cleared');
  };
  PW.loadDemo = () => {
    Object.assign(state, PW.seed(), { demo: true, welcomed: false, upgradePrompt: false, skipped: [] });
    PW.view.month = PW.THIS; PW.commit(); UI.toast('Sample data loaded');
  };
  PW.addSample = () => {
    const s = PW.seed();
    s.goals.forEach(g => state.goals.push(g));
    s.recurring.forEach(r => state.recurring.push({ ...r, since: PW.THIS }));
    state.upgradePrompt = false;
    PW.ensureRecurring();
    PW.commit(); UI.toast('Sample goals and bills added');
  };

  PW.views.settings = {
    title: 'Settings',
    sub: () => 'Appearance, currency and your data',
    monthly: false,
    render(root) {
      const cur = ['USD', 'EUR', 'GBP', 'INR', 'JPY', 'CAD', 'AUD', 'CHF', 'MXN', 'BRL'];
      root.innerHTML = `
        <section class="settings">
          <article class="card" style="--i:0"><header class="card-head"><div><h2>Appearance</h2><p class="sub">Choose how Pennywise looks</p></div></header>
            <div class="set-row"><div><b>Theme</b><small>Dark is the default. System follows your device.</small></div>
              <div class="tabs" id="themeTabs" role="radiogroup" aria-label="Theme">${['dark', 'light', 'system'].map(t => `<button role="radio" data-set-theme="${t}" aria-checked="${state.theme === t}" class="${state.theme === t ? 'active' : ''}">${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}</div></div>
            <div class="set-row"><div><b>Currency</b><small>Changes how amounts are displayed. It does not convert them.</small></div>
              <select id="setCurrency" aria-label="Currency">${cur.map(c => `<option ${c === state.currency ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
          </article>

          <article class="card" style="--i:1"><header class="card-head"><div><h2>Your data</h2><p class="sub">${state.tx.length} transactions · ${state.goals.length} goals · ${state.recurring.length} recurring items</p></div></header>
            <div class="set-row"><div><b>Export transactions</b><small>A spreadsheet-friendly CSV of every transaction.</small></div><button class="btn" data-act="csv">${icon('download')}Export CSV</button></div>
            <div class="set-row"><div><b>Back up everything</b><small>Includes goals, budgets and recurring items. Use it to move to another device.</small></div><button class="btn" data-act="json">${icon('download')}Download backup</button></div>
            <div class="set-row"><div><b>Restore from backup</b><small>Load a backup file you downloaded earlier.</small></div>
              <button class="btn" data-act="import">${icon('upload')}Choose file</button><input type="file" id="importFile" accept="application/json,.json" hidden></div>
          </article>

          <article class="card danger-zone" style="--i:2"><header class="card-head"><div><h2>Reset</h2><p class="sub">These actions replace your current data</p></div></header>
            <div class="set-row"><div><b>Load sample data</b><small>Six months of example activity, goals and bills.</small></div><button class="btn" data-act="demo">Load sample data</button></div>
            <div class="set-row"><div><b>Clear everything</b><small>Deletes all transactions, goals and recurring items from this browser.</small></div><button class="btn danger" data-act="clear">${icon('trash')}Clear all data</button></div>
          </article>

          <article class="card privacy" style="--i:3"><span class="banner-ic">${icon('shield')}</span>
            <div><b>Private by design</b><p>Pennywise has no account and no server. Your data is stored only in this browser's local storage and is never uploaded. Clearing your browser data erases it, so download a backup now and then.</p></div></article>
        </section>`;
      root.onclick = e => {
        const th = e.target.closest('[data-set-theme]');
        if (th) { state.theme = th.dataset.setTheme; PW.applyTheme(); PW.save(); root.querySelectorAll('#themeTabs button').forEach(b => { const on = b === th; b.classList.toggle('active', on); b.setAttribute('aria-checked', on); }); return; }
        const a = e.target.closest('[data-act]'); if (!a) return;
        const act = a.dataset.act;
        if (act === 'csv') PW.exportCSV();
        else if (act === 'json') PW.exportJSON();
        else if (act === 'import') document.getElementById('importFile').click();
        else if (act === 'demo') UI.confirm({ title: 'Load sample data?', message: 'This replaces your current transactions, goals and recurring items.', label: 'Load sample data', danger: true, onConfirm: PW.loadDemo });
        else if (act === 'clear') UI.confirm({ title: 'Clear all data?', message: 'This permanently deletes everything stored in this browser. Download a backup first if you might want it back.', label: 'Delete everything', danger: true, onConfirm: PW.clearAll });
      };
      root.onchange = e => {
        if (e.target.id === 'setCurrency') { state.currency = e.target.value; PW.setFormatters(); PW.commit(); }
        else if (e.target.id === 'importFile' && e.target.files[0]) { importJSON(e.target.files[0]); e.target.value = ''; }
      };
    },
  };
})();
