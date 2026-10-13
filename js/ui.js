/* Pennywise UI kit: icons, small chart components, dialogs, toasts, tooltip, command palette. */
(() => {
  'use strict';
  const PW = window.PW;
  const { esc } = PW;
  const UI = (PW.ui = {});
  const $ = (s, r = document) => r.querySelector(s);

  /* ---------- Icons (24px grid, stroke based) ---------- */
  const ICONS = {
    dashboard: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3.5" cy="6" r=".8"/><circle cx="3.5" cy="12" r=".8"/><circle cx="3.5" cy="18" r=".8"/>',
    pie: '<path d="M21.2 15.9A10 10 0 1 1 8 2.8"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    sparkles: '<path d="M11 3l1.9 5.1L18 10l-5.1 1.9L11 17l-1.9-5.1L4 10l5.1-1.9z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
    settings: '<path d="M3 6h11M20 6h1M3 12h5M14 12h7M3 18h13M20 18h1"/><circle cx="17" cy="6" r="2.5"/><circle cx="11" cy="12" r="2.5"/><circle cx="18" cy="18" r="2.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    chevL: '<path d="M15 6l-6 6 6 6"/>',
    chevR: '<path d="M9 6l6 6-6 6"/>',
    panel: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M9 4v16"/>',
    download: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>',
    upload: '<path d="M12 16V5M7 9l5-5 5 5M5 20h14"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
    alert: '<path d="M12 3.5l9.5 16.5h-19z"/><path d="M12 10v4.5M12 17.5v.01"/>',
    repeat: '<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    arrowUp: '<path d="M12 19V5M6 11l6-6 6 6"/>',
    arrowDown: '<path d="M12 5v14M6 13l6 6 6-6"/>',
    arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    trendUp: '<path d="M3 17l6-6 4 4 8-9"/><path d="M15 6h6v6"/>',
    trendDown: '<path d="M3 7l6 6 4-4 8 9"/><path d="M15 18h6v-6"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
    wallet: '<path d="M4 7a2 2 0 0 1 2-2h12v4"/><rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M16 14h2"/>',
    percent: '<path d="M19 5L5 19"/><circle cx="7" cy="7" r="2.2"/><circle cx="17" cy="17" r="2.2"/>',
    home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
    utensils: '<path d="M7 3v8M4 3v5a3 3 0 0 0 6 0V3M7 11v10"/><path d="M17 21V3c-2.5 1.5-3.5 4-3.5 8H17"/>',
    bus: '<rect x="4" y="3" width="16" height="15" rx="3"/><path d="M4 12h16M7 18v2M17 18v2"/><circle cx="8" cy="15" r=".7"/><circle cx="16" cy="15" r=".7"/>',
    bag: '<path d="M5 8h14l-1 12H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
    zap: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
    heart: '<path d="M12 20s-7-4.5-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 4.5-9 9-9 9z"/>',
    gamepad: '<rect x="2" y="7" width="20" height="11" rx="4"/><path d="M7 10v5M4.5 12.5h5M15 11.5h.01M18 13.5h.01"/>',
    box: '<path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/>',
    briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M3 13h18"/>',
    laptop: '<rect x="5" y="5" width="14" height="10" rx="1.5"/><path d="M2 19h20"/>',
    gift: '<rect x="3" y="9" width="18" height="4" rx="1"/><path d="M5 13v8h14v-8M12 9v12M12 9c-2-4-6-3-5 0M12 9c2-4 6-3 5 0"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.01"/>',
    flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  };
  UI.icon = (name, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
  const icon = UI.icon;
  UI.hydrateIcons = (root = document) => root.querySelectorAll('[data-icon]').forEach(n => { n.innerHTML = icon(n.dataset.icon); });
  UI.catChip = (cat, cls = '') => { const c = PW.CATS[cat] || PW.CATS.other; return `<span class="cat-ic ${cls}" style="--c:${c.c}">${icon(c.ic)}</span>`; };

  /* ---------- Small components ---------- */
  UI.pill = (text, tone = '') => text ? `<span class="pill ${tone}">${text}</span>` : '';

  UI.sparkline = (values, tone = 'accent') => {
    const n = values.length, min = Math.min(...values), max = Math.max(...values), span = max - min || 1;
    const pts = values.map((v, i) => [n === 1 ? 50 : (i / (n - 1)) * 100, max === min ? 15 : 27 - ((v - min) / span) * 24]);
    const line = pts.map(p => p.map(x => x.toFixed(1)).join(',')).join(' ');
    return `<svg class="spark ${tone}" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true">
      <polygon points="0,30 ${line} 100,30" class="spark-area"/><polyline points="${line}" class="spark-line" pathLength="1"/></svg>`;
  };

  UI.ring = (pct, { size = 120, stroke = 10, tone = 'accent', inner = '' } = {}) => {
    const r = (size - stroke) / 2, C = 2 * Math.PI * r, len = C * PW.clamp(pct, 0, 1);
    return `<div class="ring" style="width:${size}px;height:${size}px">
      <svg viewBox="0 0 ${size} ${size}" aria-hidden="true"><circle class="ring-track" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}"/>
      <circle class="ring-arc ${tone}" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}" style="--len:${len.toFixed(2)};--C:${C.toFixed(2)}" transform="rotate(-90 ${size / 2} ${size / 2})"/></svg>
      <div class="ring-in">${inner}</div></div>`;
  };

  UI.donut = segments => {
    const R = 78, C = 2 * Math.PI * R, total = PW.sum(segments, s => s.value);
    let off = 0;
    const arcs = segments.map(s => {
      const frac = total ? s.value / total : 0, len = frac * C, gap = frac > 0 && frac < 1 ? 2.5 : 0;
      const el = `<circle class="dseg" data-cat="${s.key}" data-tip="${esc(`${s.label}|${PW.fmt0(s.value)} · ${Math.round(frac * 100)}%`)}" cx="100" cy="100" r="${R}" style="stroke:${s.color};--len:${Math.max(len - gap, 0).toFixed(2)};--C:${C.toFixed(2)};stroke-dashoffset:${(-off).toFixed(2)}"/>`;
      off += len;
      return el;
    }).join('');
    return `<svg viewBox="0 0 200 200" role="img" aria-label="Spending by category"><circle class="donut-track" cx="100" cy="100" r="${R}"/><g transform="rotate(-90 100 100)">${arcs}</g></svg>`;
  };

  /* Animated count-up for [data-count] elements (only when the view plays its entrance). */
  const fmtFor = { c0: v => PW.fmt0(v), c2: v => PW.fmt2(v), pct: v => `${Math.round(v)}%`, int: v => String(Math.round(v)) };
  UI.hydrateCounts = (root, play) => {
    if (!play || PW.reduced) return;
    root.querySelectorAll('[data-count]').forEach(el => {
      const to = parseFloat(el.dataset.count), f = fmtFor[el.dataset.fmt] || fmtFor.c0, t0 = performance.now(), dur = 900;
      if (!isFinite(to)) return;
      const step = now => {
        const p = Math.min(1, (now - t0) / dur);
        el.textContent = f(to * (1 - Math.pow(1 - p, 4)));
        if (p < 1) requestAnimationFrame(step); else el.textContent = f(to);
      };
      requestAnimationFrame(step);
    });
  };
  UI.count = (value, fmt = 'c0') => `<span class="num" data-count="${value}" data-fmt="${fmt}">${fmtFor[fmt](value)}</span>`;

  /* ---------- Toasts ---------- */
  UI.toast = (msg, { action, onAction, tone = '' } = {}) => {
    const host = $('#toasts');
    const t = document.createElement('div');
    t.className = `toast ${tone}`;
    t.innerHTML = `<span>${esc(msg)}</span>`;
    const close = () => { t.classList.add('out'); setTimeout(() => t.remove(), 250); };
    if (action) {
      const b = document.createElement('button');
      b.textContent = action;
      b.addEventListener('click', () => { onAction && onAction(); close(); });
      t.appendChild(b);
    }
    host.appendChild(t);
    setTimeout(close, 5500);
  };

  /* ---------- Tooltip (any element with data-tip="Title|line|line") ---------- */
  const tip = document.createElement('div');
  tip.className = 'tip'; tip.setAttribute('role', 'tooltip');
  document.body.appendChild(tip);
  let tipEl = null;
  document.addEventListener('mouseover', e => {
    const el = e.target.closest && e.target.closest('[data-tip]');
    if (!el) { tipEl = null; tip.classList.remove('show'); return; }
    tipEl = el;
    const [head, ...rest] = el.dataset.tip.split('|');
    tip.innerHTML = `<b>${esc(head)}</b>${rest.map(r => `<span>${esc(r)}</span>`).join('')}`;
    tip.classList.add('show');
  });
  document.addEventListener('mousemove', e => {
    if (!tipEl) return;
    const w = tip.offsetWidth, h = tip.offsetHeight;
    tip.style.left = `${Math.min(window.innerWidth - w - 8, Math.max(8, e.clientX - w / 2))}px`;
    tip.style.top = `${e.clientY - h - 14 < 8 ? e.clientY + 18 : e.clientY - h - 14}px`;
  });
  document.addEventListener('scroll', () => tip.classList.remove('show'), true);

  /* ---------- Modal ---------- */
  const dlg = () => $('#modal');
  UI.closeModal = () => {
    const d = dlg();
    if (!d.open) return;
    if (PW.reduced) { d.close(); return; }
    d.classList.add('closing');
    setTimeout(() => { d.classList.remove('closing'); d.close(); }, 160);
  };
  /* onSubmit(formData, form) returns an error string to keep the dialog open. */
  UI.modal = ({ title, body, submit = 'Save', onSubmit, onOpen, danger = false, size = '' }) => {
    const d = dlg();
    d.className = size;
    d.innerHTML = `<form class="mform" novalidate>
      <header class="m-head"><h2>${esc(title)}</h2><button type="button" class="icon-btn" data-close aria-label="Close">${icon('x')}</button></header>
      <div class="m-body">${body}</div>
      <p class="error" role="alert" hidden></p>
      <footer class="m-foot"><button type="button" class="btn" data-close>Cancel</button>
        <button class="btn ${danger ? 'danger' : 'primary'}" type="submit">${esc(submit)}</button></footer></form>`;
    const form = $('form', d), err = $('.error', d);
    form.addEventListener('submit', e => {
      e.preventDefault();
      const msg = onSubmit ? onSubmit(new FormData(form), form) : null;
      if (msg) { err.textContent = msg; err.hidden = false; err.style.animation = 'none'; void err.offsetWidth; err.style.animation = ''; return; }
      UI.closeModal();
    });
    d.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', UI.closeModal));
    if (!d.open) d.showModal();
    if (onOpen) onOpen(form);
    const first = $('input:not([type=radio]):not([type=hidden]), select', form);
    if (first) setTimeout(() => first.focus(), 40);
    return form;
  };
  UI.confirm = ({ title, message, label = 'Confirm', danger = false, onConfirm }) =>
    UI.modal({ title, body: `<p class="m-text">${esc(message)}</p>`, submit: label, danger, onSubmit: () => { onConfirm(); return null; } });

  /* ---------- Command palette ---------- */
  UI.openPalette = commands => {
    const d = $('#palette');
    d.innerHTML = `<div class="pal"><div class="pal-in">${icon('search')}<input id="palIn" type="text" placeholder="Search actions and pages…" autocomplete="off" aria-label="Command"><kbd>Esc</kbd></div><ul class="pal-list" id="palList" role="listbox"></ul></div>`;
    const input = $('#palIn', d), list = $('#palList', d);
    let sel = 0, shown = commands;
    const draw = () => {
      list.innerHTML = shown.length ? shown.map((c, i) => `<li role="option" class="${i === sel ? 'sel' : ''}" data-i="${i}">${icon(c.icon)}<span>${esc(c.label)}</span><small>${esc(c.group)}</small></li>`).join('')
        : '<li class="none">No matches</li>';
      const s = $('.sel', list); if (s) s.scrollIntoView({ block: 'nearest' });
    };
    const run = i => { const c = shown[i]; if (!c) return; d.close(); c.run(); };
    input.addEventListener('input', () => { const q = input.value.trim().toLowerCase(); shown = commands.filter(c => (c.label + ' ' + c.group).toLowerCase().includes(q)); sel = 0; draw(); });
    input.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(shown.length - 1, sel + 1); draw(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(0, sel - 1); draw(); }
      else if (e.key === 'Enter') { e.preventDefault(); run(sel); }
    });
    list.addEventListener('click', e => { const li = e.target.closest('li[data-i]'); if (li) run(+li.dataset.i); });
    d.addEventListener('click', e => { if (e.target === d) d.close(); }, { once: true });
    draw();
    d.showModal();
    input.focus();
  };

  /* Backdrop click closes the modal */
  document.addEventListener('click', e => { const d = dlg(); if (e.target === d) UI.closeModal(); });
  document.addEventListener('cancel', e => { if (e.target === dlg()) { e.preventDefault(); UI.closeModal(); } }, true);
})();
