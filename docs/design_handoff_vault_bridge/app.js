/* ============================================================
   Vault Bridge — app.js  (vanilla, zéro dépendance)
   ============================================================ */
'use strict';

/* ---------------- Icônes SVG (style feather) ---------------- */
const ICON_PATHS = {
  key2:['M14.5 7.5a4.5 4.5 0 1 1-3.2 7.7L4 22.5','M10 18l2 2','M13 15l2 2','M21 2l-6.3 6.3'],
  note:['M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z','M14 3v5h5','M9 13h6','M9 17h4'],
  card:['M2 5h20v14H2z','M2 10h20','M6 15h4'],
  identity:['M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2','M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'],
  clip:['M21 11.5l-8.5 8.5a5 5 0 0 1-7-7l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7l-8.6 8.5a1.6 1.6 0 0 1-2.3-2.3l7.8-7.8'],
  search:['M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z','M21 21l-4.3-4.3'],
  refresh:['M21 3v6h-6','M3 21v-6h6','M20.5 9a8 8 0 0 0-14-3.5L3 9','M3.5 15a8 8 0 0 0 14 3.5L21 15'],
  arrow:['M5 12h14','M13 6l6 6-6 6'],
  swap:['M7 4l-4 4 4 4','M3 8h13','M17 20l4-4-4-4','M21 16H8'],
  copy:['M9 9.5h10.5v10.5H9z','M5 14.5H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1'],
  move:['M5 12h14','M13 6l6 6-6 6'],
  check:['M20 6.5L9.5 17 4.5 12'],
  x:['M18 6L6 18','M6 6l12 12'],
  chev:['M9 6l6 6-6 6'],
  sun:['M12 4V2','M12 22v-2','M5 5L3.5 3.5','M20.5 20.5L19 19','M4 12H2','M22 12h-2','M5 19l-1.5 1.5','M20.5 3.5L19 5','M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z'],
  moon:['M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z'],
  alert:['M10.3 4L2 18.5A2 2 0 0 0 3.7 21.5h16.6A2 2 0 0 0 22 18.5L13.7 4a2 2 0 0 0-3.4 0z','M12 9v4','M12 17h.01'],
  checkc:['M22 11.1V12a10 10 0 1 1-5.9-9.1','M22 4L12 14.1l-3-3'],
  shield:['M12 22s8-3.8 8-10V5l-8-3-8 3v7c0 6.2 8 10 8 10z','M9 12l2 2 4-4'],
  grip:['M5 9h14','M5 15h14'],
  box:['M21 8l-9-5-9 5 9 5 9-5z','M3 8v8l9 5 9-5V8','M12 13v8'],
};
function icon(name, size = 18, sw = 2) {
  const paths = (ICON_PATHS[name] || []).map(d => `<path d="${d}"/>`).join('');
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
}
const TYPE_ICON = { login:'key2', note:'note', card:'card', identity:'identity' };

/* ---------------- Données d'exemple (à remplacer par l'API) ---------------- */
function seedData() {
  const E = (id, type, name, username, url, created, attach) =>
    ({ id, type, name, username, url, created, attach: !!attach });
  return [
    { id:'v1', name:'Coffre Personnel', folders:[
      { id:'f1', name:'Connexions', entries:[
        E('e1','login','GitHub','octave@me.com','github.com','12 mars 2024'),
        E('e2','login','Gmail','octave.l@gmail.com','accounts.google.com','3 janv. 2023', true),
        E('e3','login','Netflix','famille-octave','netflix.com','22 sept. 2023'),
        E('e4','login','Spotify','octave','open.spotify.com','5 févr. 2024'),
      ]},
      { id:'f2', name:'Cartes & paiements', entries:[
        E('e5','card','Visa personnelle','•••• 4421','','18 nov. 2022', true),
        E('e6','card','Revolut','•••• 9075','revolut.com','2 mai 2024'),
      ]},
      { id:'f3', name:'Notes sécurisées', entries:[
        E('e7','note','Codes Wi-Fi maison','','','9 janv. 2024'),
        E('e8','note','Récupération 2FA','','','14 avr. 2024', true),
      ]},
      { id:'f4', name:'Identités', entries:[
        E('e9','identity','Passeport — Octave L.','Octave L.','','1 févr. 2021'),
      ]},
    ]},
    { id:'v2', name:'Coffre Équipe', folders:[
      { id:'f5', name:'Infrastructure', entries:[
        E('e10','login','AWS Console','ops@iad.io','console.aws.amazon.com','7 janv. 2024', true),
        E('e11','login','Cloudflare','dns@iad.io','dash.cloudflare.com','19 mars 2024'),
        E('e12','login','Sentry','alerts@iad.io','sentry.io','28 févr. 2024'),
        E('e13','login','Datadog','monitor@iad.io','app.datadoghq.com','11 mai 2024'),
      ]},
      { id:'f6', name:'Finances', entries:[
        E('e14','card','Carte société','•••• 7781','','4 janv. 2023', true),
        E('e15','login','Stripe','billing@iad.io','dashboard.stripe.com','30 nov. 2023'),
        E('e16','note','Note TVA & comptable','','','2 févr. 2024'),
      ]},
      { id:'f7', name:'Partagé', entries:[
        E('e17','login','Figma Team','design@iad.io','figma.com','16 janv. 2024'),
        E('e18','identity','Identité société','IAD SA','','8 janv. 2022'),
      ]},
    ]},
  ];
}

/* ============================================================
   API REST locale — points de câblage
   Remplace seedData() / l'écho local par de vrais appels.
   ============================================================ */
const API = {
  async loadVaults() {
    // return fetch('/api/vaults').then(r => r.json());
    return seedData();
  },
  async transfer(/* { ids, fromVault, toVault, toFolder, mode } */) {
    // return fetch('/api/transfer', { method:'POST',
    //   headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) }).then(r => r.json());
    return { ok: true };
  },
};

/* ---------------- État ---------------- */
const state = {
  vaults: [],
  query: { v1:'', v2:'' },
  closed: {},                // folderId -> bool (replié)
  sel: { v1:[], v2:[] },     // une seule liste non vide à la fois
  drag: null,                // { vaultId, ids[], copy, x, y }
  dropTarget: null,          // folderId survolé
  pop: null,                 // données popover
  lastSync: Date.now(),
  syncing: false,
};

/* ---------------- Helpers ---------------- */
const $ = sel => document.querySelector(sel);
const otherVault = id => (id === 'v1' ? 'v2' : 'v1');
const findVault = id => state.vaults.find(v => v.id === id);
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function host(url) { return url ? url.replace(/^https?:\/\//,'').replace(/^www\./,'').split('/')[0] : ''; }
function matchEntry(e, q) {
  if (!q) return true; q = q.toLowerCase();
  return (e.name||'').toLowerCase().includes(q)
      || (e.username||'').toLowerCase().includes(q)
      || (e.url||'').toLowerCase().includes(q);
}
function collectSel(vaultId) {
  const ids = state.sel[vaultId] || [];
  const out = [];
  findVault(vaultId).folders.forEach(f => f.entries.forEach(e => { if (ids.includes(e.id)) out.push(e); }));
  return out;
}

/* ============================================================
   Rendu
   ============================================================ */
function render() {
  renderHeader();
  renderWorkspace();
  renderOverlays();
}

function renderHeader() {
  $('.brand-mark').innerHTML = icon('shield', 19, 2);
  $('#refreshBtn').innerHTML = icon('refresh', 14, 2.2);
  $('#refreshBtn').classList.toggle('spinning', state.syncing);
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  $('#themeToggle').innerHTML = icon(isDark ? 'sun' : 'moon', 18, 2);
  $('.gutter-swap').innerHTML = icon('swap', 18, 2);
  $('#syncLabel').textContent = syncLabel();
}

function syncLabel() {
  if (state.syncing) return 'Synchronisation…';
  const m = Math.round((Date.now() - state.lastSync) / 60000);
  if (m < 1) return "Sync à l'instant";
  if (m === 1) return 'Sync il y a 1 min';
  if (m < 60) return 'Sync il y a ' + m + ' min';
  return 'Sync il y a ' + Math.round(m / 60) + ' h';
}

function renderWorkspace() {
  const ws = $('#workspace');
  ws.querySelectorAll('.vault').forEach(n => n.remove());
  state.vaults.forEach((v, i) => ws.insertBefore(vaultEl(v, i === 0), $('.gutter-swap')));
}

function vaultEl(v, isLeft) {
  const q = state.query[v.id] || '';
  const sel = state.sel[v.id] || [];
  const totalEntries = v.folders.reduce((a, f) => a + f.entries.length, 0);

  const section = document.createElement('section');
  section.className = 'vault' + (isLeft ? ' vault--left' : '');

  // en-tête + recherche
  section.innerHTML = `
    <div class="vault-head">
      <div class="vault-head-icon">${icon('box', 16, 2)}</div>
      <div class="vault-head-text">
        <div class="vault-name">${esc(v.name)}</div>
        <div class="vault-meta">${v.folders.length} dossiers · ${totalEntries} entrées</div>
      </div>
    </div>
    <div class="search-wrap">
      <div class="search">
        <span class="search-icon">${icon('search', 15, 2)}</span>
        <input type="text" placeholder="Rechercher nom, identifiant, URL…" value="${esc(q)}">
        ${q ? `<button class="search-clear" title="Effacer">${icon('x', 12, 2.4)}</button>` : ''}
      </div>
    </div>
    <div class="folders"></div>
  `;

  // recherche
  const input = section.querySelector('.search input');
  input.addEventListener('input', e => { state.query[v.id] = e.target.value; renderWorkspace(); refocusSearch(v.id, e.target.selectionStart); });
  const clear = section.querySelector('.search-clear');
  if (clear) clear.addEventListener('click', () => { state.query[v.id] = ''; renderWorkspace(); });

  // dossiers
  const list = section.querySelector('.folders');
  let visibleCount = 0;
  v.folders.forEach(f => {
    const matched = f.entries.filter(e => matchEntry(e, q));
    visibleCount += matched.length;
    if (q && matched.length === 0) return;             // dossier masqué si recherche sans résultat
    list.appendChild(folderEl(v, f, matched, q, sel));
  });

  if (q && visibleCount === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.innerHTML = `
      <div class="empty-icon">${icon('search', 34, 1.5)}</div>
      <div class="empty-title">Aucun résultat</div>
      <div class="empty-sub">Essaie un autre terme de recherche</div>`;
    list.appendChild(empty);
  }

  // toolbar de sélection
  if (sel.length) section.appendChild(toolbarEl(v, sel));

  return section;
}

function folderEl(v, f, matched, q, sel) {
  const open = q ? matched.length > 0 : !state.closed[f.id];
  const wrap = document.createElement('div');
  wrap.className = 'folder' + (open ? ' open' : '');
  if (state.dropTarget === f.id && state.drag && state.drag.vaultId !== v.id)
    wrap.classList.add(state.drag.copy ? 'drop-copy' : 'drop-move');
  wrap.dataset.folderId = f.id;
  wrap.dataset.vaultId = v.id;

  const head = document.createElement('div');
  head.className = 'folder-head';
  head.innerHTML = `
    <span class="folder-chevron">${icon('chev', 14, 2.4)}</span>
    <span class="folder-name">${esc(f.name)}</span>
    <span class="folder-droplabel">${state.drag && state.drag.copy ? 'Copier ici' : 'Déplacer ici'}</span>
    <span class="folder-count">${matched.length}</span>`;
  head.addEventListener('click', () => { state.closed[f.id] = !state.closed[f.id]; renderWorkspace(); });
  wrap.appendChild(head);

  const body = document.createElement('div');
  body.className = 'folder-body';
  matched.forEach(e => body.appendChild(entryEl(v, f, e, sel.includes(e.id))));
  wrap.appendChild(body);

  // drop zone
  wrap.addEventListener('dragover', onFolderDragOver);
  wrap.addEventListener('dragleave', onFolderDragLeave);
  wrap.addEventListener('drop', onFolderDrop);

  return wrap;
}

function entryEl(v, f, e, selected) {
  const row = document.createElement('div');
  row.className = 'entry' + (selected ? ' selected' : '');
  row.draggable = true;
  row.dataset.entryId = e.id;
  row.dataset.vaultId = v.id;
  row.dataset.folderId = f.id;

  const metaParts = [];
  if (e.username) metaParts.push(esc(e.username));
  const h = host(e.url); if (h) metaParts.push(esc(h));
  const meta = metaParts.join('  ·  ') || '—';

  row.innerHTML = `
    <div class="entry-check">${icon('check', 12, 3)}</div>
    <div class="entry-chip" data-type="${e.type}">${icon(TYPE_ICON[e.type] || 'key2', 17, 2)}</div>
    <div class="entry-body">
      <div class="entry-line1">
        <span class="entry-name">${esc(e.name)}</span>
        ${e.attach ? `<span class="entry-attach" title="Pièce jointe">${icon('clip', 11, 2.4)}</span>` : ''}
      </div>
      <div class="entry-meta">${meta}</div>
    </div>
    <span class="entry-date">${esc(e.created)}</span>`;

  row.querySelector('.entry-check').addEventListener('click', ev => { ev.stopPropagation(); toggleSel(v.id, e.id); });
  row.addEventListener('click', ev => onEntryClick(ev, v.id, e.id));
  row.addEventListener('dragstart', ev => onEntryDragStart(ev, v.id, e.id));
  row.addEventListener('drag', onEntryDrag);
  row.addEventListener('dragend', onEntryDragEnd);
  return row;
}

function toolbarEl(v, sel) {
  const bar = document.createElement('div');
  bar.className = 'toolbar';
  const label = sel.length > 1 ? `${sel.length} entrées sélectionnées` : '1 entrée sélectionnée';
  const transferLabel = v.id === 'v1' ? 'Transférer vers Équipe' : 'Transférer vers Personnel';
  bar.innerHTML = `
    <span class="toolbar-count">${sel.length}</span>
    <span class="toolbar-label">${label}</span>
    <button class="toolbar-clear">Désélectionner</button>
    <button class="toolbar-transfer">${esc(transferLabel)} ${icon('arrow', 15, 2.4)}</button>`;
  bar.querySelector('.toolbar-clear').addEventListener('click', () => { state.sel[v.id] = []; renderWorkspace(); });
  bar.querySelector('.toolbar-transfer').addEventListener('click', ev => openTransferPopover(ev.currentTarget, v.id));
  return bar;
}

function refocusSearch(vaultId, caret) {
  const sections = document.querySelectorAll('.vault');
  const idx = state.vaults.findIndex(v => v.id === vaultId);
  const input = sections[idx] && sections[idx].querySelector('.search input');
  if (input) { input.focus(); try { input.setSelectionRange(caret, caret); } catch (_) {} }
}

/* ============================================================
   Sélection
   ============================================================ */
function onEntryClick(e, vaultId, entryId) {
  const add = e.ctrlKey || e.metaKey || e.shiftKey;
  let arr = [...(state.sel[vaultId] || [])];
  if (add) arr = arr.includes(entryId) ? arr.filter(x => x !== entryId) : [...arr, entryId];
  else     arr = (arr.length === 1 && arr[0] === entryId) ? [] : [entryId];
  state.sel[vaultId] = arr;
  state.sel[otherVault(vaultId)] = [];
  renderWorkspace();
}
function toggleSel(vaultId, entryId) {
  let arr = [...(state.sel[vaultId] || [])];
  arr = arr.includes(entryId) ? arr.filter(x => x !== entryId) : [...arr, entryId];
  state.sel[vaultId] = arr;
  state.sel[otherVault(vaultId)] = [];
  renderWorkspace();
}

/* ============================================================
   Drag & drop
   ============================================================ */
const GHOST = new Image();
GHOST.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

function onEntryDragStart(e, vaultId, entryId) {
  let ids = state.sel[vaultId] || [];
  if (!ids.includes(entryId)) ids = [entryId];
  state.sel[vaultId] = ids;
  state.sel[otherVault(vaultId)] = [];
  const copy = e.ctrlKey || e.metaKey;
  try {
    e.dataTransfer.effectAllowed = 'copyMove';
    e.dataTransfer.setData('text/plain', entryId);
    e.dataTransfer.setDragImage(GHOST, 0, 0);
  } catch (_) {}
  state.drag = { vaultId, ids, copy, x: e.clientX, y: e.clientY };
  e.currentTarget.classList.add('dragging');
  renderWorkspace();
  updateDragPill();
}
function onEntryDrag(e) {
  if (!state.drag) return;
  if (e.clientX === 0 && e.clientY === 0) return;       // ignore l'event final à (0,0)
  state.drag.x = e.clientX; state.drag.y = e.clientY;
  state.drag.copy = e.ctrlKey || e.metaKey;
  updateDragPill();
}
function onEntryDragEnd() {
  state.drag = null; state.dropTarget = null;
  document.querySelectorAll('.entry.dragging').forEach(n => n.classList.remove('dragging'));
  hideDragPill();
  renderWorkspace();
}
function onFolderDragOver(e) {
  const d = state.drag; if (!d) return;
  const { folderId, vaultId } = e.currentTarget.dataset;
  if (vaultId === d.vaultId) { try { e.dataTransfer.dropEffect = 'none'; } catch (_) {} return; }
  e.preventDefault();
  const copy = e.ctrlKey || e.metaKey;
  try { e.dataTransfer.dropEffect = copy ? 'copy' : 'move'; } catch (_) {}
  if (state.dropTarget !== folderId || d.copy !== copy) {
    state.dropTarget = folderId; d.copy = copy;
    renderWorkspace(); updateDragPill();
  }
}
function onFolderDragLeave(e) {
  const { folderId } = e.currentTarget.dataset;
  if (e.relatedTarget && e.currentTarget.contains(e.relatedTarget)) return;
  if (state.dropTarget === folderId) { state.dropTarget = null; renderWorkspace(); }
}
function onFolderDrop(e) {
  const d = state.drag; if (!d) return;
  const { folderId, vaultId } = e.currentTarget.dataset;
  if (vaultId === d.vaultId) { onEntryDragEnd(); return; }
  e.preventDefault();
  const copy = e.ctrlKey || e.metaKey;
  const destVault = findVault(vaultId);
  const destFolder = destVault.folders.find(f => f.id === folderId);
  const items = collectSel(d.vaultId).filter(x => d.ids.includes(x.id));
  const srcVault = d.vaultId, ids = d.ids.slice();

  document.querySelectorAll('.entry.dragging').forEach(n => n.classList.remove('dragging'));
  hideDragPill();
  state.drag = null; state.dropTarget = null;

  if (copy) { execTransfer(srcVault, vaultId, folderId, ids, true); return; }

  // popover de confirmation, ancrée au point de dépôt
  state.pop = {
    x: Math.min(e.clientX, window.innerWidth - 310),
    y: Math.min(e.clientY, window.innerHeight - 230),
    srcVault, destVault: vaultId, destFolder: folderId,
    destName: destVault.name + ' › ' + destFolder.name,
    ids, count: ids.length, attach: items.some(x => x.attach),
  };
  render();
}

/* ---------------- Drag pill ---------------- */
function updateDragPill() {
  const d = state.drag; const pill = $('#dragPill');
  if (!d) { pill.hidden = true; return; }
  pill.hidden = false;
  pill.className = 'drag-pill ' + (d.copy ? 'copy' : 'move');
  pill.style.left = (d.x + 14) + 'px';
  pill.style.top = (d.y + 12) + 'px';
  const n = d.ids.length;
  pill.innerHTML = `
    ${icon('grip', 13, 2.4)}
    <span class="drag-pill-count">${n} entrée${n > 1 ? 's' : ''}</span>
    <span class="drag-pill-badge">${d.copy ? 'COPY' : 'MOVE'}</span>`;
}
function hideDragPill() { $('#dragPill').hidden = true; }

/* ============================================================
   Transfert
   ============================================================ */
function openTransferPopover(anchorEl, vaultId) {
  const ids = state.sel[vaultId] || [];
  if (!ids.length) return;
  const destVaultId = otherVault(vaultId);
  const destVault = findVault(destVaultId);
  const destFolder = destVault.folders[0];
  const items = collectSel(vaultId).filter(x => ids.includes(x.id));
  const r = anchorEl.getBoundingClientRect();
  state.pop = {
    x: Math.min(r.left, window.innerWidth - 310),
    y: Math.max(12, r.top - 210),
    srcVault: vaultId, destVault: destVaultId, destFolder: destFolder.id,
    destName: destVault.name + ' › ' + destFolder.name,
    ids: ids.slice(), count: ids.length, attach: items.some(x => x.attach),
  };
  render();
}

function renderOverlays() {
  const pop = $('#popover');
  const p = state.pop;
  if (!p) { pop.hidden = true; return; }
  pop.hidden = false;
  pop.style.left = p.x + 'px';
  pop.style.top = p.y + 'px';
  pop.innerHTML = `
    <div class="pop-head">
      <div class="pop-icon">${icon('swap', 17, 2)}</div>
      <div class="pop-titles">
        <div class="pop-title">${p.count} entrée${p.count > 1 ? 's' : ''} à transférer</div>
        <div class="pop-dest">Destination — ${esc(p.destName)}</div>
      </div>
      <button class="pop-close">${icon('x', 12, 2.4)}</button>
    </div>
    ${p.attach ? `<div class="pop-warn">${icon('alert', 15, 2.2)}<span>Contient des pièces jointes — elles seront transférées aussi.</span></div>` : ''}
    <div class="pop-actions">
      <button class="pop-btn pop-btn-copy">${icon('copy', 15, 2)} Copier</button>
      <button class="pop-btn pop-btn-move">${icon('move', 15, 2.4)} Déplacer</button>
    </div>
    <div class="pop-tip">Astuce — maintiens <b>Ctrl</b> pendant le glisser pour copier directement</div>`;

  pop.querySelector('.pop-close').addEventListener('click', closePopover);
  pop.querySelector('.pop-btn-copy').addEventListener('click', () => { execTransfer(p.srcVault, p.destVault, p.destFolder, p.ids, true); closePopover(); });
  pop.querySelector('.pop-btn-move').addEventListener('click', () => { execTransfer(p.srcVault, p.destVault, p.destFolder, p.ids, false); closePopover(); });
}
function closePopover() { state.pop = null; render(); }

function execTransfer(srcId, destId, destFolderId, ids, copy) {
  const src = findVault(srcId), dest = findVault(destId);

  // entrées concernées
  const moved = [];
  src.folders.forEach(f => f.entries.forEach(e => { if (ids.includes(e.id)) moved.push(e); }));

  // mutation incrémentale du cache client
  if (!copy) src.folders.forEach(f => { f.entries = f.entries.filter(e => !ids.includes(e.id)); });
  const df = dest.folders.find(f => f.id === destFolderId) || dest.folders[0];
  moved.forEach(e => df.entries.unshift(copy ? { ...e, id: e.id + '-c' + Math.random().toString(36).slice(2, 6) } : { ...e }));

  // appel API (fire-and-forget ; en prod : gérer l'échec / rollback)
  API.transfer({ ids, fromVault: srcId, toVault: destId, toFolder: destFolderId, mode: copy ? 'copy' : 'move' });

  state.sel[srcId] = [];
  state.lastSync = Date.now();
  const n = moved.length;
  const verb = copy ? ('copiée' + (n > 1 ? 's' : '')) : ('déplacée' + (n > 1 ? 's' : ''));
  showToast(`${n} entrée${n > 1 ? 's' : ''} ${verb} vers ${dest.name}`);
  render();
}

/* ============================================================
   Sync / refresh
   ============================================================ */
let refreshTimer = null;
async function refresh() {
  if (state.syncing) return;
  state.syncing = true; renderHeader();
  const data = await API.loadVaults();
  await new Promise(r => setTimeout(r, 600)); // feedback visuel
  state.vaults = data;
  state.syncing = false;
  state.lastSync = Date.now();
  render();
  showToast('Coffres synchronisés');
}

/* ============================================================
   Toast
   ============================================================ */
let toastTimer = null;
function showToast(msg) {
  $('#toastMsg').textContent = msg;
  $('#toast').hidden = false;
  $('.toast-icon').innerHTML = icon('checkc', 16, 2.2);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 2600);
}

/* ============================================================
   Thème
   ============================================================ */
function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme');
  document.documentElement.setAttribute('data-theme', cur === 'light' ? 'dark' : 'light');
  renderHeader();
}

/* ============================================================
   Boot
   ============================================================ */
async function init() {
  $('#themeToggle').addEventListener('click', toggleTheme);
  $('#refreshBtn').addEventListener('click', refresh);

  // clic extérieur ferme la popover
  document.addEventListener('mousedown', e => {
    if (state.pop && !e.target.closest('#popover')) closePopover();
  }, true);

  // recalcul périodique du label de sync
  setInterval(() => { if (!state.syncing) $('#syncLabel').textContent = syncLabel(); }, 20000);

  state.vaults = await API.loadVaults();
  state.lastSync = Date.now();
  render();
}

document.addEventListener('DOMContentLoaded', init);
