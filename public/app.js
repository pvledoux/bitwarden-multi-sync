'use strict';

/* ============================================================
   Icônes SVG (style feather)
   ============================================================ */
const ICON_PATHS = {
  key2:     ['M14.5 7.5a4.5 4.5 0 1 1-3.2 7.7L4 22.5','M10 18l2 2','M13 15l2 2','M21 2l-6.3 6.3'],
  note:     ['M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z','M14 3v5h5','M9 13h6','M9 17h4'],
  card:     ['M2 5h20v14H2z','M2 10h20','M6 15h4'],
  identity: ['M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2','M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'],
  clip:     ['M21 11.5l-8.5 8.5a5 5 0 0 1-7-7l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7l-8.6 8.5a1.6 1.6 0 0 1-2.3-2.3l7.8-7.8'],
  search:   ['M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z','M21 21l-4.3-4.3'],
  refresh:  ['M21 3v6h-6','M3 21v-6h6','M20.5 9a8 8 0 0 0-14-3.5L3 9','M3.5 15a8 8 0 0 0 14 3.5L21 15'],
  arrow:    ['M5 12h14','M13 6l6 6-6 6'],
  swap:     ['M7 4l-4 4 4 4','M3 8h13','M17 20l4-4-4-4','M21 16H8'],
  copy:     ['M9 9.5h10.5v10.5H9z','M5 14.5H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1'],
  move:     ['M5 12h14','M13 6l6 6-6 6'],
  check:    ['M20 6.5L9.5 17 4.5 12'],
  x:        ['M18 6L6 18','M6 6l12 12'],
  chev:     ['M9 6l6 6-6 6'],
  sun:      ['M12 4V2','M12 22v-2','M5 5L3.5 3.5','M20.5 20.5L19 19','M4 12H2','M22 12h-2','M5 19l-1.5 1.5','M20.5 3.5L19 5','M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z'],
  moon:     ['M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z'],
  alert:    ['M10.3 4L2 18.5A2 2 0 0 0 3.7 21.5h16.6A2 2 0 0 0 22 18.5L13.7 4a2 2 0 0 0-3.4 0z','M12 9v4','M12 17h.01'],
  checkc:   ['M22 11.1V12a10 10 0 1 1-5.9-9.1','M22 4L12 14.1l-3-3'],
  shield:   ['M12 22s8-3.8 8-10V5l-8-3-8 3v7c0 6.2 8 10 8 10z','M9 12l2 2 4-4'],
  grip:     ['M5 9h14','M5 15h14'],
  box:      ['M21 8l-9-5-9 5 9 5 9-5z','M3 8v8l9 5 9-5V8','M12 13v8'],
  unlink:   ['M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71','M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71'],
  trash:    ['M3 6h18','M8 6V4h8v2','M19 6l-1 14H6L5 6'],
};
function icon(name, size = 18, sw = 2) {
  const paths = (ICON_PATHS[name] || []).map(d => `<path d="${d}"/>`).join('');
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
}
const TYPE_ICON = { login:'key2', note:'note', card:'card', identity:'identity' };

/* ============================================================
   État global
   ============================================================ */
const state = {
  vaults: [],        // { id:'0'|'1', name, authenticated, loading, folders:[] }
  query:  { '0':'', '1':'' },
  closed: {},        // folderId → bool (replié manuellement)
  sel:    { '0':[], '1':[] },
  drag:   null,      // { vaultId, ids[], copy, x, y }
  dropTarget: null,  // folderId survolé
  pop:    null,
  lastSync: Date.now(),
  syncing: false,
};

// Persistance des formulaires d'auth entre les re-renders
const authState = {
  '0': { server:'', method:'apikey', clientId:'', clientSecret:'', email:'', masterPassword:'', error:'' },
  '1': { server:'', method:'apikey', clientId:'', clientSecret:'', email:'', masterPassword:'', error:'' },
};

/* ============================================================
   API REST locale
   ============================================================ */
const API = {
  async status() {
    return fetch('/api/status').then(r => r.json());
  },
  async loadVault(vaultId) {
    const r = await fetch(`/api/vault/${vaultId}`);
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Chargement échoué');
    return { ...d, authenticated: true, loading: false };
  },
  async refreshVault(vaultId) {
    const r = await fetch(`/api/refresh/${vaultId}`, { method: 'POST' });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Rafraîchissement échoué');
    return { ...d, authenticated: true, loading: false };
  },
  async auth(vaultId, body) {
    const r = await fetch(`/api/auth/${vaultId}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Authentification échouée');
    return d;
  },
  async disconnect(vaultId) {
    await fetch(`/api/disconnect/${vaultId}`, { method: 'POST' });
  },
  transfer(payload) {
    return fetch('/api/transfer', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then(r => r.json());
  },
  delete(payload) {
    return fetch('/api/delete', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then(r => r.json());
  },
};

/* ============================================================
   Helpers
   ============================================================ */
const $ = sel => document.querySelector(sel);
const otherVault = id => (id === '0' ? '1' : '0');
const findVault  = id => state.vaults.find(v => v.id === id);
function esc(s) {
  return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
}
function host(url) {
  return url ? url.replace(/^https?:\/\//,'').replace(/^www\./,'').split('/')[0] : '';
}
function matchEntry(e, q) {
  if (!q) return true;
  q = q.toLowerCase();
  return (e.name||'').toLowerCase().includes(q)
      || (e.username||'').toLowerCase().includes(q)
      || (e.url||'').toLowerCase().includes(q);
}
function collectSel(vaultId) {
  const ids = state.sel[vaultId] || [];
  const out = [];
  (findVault(vaultId)?.folders || []).forEach(f =>
    f.entries.forEach(e => { if (ids.includes(e.id)) out.push(e); })
  );
  return out;
}

/* ============================================================
   Rendu principal
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

function vaultEl(vault, isLeft) {
  const section = document.createElement('section');
  section.className = 'vault' + (isLeft ? ' vault--left' : '');

  // En-tête toujours visible
  const totalEntries = (vault.folders || []).reduce((a, f) => a + f.entries.length, 0);
  const headDiv = document.createElement('div');
  headDiv.className = 'vault-head';
  headDiv.innerHTML = `
    <div class="vault-head-icon">${icon('box', 16, 2)}</div>
    <div class="vault-head-text">
      <div class="vault-name">${esc(vault.name)}</div>
      <div class="vault-meta${vault.authenticated ? '' : ' vault-meta--muted'}">
        ${vault.authenticated
          ? `${(vault.folders||[]).length} dossiers · ${totalEntries} entrées`
          : 'Non connecté'}
      </div>
    </div>
    ${vault.authenticated
      ? `<button class="vault-disconnect" data-vault="${vault.id}" title="Se déconnecter">${icon('unlink', 15, 2)}</button>`
      : ''}`;
  section.appendChild(headDiv);

  if (vault.authenticated) {
    const btn = headDiv.querySelector('.vault-disconnect');
    if (btn) btn.addEventListener('click', () => disconnectVault(vault.id));
  }

  if (vault.loading) {
    const loader = document.createElement('div');
    loader.className = 'vault-loading';
    const loadLabel = vault.authenticated ? 'Synchronisation…' : 'Connexion en cours…';
    loader.innerHTML = `<div class="vault-loading-spinner"></div><div class="vault-loading-label">${loadLabel}</div>`;
    section.appendChild(loader);
    return section;
  }

  if (!vault.authenticated) {
    section.appendChild(authFormEl(vault));
    return section;
  }

  // Barre de recherche
  const q = state.query[vault.id] || '';
  const searchWrap = document.createElement('div');
  searchWrap.className = 'search-wrap';
  searchWrap.innerHTML = `
    <div class="search">
      <span class="search-icon">${icon('search', 15, 2)}</span>
      <input type="text" placeholder="Rechercher nom, identifiant, URL…" value="${esc(q)}">
      ${q ? `<button class="search-clear" title="Effacer">${icon('x', 12, 2.4)}</button>` : ''}
    </div>`;
  const input = searchWrap.querySelector('input');
  input.addEventListener('input', e => {
    state.query[vault.id] = e.target.value;
    renderWorkspace();
    refocusSearch(vault.id, e.target.selectionStart);
  });
  const clearBtn = searchWrap.querySelector('.search-clear');
  if (clearBtn) clearBtn.addEventListener('click', () => { state.query[vault.id] = ''; renderWorkspace(); });

  if (q) {
    const allVisible = (vault.folders || []).flatMap(f => f.entries.filter(e => matchEntry(e, q))).map(e => e.id);
    const allVisSel  = allVisible.length > 0 && allVisible.every(id => (state.sel[vault.id] || []).includes(id));
    const selAllBtn  = document.createElement('button');
    selAllBtn.className = 'search-selall';
    selAllBtn.textContent = allVisSel ? 'Tout désélectionner' : `Tout sélectionner (${allVisible.length})`;
    selAllBtn.addEventListener('click', () => {
      const cur = state.sel[vault.id] || [];
      state.sel[vault.id] = allVisSel ? cur.filter(id => !allVisible.includes(id)) : [...new Set([...cur, ...allVisible])];
      state.sel[otherVault(vault.id)] = [];
      renderWorkspace();
    });
    searchWrap.appendChild(selAllBtn);
  }

  section.appendChild(searchWrap);

  // Liste des dossiers
  const list = document.createElement('div');
  list.className = 'folders';
  const sel = state.sel[vault.id] || [];
  let visibleCount = 0;

  (vault.folders || []).forEach(f => {
    const matched = f.entries.filter(e => matchEntry(e, q));
    visibleCount += matched.length;
    if (q && matched.length === 0) return;
    list.appendChild(folderEl(vault, f, matched, q, sel));
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
  section.appendChild(list);

  // Toolbar de sélection
  if (sel.length) section.appendChild(toolbarEl(vault, sel));

  return section;
}

/* ============================================================
   Auth form
   ============================================================ */
function authFormEl(vault) {
  const a = authState[vault.id];
  const form = document.createElement('div');
  form.className = 'auth-form';

  form.innerHTML = `
    <div>
      <label class="auth-label">Serveur</label>
      <input class="auth-input" type="url" id="af-server-${vault.id}" placeholder="https://vault.bitwarden.eu" value="${esc(a.server)}">
    </div>
    <div class="auth-method">
      <label class="auth-radio-btn${a.method === 'apikey' ? ' active' : ''}">
        <input type="radio" name="af-method-${vault.id}" value="apikey"${a.method === 'apikey' ? ' checked' : ''}> Clé API
      </label>
      <label class="auth-radio-btn${a.method === 'password' ? ' active' : ''}">
        <input type="radio" name="af-method-${vault.id}" value="password"${a.method === 'password' ? ' checked' : ''}> Email / MdP
      </label>
    </div>
    <div id="af-fields-apikey-${vault.id}"${a.method !== 'apikey' ? ' hidden' : ''}>
      <input class="auth-input" type="text" id="af-clientId-${vault.id}" placeholder="Client ID" value="${esc(a.clientId)}" style="margin-bottom:8px">
      <input class="auth-input" type="password" id="af-clientSecret-${vault.id}" placeholder="Client Secret" value="${esc(a.clientSecret)}">
    </div>
    <div id="af-fields-password-${vault.id}"${a.method !== 'password' ? ' hidden' : ''}>
      <input class="auth-input" type="email" id="af-email-${vault.id}" placeholder="email@exemple.com" value="${esc(a.email)}">
    </div>
    <div>
      <input class="auth-input" type="password" id="af-masterPwd-${vault.id}" placeholder="Mot de passe maître" value="${esc(a.masterPassword)}">
    </div>
    ${a.error ? `<div class="auth-error">${esc(a.error)}</div>` : ''}
    <button class="auth-btn" id="af-btn-${vault.id}">Connexion</button>`;

  // Save form values without re-rendering
  const bind = (id, key) => {
    const el = form.querySelector(`#af-${id}-${vault.id}`);
    if (el) el.addEventListener('input', e => { authState[vault.id][key] = e.target.value; });
  };
  bind('server', 'server');
  bind('clientId', 'clientId');
  bind('clientSecret', 'clientSecret');
  bind('email', 'email');
  bind('masterPwd', 'masterPassword');

  // Method toggle
  form.querySelectorAll(`input[name="af-method-${vault.id}"]`).forEach(radio => {
    radio.addEventListener('change', () => {
      authState[vault.id].method = radio.value;
      form.querySelector(`#af-fields-apikey-${vault.id}`).hidden = radio.value !== 'apikey';
      form.querySelector(`#af-fields-password-${vault.id}`).hidden = radio.value !== 'password';
      form.querySelectorAll('.auth-radio-btn').forEach(btn => {
        btn.classList.toggle('active', btn.querySelector('input').value === radio.value);
      });
    });
  });

  // Connect
  form.querySelector(`#af-btn-${vault.id}`).addEventListener('click', () => connectVault(vault.id));

  // Enter key submits
  form.querySelectorAll('.auth-input').forEach(el => {
    el.addEventListener('keydown', e => { if (e.key === 'Enter') connectVault(vault.id); });
  });

  return form;
}

async function connectVault(vaultId) {
  const a = authState[vaultId];
  // Sync current input values
  const fields = ['server', 'clientId', 'clientSecret', 'email', 'masterPwd'];
  const keys   = ['server', 'clientId', 'clientSecret', 'email', 'masterPassword'];
  fields.forEach((f, i) => {
    const el = document.getElementById(`af-${f}-${vaultId}`);
    if (el) a[keys[i]] = el.value;
  });

  const { server, method, clientId, clientSecret, email, masterPassword } = a;

  // Validate
  if (!server || !masterPassword) {
    a.error = 'Serveur et mot de passe maître requis.';
    renderWorkspace(); return;
  }
  if (method === 'apikey' && (!clientId || !clientSecret)) {
    a.error = 'Client ID et Client Secret requis.';
    renderWorkspace(); return;
  }
  if (method === 'password' && !email) {
    a.error = 'Email requis.';
    renderWorkspace(); return;
  }

  a.error = '';
  const idx = state.vaults.findIndex(v => v.id === vaultId);
  state.vaults[idx] = { ...state.vaults[idx], loading: true };
  renderWorkspace();

  try {
    const body = { server, method, masterPassword };
    if (method === 'apikey') { body.clientId = clientId; body.clientSecret = clientSecret; }
    else body.email = email;

    await API.auth(vaultId, body);
    const vault = await API.loadVault(vaultId);
    vault.name = email || clientId || vault.name;
    state.vaults[idx] = vault;
    state.lastSync = Date.now();
    render();
  } catch (err) {
    a.error = err.message;
    state.vaults[idx] = { ...state.vaults[idx], loading: false };
    renderWorkspace();
  }
}

async function disconnectVault(vaultId) {
  await API.disconnect(vaultId);
  const idx = state.vaults.findIndex(v => v.id === vaultId);
  state.vaults[idx] = { id: vaultId, name: `Vault ${parseInt(vaultId) + 1}`, authenticated: false, loading: false, folders: [] };
  state.sel[vaultId] = [];
  authState[vaultId].masterPassword = '';
  authState[vaultId].clientSecret = '';
  authState[vaultId].error = '';
  render();
}

/* ============================================================
   Dossiers & entrées
   ============================================================ */
function folderEl(vault, f, matched, q, sel) {
  const closedKey = vault.id + ':' + (f.id || '_root');
  const open = q ? matched.length > 0 : !state.closed[closedKey];
  const wrap = document.createElement('div');
  wrap.className = 'folder' + (open ? ' open' : '');

  if (state.dropTarget === (f.id || '_root') && state.drag && state.drag.vaultId !== vault.id)
    wrap.classList.add(state.drag.copy ? 'drop-copy' : 'drop-move');

  wrap.dataset.folderId = f.id || '';
  wrap.dataset.vaultId  = vault.id;

  const head = document.createElement('div');
  head.className = 'folder-head';
  const allIds = matched.map(e => e.id);
  const allSel = allIds.length > 0 && allIds.every(id => sel.includes(id));
  head.innerHTML = `
    <span class="folder-chevron">${icon('chev', 14, 2.4)}</span>
    <span class="folder-check folder-check--${allSel ? 'on' : (allIds.some(id => sel.includes(id)) ? 'partial' : 'off')}" title="Tout sélectionner"></span>
    <span class="folder-name">${esc(f.name)}</span>
    <span class="folder-droplabel">${state.drag && state.drag.copy ? 'Copier ici' : 'Déplacer ici'}</span>
    <span class="folder-count">${matched.length}</span>`;
  head.querySelector('.folder-check').addEventListener('click', ev => {
    ev.stopPropagation();
    const cur = state.sel[vault.id] || [];
    state.sel[vault.id] = allSel ? cur.filter(id => !allIds.includes(id)) : [...new Set([...cur, ...allIds])];
    state.sel[otherVault(vault.id)] = [];
    renderWorkspace();
  });
  head.addEventListener('click', () => {
    state.closed[closedKey] = !state.closed[closedKey];
    renderWorkspace();
  });
  wrap.appendChild(head);

  const body = document.createElement('div');
  body.className = 'folder-body';
  matched.forEach(e => body.appendChild(entryEl(vault, f, e, sel.includes(e.id))));
  wrap.appendChild(body);

  wrap.addEventListener('dragover',  onFolderDragOver);
  wrap.addEventListener('dragleave', onFolderDragLeave);
  wrap.addEventListener('drop',      onFolderDrop);

  return wrap;
}

function entryEl(vault, f, e, selected) {
  const row = document.createElement('div');
  row.className = 'entry' + (selected ? ' selected' : '');
  row.draggable = true;
  row.dataset.entryId  = e.id;
  row.dataset.vaultId  = vault.id;
  row.dataset.folderId = f.id || '';

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
    <span class="entry-date">${esc(e.created || '')}</span>`;

  row.querySelector('.entry-check').addEventListener('click', ev => { ev.stopPropagation(); toggleSel(vault.id, e.id); });
  row.addEventListener('click',     ev => onEntryClick(ev, vault.id, e.id));
  row.addEventListener('dragstart', ev => onEntryDragStart(ev, vault.id, e.id));
  row.addEventListener('drag',      onEntryDrag);
  row.addEventListener('dragend',   onEntryDragEnd);
  // ponytail: entries need their own dragover to signal drop-allowed and highlight parent folder
  row.addEventListener('dragover', ev => {
    const d = state.drag;
    if (!d || d.vaultId === vault.id) return;
    ev.preventDefault();
    const copy = ev.ctrlKey || ev.metaKey;
    const key = f.id || '_root';
    if (state.dropTarget !== key || d.copy !== copy) {
      document.querySelectorAll('.folder.drop-move,.folder.drop-copy')
        .forEach(n => n.classList.remove('drop-move', 'drop-copy'));
      state.dropTarget = key; d.copy = copy;
      ev.currentTarget.closest('.folder').classList.add(copy ? 'drop-copy' : 'drop-move');
      updateDragPill();
    }
  });
  return row;
}

function toolbarEl(vault, sel) {
  const other = findVault(otherVault(vault.id));
  const canTransfer = other?.authenticated;
  const transferLabel = canTransfer
    ? `Vers ${esc(other.name)}`
    : 'Autre vault non connecté';

  const bar = document.createElement('div');
  bar.className = 'toolbar';
  const label = sel.length > 1 ? `${sel.length} entrées sélectionnées` : '1 entrée sélectionnée';
  bar.innerHTML = `
    <span class="toolbar-count">${sel.length}</span>
    <span class="toolbar-label">${label}</span>
    <button class="toolbar-clear">Désélectionner</button>
    <button class="toolbar-delete">${icon('trash', 14, 2.2)}</button>
    <button class="toolbar-transfer" ${canTransfer ? '' : 'disabled'}>${transferLabel} ${icon('arrow', 15, 2.4)}</button>`;
  bar.querySelector('.toolbar-clear').addEventListener('click', () => { state.sel[vault.id] = []; renderWorkspace(); });
  bar.querySelector('.toolbar-delete').addEventListener('click', ev => openDeletePopover(ev.currentTarget, vault.id));
  if (canTransfer)
    bar.querySelector('.toolbar-transfer').addEventListener('click', ev => openTransferPopover(ev.currentTarget, vault.id));
  return bar;
}

function refocusSearch(vaultId, caret) {
  const sections = document.querySelectorAll('.vault');
  const idx = state.vaults.findIndex(v => v.id === vaultId);
  const input = sections[idx]?.querySelector('.search input');
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
  updateDragPill();
}
function onEntryDrag(e) {
  if (!state.drag) return;
  if (e.clientX === 0 && e.clientY === 0) return;
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
  if (vaultId === d.vaultId || folderId.startsWith('col:')) { try { e.dataTransfer.dropEffect = 'none'; } catch (_) {} return; }
  e.preventDefault();
  const copy = e.ctrlKey || e.metaKey;
  try { e.dataTransfer.dropEffect = copy ? 'copy' : 'move'; } catch (_) {}
  const key = folderId || '_root';
  if (state.dropTarget !== key || d.copy !== copy) {
    document.querySelectorAll('.folder.drop-move,.folder.drop-copy')
      .forEach(n => n.classList.remove('drop-move', 'drop-copy'));
    state.dropTarget = key; d.copy = copy;
    e.currentTarget.classList.add(copy ? 'drop-copy' : 'drop-move');
    updateDragPill();
  }
}
function onFolderDragLeave(e) {
  const { folderId } = e.currentTarget.dataset;
  if (e.relatedTarget && e.currentTarget.contains(e.relatedTarget)) return;
  const key = folderId || '_root';
  if (state.dropTarget === key) {
    state.dropTarget = null;
    e.currentTarget.classList.remove('drop-move', 'drop-copy');
  }
}
function onFolderDrop(e) {
  const d = state.drag; if (!d) return;
  const { folderId, vaultId } = e.currentTarget.dataset;
  if (vaultId === d.vaultId) { onEntryDragEnd(); return; }
  e.preventDefault();
  const copy = e.ctrlKey || e.metaKey;
  const destVault  = findVault(vaultId);
  const destFolder = destVault.folders.find(f => (f.id || '') === folderId);
  const items    = collectSel(d.vaultId).filter(x => d.ids.includes(x.id));
  const srcVault = d.vaultId;
  const ids      = d.ids.slice();
  const realFolderId = folderId || null;

  document.querySelectorAll('.entry.dragging').forEach(n => n.classList.remove('dragging'));
  hideDragPill();
  state.drag = null; state.dropTarget = null;

  if (copy) { execTransfer(srcVault, vaultId, realFolderId, ids, true); return; }

  // Popover de confirmation
  state.pop = {
    x: Math.min(e.clientX, window.innerWidth - 310),
    y: Math.min(e.clientY, window.innerHeight - 230),
    srcVault, destVault: vaultId, destFolder: realFolderId,
    destName: destVault.name + (destFolder ? ' › ' + destFolder.name : ''),
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
  pill.style.top  = (d.y + 12) + 'px';
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
  const destVault   = findVault(destVaultId);
  if (!destVault?.authenticated) return;
  const destFolder = destVault.folders[0];
  const items = collectSel(vaultId).filter(x => ids.includes(x.id));
  const r = anchorEl.getBoundingClientRect();
  state.pop = {
    x: Math.min(r.left, window.innerWidth - 310),
    y: Math.max(12, r.top - 210),
    srcVault: vaultId, destVault: destVaultId,
    destFolder: destFolder?.id || null,
    destName: destVault.name + (destFolder ? ' › ' + destFolder.name : ''),
    ids: ids.slice(), count: ids.length, attach: items.some(x => x.attach),
  };
  render();
}

function openDeletePopover(anchorEl, vaultId) {
  const ids = state.sel[vaultId] || [];
  if (!ids.length) return;
  const r = anchorEl.getBoundingClientRect();
  state.pop = {
    mode: 'delete',
    x: Math.min(r.left, window.innerWidth - 310),
    y: Math.max(12, r.top - 160),
    vaultId, ids, count: ids.length,
  };
  render();
}

function execDelete(vaultId, ids) {
  const vault = findVault(vaultId);
  vault.folders.forEach(f => { f.entries = f.entries.filter(e => !ids.includes(e.id)); });
  state.sel[vaultId] = [];
  const n = ids.length;
  showToast(`${n} entrée${n > 1 ? 's' : ''} supprimée${n > 1 ? 's' : ''}`);
  render();
  API.delete({ ids, vaultId })
    .catch(err => showToast(`Erreur suppression : ${err.message}`));
}

function renderOverlays() {
  const pop = $('#popover');
  const p = state.pop;
  if (!p) { pop.hidden = true; return; }
  pop.hidden = false;
  pop.style.left = p.x + 'px';
  pop.style.top  = p.y + 'px';

  if (p.mode === 'delete') {
    pop.innerHTML = `
      <div class="pop-head">
        <div class="pop-icon pop-icon--danger">${icon('trash', 17, 2)}</div>
        <div class="pop-titles">
          <div class="pop-title">Supprimer ${p.count} entrée${p.count > 1 ? 's' : ''} ?</div>
          <div class="pop-dest">Envoyées dans la corbeille Bitwarden</div>
        </div>
        <button class="pop-close">${icon('x', 12, 2.4)}</button>
      </div>
      <div class="pop-actions">
        <button class="pop-btn pop-btn-cancel">Annuler</button>
        <button class="pop-btn pop-btn-delete">Supprimer</button>
      </div>`;
    pop.querySelector('.pop-close').addEventListener('click', closePopover);
    pop.querySelector('.pop-btn-cancel').addEventListener('click', closePopover);
    pop.querySelector('.pop-btn-delete').addEventListener('click', () => {
      const { vaultId, ids } = state.pop;
      closePopover();
      execDelete(vaultId, ids);
    });
    return;
  }

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
  pop.querySelector('.pop-btn-copy').addEventListener('click', () => {
    const { srcVault, destVault, destFolder, ids } = state.pop;
    closePopover();
    execTransfer(srcVault, destVault, destFolder, ids, true);
  });
  pop.querySelector('.pop-btn-move').addEventListener('click', () => {
    const { srcVault, destVault, destFolder, ids } = state.pop;
    closePopover();
    execTransfer(srcVault, destVault, destFolder, ids, false);
  });
}
function closePopover() { state.pop = null; renderOverlays(); }

function execTransfer(srcId, destId, destFolderId, ids, copy) {
  const src  = findVault(srcId);
  const dest = findVault(destId);

  // Mise à jour optimiste du cache client
  const moved = [];
  src.folders.forEach(f => f.entries.forEach(e => { if (ids.includes(e.id)) moved.push(e); }));
  if (!copy) src.folders.forEach(f => { f.entries = f.entries.filter(e => !ids.includes(e.id)); });
  const df = dest.folders.find(f => f.id === destFolderId) || dest.folders[0];
  moved.forEach(e => df.entries.unshift(
    copy ? { ...e, id: e.id + '-c' + Math.random().toString(36).slice(2, 6) } : { ...e }
  ));

  state.sel[srcId] = [];
  state.lastSync = Date.now();
  const n = moved.length;
  const verb = copy ? ('copiée' + (n > 1 ? 's' : '')) : ('déplacée' + (n > 1 ? 's' : ''));
  showToast(`${n} entrée${n > 1 ? 's' : ''} ${verb} vers ${dest.name}`);
  render();

  // Appel API (fire-and-forget, ponytail: rollback non implémenté — refresh sur erreur)
  API.transfer({ ids, fromVault: srcId, toVault: destId, toFolder: destFolderId, mode: copy ? 'copy' : 'move' })
    .then(d => {
      if (!d.success && !d.ok) showToast(`Erreur : ${d.error || 'Transfer failed'}`);
      else if (d.hasAttachments) showToast('⚠ Pièces jointes non transférées — à copier manuellement.');
    })
    .catch(err => showToast(`Erreur réseau : ${err.message}`));
}

/* ============================================================
   Sync / refresh
   ============================================================ */
async function refresh() {
  if (state.syncing) return;
  state.syncing = true;
  state.vaults.forEach((v, i) => { if (v.authenticated) state.vaults[i] = { ...v, loading: true }; });
  render();

  await Promise.all(state.vaults.map(async (v, i) => {
    if (!v.authenticated && !v.loading) return;
    try {
      const data = await API.refreshVault(v.id);
      state.vaults[i] = data;
    } catch (_) { state.vaults[i] = { ...state.vaults[i], loading: false }; }
  }));

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
   Init
   ============================================================ */
async function init() {
  $('#themeToggle').addEventListener('click', toggleTheme);
  $('#refreshBtn').addEventListener('click', refresh);

  document.addEventListener('mousedown', e => {
    if (state.pop && !e.target.closest('#popover')) closePopover();
  }, true);

  setInterval(() => { if (!state.syncing) $('#syncLabel').textContent = syncLabel(); }, 20000);

  // Placeholders
  const statuses = await API.status();
  state.vaults = statuses.map((s, i) => ({
    id: String(i),
    name: s.label || `Vault ${i + 1}`,
    authenticated: false,
    loading: s.unlocked,  // loading if we'll fetch
    folders: [],
  }));
  if (statuses[0]?.server) authState['0'].server = statuses[0].server;
  if (statuses[1]?.server) authState['1'].server = statuses[1].server;
  render();

  // Charger les vaults déjà authentifiés
  await Promise.all(statuses.map(async (s, i) => {
    if (!s.unlocked) return;
    try {
      const data = await API.loadVault(String(i));
      state.vaults[i] = data;
    } catch (err) {
      state.vaults[i] = { id: String(i), name: s.label || `Vault ${i + 1}`, authenticated: false, loading: false, folders: [] };
    }
  }));

  state.lastSync = Date.now();
  render();
}

document.addEventListener('DOMContentLoaded', init);
