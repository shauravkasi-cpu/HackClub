/* Goals view: savings goals with pace tracking. */
(() => {
  'use strict';
  const PW = window.PW, UI = PW.ui, { esc, state } = PW;
  const icon = UI.icon;

  const goalFields = (g = {}) => `
    <label class="field"><span>Goal name</span><input name="name" type="text" maxlength="40" placeholder="e.g. Emergency fund" value="${esc(g.name || '')}" autocomplete="off"></label>
    <div class="row2"><label class="field"><span>Target amount</span><div class="amount-wrap sm"><i>${esc(PW.currencySymbol())}</i><input name="target" type="number" min="1" step="1" inputmode="decimal" placeholder="5000" value="${g.target || ''}"></div></label>
    <label class="field"><span>Target date <small>(optional)</small></span><input name="deadline" type="date" value="${g.deadline || ''}"></label></div>`;

  function readGoal(fd) {
    const name = String(fd.get('name') || '').trim(), target = parseFloat(fd.get('target')), deadline = fd.get('deadline') || null;
    if (!name) return { error: 'Give your goal a name.' };
    if (!(target > 0)) return { error: 'Enter a target amount greater than zero.' };
    if (deadline && deadline <= PW.isoDate(new Date())) return { error: 'Pick a target date in the future, or leave it blank.' };
    return { name, target: Math.round(target * 100) / 100, deadline };
  }

  function newGoal() {
    UI.modal({
      title: 'New goal', submit: 'Create goal',
      body: `${goalFields()}<label class="field"><span>Already saved <small>(optional)</small></span><div class="amount-wrap sm"><i>${esc(PW.currencySymbol())}</i><input name="start" type="number" min="0" step="1" inputmode="decimal" placeholder="0"></div></label>`,
      onSubmit: fd => {
        const g = readGoal(fd); if (g.error) return g.error;
        const start = parseFloat(fd.get('start')) || 0, today = PW.isoDate(new Date());
        state.goals.push({ id: PW.uid(), ...g, created: today, contribs: start > 0 ? [{ date: today, amt: start }] : [] });
        PW.commit(); UI.toast(`Goal "${g.name}" created`);
        return null;
      },
    });
  }

  function addFunds(g) {
    const gi = PW.goalInfo(g);
    UI.modal({
      title: `Add to ${g.name}`, submit: 'Add funds',
      body: `<p class="m-text">${PW.fmt0(gi.saved)} saved of ${PW.fmt0(g.target)}. ${PW.fmt0(gi.remaining)} to go.</p>
        <label class="field"><span>Amount</span><div class="amount-wrap"><i>${esc(PW.currencySymbol())}</i><input name="amount" type="number" min="0.01" step="0.01" inputmode="decimal" placeholder="0.00"></div></label>
        <label class="field"><span>Date</span><input name="date" type="date" value="${PW.isoDate(new Date())}"></label>
        <p class="m-text small">Goal savings are tracked separately from your transactions, so they don't change your balance.</p>`,
      onSubmit: fd => {
        const amt = Math.round(parseFloat(fd.get('amount')) * 100) / 100, date = fd.get('date');
        if (!(amt > 0)) return 'Enter an amount greater than zero.';
        if (!date) return 'Pick a date.';
        g.contribs.push({ date, amt });
        PW.commit();
        UI.toast(PW.goalInfo(g).status === 'done' ? `"${g.name}" is fully funded!` : `Added ${PW.fmt2(amt)} to ${g.name}`);
        return null;
      },
    });
  }

  function editGoal(g) {
    UI.modal({
      title: 'Edit goal', submit: 'Save changes', body: goalFields(g),
      onSubmit: fd => { const r = readGoal(fd); if (r.error) return r.error; Object.assign(g, r); PW.commit(); UI.toast('Goal updated'); return null; },
    });
  }

  const STATUS = {
    done: ['Complete', 'pos'], ontrack: ['On track', 'pos'], behind: ['Behind schedule', 'warn'], idle: ['No pace yet', ''],
  };

  PW.openGoalDialog = newGoal;

  PW.views.goals = {
    title: 'Goals',
    sub: () => 'Save for what matters, and see if you are on pace',
    monthly: false,
    render(root, play) {
      const goals = state.goals;
      const totalSaved = PW.sum(goals, PW.goalSaved), totalTarget = PW.sum(goals, g => g.target);
      let n = 0;
      root.innerHTML = `
        <section class="goals-head" style="--i:${n++}">
          <div class="mini-stats solo"><div><span>Active goals</span><b class="num">${goals.filter(g => PW.goalInfo(g).status !== 'done').length}</b></div>
            <div><span>Total saved</span><b class="num">${PW.fmt0(totalSaved)}</b></div>
            <div><span>Combined target</span><b class="num">${PW.fmt0(totalTarget)}</b></div></div>
          <button class="btn primary" data-act="new">${icon('plus')}New goal</button>
        </section>
        ${goals.length ? `<section class="goal-grid">${goals.map(g => {
          const gi = PW.goalInfo(g), [label, tone] = STATUS[gi.status];
          const ringTone = gi.status === 'behind' ? 'warn' : 'pos';
          const lines = [];
          if (gi.status === 'done') lines.push('Fully funded. Well done.');
          else {
            if (g.deadline) lines.push(`<span>Needs</span> <b class="num">${PW.fmt0(gi.needed)}</b> <span>a month for ${gi.monthsLeft} month${gi.monthsLeft === 1 ? '' : 's'}</span>`);
            if (gi.eta) lines.push(`<span>At your pace, done by</span> <b>${gi.eta.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</b>`);
            else lines.push('<span>Add funds to see a projected finish date</span>');
          }
          const recent = g.contribs.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
          return `<article class="card goal" style="--i:${n++}">
            <div class="goal-top">${UI.ring(gi.pct, { size: 92, stroke: 8, tone: ringTone, inner: `<b class="figure sm">${UI.count(gi.pct * 100, 'pct')}</b>` })}
              <div class="goal-title"><h3>${esc(g.name)}</h3>${UI.pill(label, tone)}
                <p class="num"><b>${PW.fmt0(gi.saved)}</b> of ${PW.fmt0(g.target)}</p>
                <small>${g.deadline ? `Target ${PW.fmtDate(g.deadline, { month: 'short', day: 'numeric', year: 'numeric' })}` : 'No deadline'}</small></div></div>
            <ul class="goal-lines">${lines.map(l => `<li>${l}</li>`).join('')}</ul>
            ${recent.length ? `<div class="goal-hist"><span class="label">Recent contributions</span>${recent.map(c => `<div><span>${PW.fmtDate(c.date)}</span><b class="num">+${PW.fmt0(c.amt)}</b></div>`).join('')}</div>` : ''}
            <div class="goal-act"><button class="btn primary" data-fund="${esc(g.id)}" ${gi.status === 'done' ? 'disabled' : ''}>${icon('plus')}Add funds</button>
              <button class="icon-btn" data-edit-goal="${esc(g.id)}" aria-label="Edit ${esc(g.name)}" title="Edit">${icon('edit')}</button>
              <button class="icon-btn" data-del-goal="${esc(g.id)}" aria-label="Delete ${esc(g.name)}" title="Delete">${icon('trash')}</button></div>
          </article>`;
        }).join('')}</section>`
          : `<section class="card" style="--i:${n++}"><div class="empty"><div class="empty-ic">${icon('target')}</div><h3>No goals yet</h3>
              <p>Pick something to save for, like an emergency fund, a trip or a new laptop. Pennywise will tell you whether you're on pace.</p>
              <button class="btn primary" data-act="new">Create your first goal</button></div></section>`}`;

      root.onclick = e => {
        const find = id => goals.find(g => g.id === id);
        if (e.target.closest('[data-act="new"]')) return newGoal();
        const fund = e.target.closest('[data-fund]'); if (fund) return addFunds(find(fund.dataset.fund));
        const ed = e.target.closest('[data-edit-goal]'); if (ed) return editGoal(find(ed.dataset.editGoal));
        const del = e.target.closest('[data-del-goal]');
        if (del) {
          const g = find(del.dataset.delGoal);
          UI.confirm({ title: `Delete "${g.name}"?`, message: 'The goal and its contribution history will be removed.', label: 'Delete goal', danger: true,
            onConfirm: () => { const idx = state.goals.indexOf(g); state.goals.splice(idx, 1); PW.commit(); UI.toast('Goal deleted', { action: 'Undo', onAction: () => { state.goals.splice(idx, 0, g); PW.commit(); } }); } });
        }
      };
      UI.hydrateCounts(root, play);
    },
  };
})();
