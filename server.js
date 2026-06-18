const express = require('express');
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const BW = path.join(__dirname, 'node_modules', '.bin', 'bw');

const app = express();
app.use(express.json());
app.use(express.static('public'));

const CONFIG_DIR = path.join(os.homedir(), '.bw-multi-sync');
const SESSIONS_FILE = path.join(CONFIG_DIR, 'sessions.json');

// Ensure config dir exists
if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });
for (const i of [0, 1]) {
  const d = path.join(CONFIG_DIR, `vault${i}`);
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

function loadSessions() {
  try {
    return JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8'));
  } catch {
    return [null, null];
  }
}

function saveSessions(sessions) {
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2), { mode: 0o600 });
}

function safeVaultIdx(v) {
  const i = Number(v);
  if (i !== 0 && i !== 1) throw new Error('invalid vault index');
  return i;
}

function runBw(vaultIndex, args, sessionToken, password) {
  console.log(`[vault${vaultIndex}] bw ${args.join(' ')}`);

  const env = {
    ...process.env,
    BITWARDENCLI_APPDATA_DIR: path.join(CONFIG_DIR, `vault${vaultIndex}`),
  };
  if (sessionToken) env.BW_SESSION = sessionToken;
  if (password) env.BW_PASSWORD = password;

  const result = spawnSync(BW, args, { env, encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
  if (result.error) throw new Error(`bw not found: ${result.error.message}`);
  if (result.status !== 0) {
    const msg = (result.stderr || result.stdout || `bw exited ${result.status}`).trim();
    console.error(`[vault${vaultIndex}] bw error: ${msg}`);
    throw new Error(msg);
  }
  return result.stdout.trim();
}

// Check if a session token is still valid
function isSessionValid(vaultIndex, token) {
  try {
    const out = runBw(vaultIndex, ['status'], token);
    const status = JSON.parse(out);
    return status.status === 'unlocked';
  } catch {
    return false;
  }
}

// GET /api/status — return session state for both vaults
app.get('/api/status', (req, res) => {
  const sessions = loadSessions();
  const result = sessions.map((s, i) => {
    if (!s) return { configured: false };
    const valid = isSessionValid(i, s.token);
    if (!valid) {
      // Token expired — keep server/email but clear token
      sessions[i] = { ...s, token: null };
    }
    return {
      configured: true,
      server: s.server,
      label: s.label,
      unlocked: valid,
    };
  });
  // Save if we cleared any expired tokens
  saveSessions(sessions);
  res.json(result);
});

// POST /api/auth/:vaultIndex — configure server, login, unlock
app.post('/api/auth/:vaultIndex', (req, res) => {
  let i; try { i = safeVaultIdx(req.params.vaultIndex); } catch { return res.status(400).json({ error: 'Invalid vault index' }); }

  const { server, method, masterPassword, clientId, clientSecret, email } = req.body;
  if (!server || !masterPassword || !method)
    return res.status(400).json({ error: 'server, method, masterPassword requis' });

  try {
    const vaultDir = path.join(CONFIG_DIR, `vault${i}`);
    fs.rmSync(vaultDir, { recursive: true, force: true });
    fs.mkdirSync(vaultDir, { recursive: true });
    console.log(`[vault${i}] data dir cleared`);

    console.log(`[vault${i}] config server ${server}`);
    runBw(i, ['config', 'server', server]);

    const dataEnv = { ...process.env, BITWARDENCLI_APPDATA_DIR: path.join(CONFIG_DIR, `vault${i}`) };

    if (method === 'apikey') {
      if (!clientId || !clientSecret) return res.status(400).json({ error: 'clientId, clientSecret requis' });
      console.log(`[vault${i}] login --apikey`);
      const r = spawnSync(BW, ['login', '--apikey'],
        { env: { ...dataEnv, BW_CLIENTID: clientId, BW_CLIENTSECRET: clientSecret }, encoding: 'utf8' });
      if (r.status !== 0) throw new Error((r.stderr || r.stdout || 'login failed').trim());
    } else {
      if (!email) return res.status(400).json({ error: 'email requis' });
      console.log(`[vault${i}] login ${email} --passwordenv`);
      const r = spawnSync(BW, ['login', email, '--passwordenv', 'BW_PASSWORD', '--raw'],
        { env: { ...dataEnv, BW_PASSWORD: masterPassword }, encoding: 'utf8' });
      if (r.status !== 0) throw new Error((r.stderr || r.stdout || 'login failed').trim());
    }

    console.log(`[vault${i}] login ok, unlocking`);
    const token = runBw(i, ['unlock', '--passwordenv', 'BW_PASSWORD', '--raw'], null, masterPassword);
    console.log(`[vault${i}] unlocked, token length=${token.length}`);

    const sessions = loadSessions();
    sessions[i] = { server, label: email || clientId, token };
    saveSessions(sessions);

    res.json({ success: true });
  } catch (err) {
    console.error(`[vault${i}] auth failed: ${err.message}`);
    res.status(401).json({ error: err.message });
  }
});

// POST /api/disconnect/:vaultIndex — clear session
app.post('/api/disconnect/:vaultIndex', (req, res) => {
  let i; try { i = safeVaultIdx(req.params.vaultIndex); } catch { return res.status(400).json({ error: 'Invalid vault index' }); }
  const sessions = loadSessions();
  sessions[i] = null;
  saveSessions(sessions);
  res.json({ success: true });
});

function syncAndBuildTree(vaultIndex, session) {
  runBw(vaultIndex, ['sync'], session.token);
  const folders     = JSON.parse(runBw(vaultIndex, ['list', 'folders'],     session.token));
  const items       = JSON.parse(runBw(vaultIndex, ['list', 'items'],       session.token));
  let   collections = [];
  try { collections = JSON.parse(runBw(vaultIndex, ['list', 'collections'], session.token)); } catch (_) {}

  // Personal items grouped by folder
  // ponytail: bw list folders includes a null-id "No Folder" entry — skip it, we add our own
  const folderList = folders.filter(f => f.id !== null).map(f => ({
    id: f.id,
    name: f.name,
    entries: items.filter(item => item.folderId === f.id).map(mapItem),
  }));

  // Org items (in collections) without a personal folder → grouped by collection
  const collectionList = collections.map(c => ({
    id: 'col:' + c.id,
    name: c.name,
    entries: items.filter(item =>
      !item.folderId && Array.isArray(item.collectionIds) && item.collectionIds.includes(c.id)
    ).map(mapItem),
  })).filter(c => c.entries.length > 0);

  // Items truly uncategorised (no folder, no collection)
  const uncategorised = items.filter(item =>
    !item.folderId && (!item.collectionIds || item.collectionIds.length === 0)
  ).map(mapItem);

  const allGroups = [...folderList, ...collectionList];
  allGroups.unshift({
    id: null,
    name: 'Sans dossier',
    entries: uncategorised,
  });

  return {
    id: String(vaultIndex),
    name: session.label || `Vault ${vaultIndex + 1}`,
    folders: allGroups,
  };
}

function vaultHandler(req, res) {
  let i; try { i = safeVaultIdx(req.params.vaultIndex); } catch { return res.status(400).json({ error: 'Invalid vault index' }); }
  const sessions = loadSessions();
  const session = sessions[i];
  if (!session?.token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    res.json(syncAndBuildTree(i, session));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

app.get('/api/vault/:vaultIndex', vaultHandler);
app.post('/api/refresh/:vaultIndex', vaultHandler);

// POST /api/transfer — copy or move one or more items
app.post('/api/transfer', (req, res) => {
  const { ids, fromVault, toVault, toFolder, mode } = req.body;
  const idList = Array.isArray(ids) ? ids : [ids].filter(Boolean);
  if (!idList.length || fromVault == null || toVault == null || !mode) {
    return res.status(400).json({ error: 'ids, fromVault, toVault, mode requis' });
  }

  let srcIdx, dstIdx;
  try { srcIdx = safeVaultIdx(fromVault); dstIdx = safeVaultIdx(toVault); }
  catch { return res.status(400).json({ error: 'Invalid vault index' }); }

  const sessions = loadSessions();
  const srcSession = sessions[srcIdx];
  const dstSession = sessions[dstIdx];
  if (!srcSession?.token) return res.status(401).json({ error: 'Source vault not authenticated' });
  if (!dstSession?.token) return res.status(401).json({ error: 'Destination vault not authenticated' });

  let hasAttachments = false;
  try {
    for (const itemId of idList) {
      const item = JSON.parse(runBw(srcIdx, ['get', 'item', itemId], srcSession.token));
      if (item.attachments?.length) hasAttachments = true;

      delete item.id; delete item.revisionDate; delete item.creationDate; delete item.deletedDate;
      item.collectionIds = []; item.organizationId = null;
      item.folderId = toFolder || null;

      const enc = spawnSync(BW, ['encode'], {
        input: JSON.stringify(item),
        env: { ...process.env, BITWARDENCLI_APPDATA_DIR: path.join(CONFIG_DIR, `vault${dstIdx}`), BW_SESSION: dstSession.token },
        encoding: 'utf8',
      });
      if (enc.status !== 0) throw new Error('bw encode failed: ' + enc.stderr);
      runBw(dstIdx, ['create', 'item', enc.stdout.trim()], dstSession.token);

      if (mode === 'move') runBw(srcIdx, ['delete', 'item', itemId], srcSession.token);
    }
    res.json({ success: true, hasAttachments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/delete — soft-delete (trash) one or more items
app.post('/api/delete', (req, res) => {
  const { ids, vaultId } = req.body;
  const idList = Array.isArray(ids) ? ids : [ids].filter(Boolean);
  if (!idList.length || vaultId == null)
    return res.status(400).json({ error: 'ids et vaultId requis' });

  let vidx; try { vidx = safeVaultIdx(vaultId); } catch { return res.status(400).json({ error: 'Invalid vault index' }); }
  const sessions = loadSessions();
  const session = sessions[vidx];
  if (!session?.token) return res.status(401).json({ error: 'Vault not authenticated' });

  try {
    for (const itemId of idList)
      runBw(vidx, ['delete', 'item', itemId], session.token);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function mapItem(item) {
  const typeMap = { 1: 'login', 2: 'note', 3: 'card', 4: 'identity' };
  return {
    id: item.id,
    type: typeMap[item.type] || 'login',
    name: item.name,
    username: item.login?.username || item.card?.cardholderName || item.identity?.firstName || '',
    url: item.login?.uris?.[0]?.uri || '',
    created: item.creationDate
      ? new Date(item.creationDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
      : '',
    attach: !!(item.attachments && item.attachments.length > 0),
  };
}

const PORT = process.env.PORT || 3333;
app.listen(PORT, '127.0.0.1', () => console.log(`Bitwarden Multi-Sync running at http://localhost:${PORT}`));
