// ── filestore.js ──────────────────────────────────────────────
// File System Access API + IndexedDB persistence of file handles.
// Supports multiple notebooks — each notebook has its own IDB key.
// Exposes a global `fileStore` object used by state.js and modals.js.
// ──────────────────────────────────────────────────────────────

const FS_DB_NAME    = 'nucleus_fs';
const FS_STORE_NAME = 'handles';

// Per-notebook handle cache
const _handles    = {};   // { [nbId]: FileSystemFileHandle }
const _connected  = {};   // { [nbId]: boolean }

// ── IndexedDB helpers ─────────────────────────────────────────

function _openIDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(FS_DB_NAME, 1);
    req.onupgradeneeded = e => e.target.result.createObjectStore(FS_STORE_NAME);
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e.target.error);
  });
}

async function _loadHandle(key) {
  try {
    const db = await _openIDB();
    return await new Promise((resolve, reject) => {
      const tx  = db.transaction(FS_STORE_NAME, 'readonly');
      const req = tx.objectStore(FS_STORE_NAME).get(key);
      req.onsuccess = e => resolve(e.target.result || null);
      req.onerror   = e => reject(e.target.error);
    });
  } catch(e) { return null; }
}

async function _saveHandle(handle, key) {
  try {
    const db = await _openIDB();
    await new Promise((resolve, reject) => {
      const tx  = db.transaction(FS_STORE_NAME, 'readwrite');
      const req = tx.objectStore(FS_STORE_NAME).put(handle, key);
      req.onsuccess = () => resolve();
      req.onerror   = e => reject(e.target.error);
    });
  } catch(e) { /* ignore */ }
}

async function _clearHandle(key) {
  try {
    const db = await _openIDB();
    await new Promise((resolve, reject) => {
      const tx  = db.transaction(FS_STORE_NAME, 'readwrite');
      const req = tx.objectStore(FS_STORE_NAME).delete(key);
      req.onsuccess = () => resolve();
      req.onerror   = e => reject(e.target.error);
    });
  } catch(e) { /* ignore */ }
}

// ── Per-Notebook API ──────────────────────────────────────────

const fileStore = {

  // ── Per-notebook methods ─────────────────────────────────

  // Restore handle for a notebook from IDB; check permission.
  async initForNotebook(nbId) {
    if (!('showOpenFilePicker' in window)) return;
    const key = 'nb_' + nbId;
    try {
      const handle = await _loadHandle(key);
      if (!handle) return;
      const perm = await handle.queryPermission({ mode: 'readwrite' });
      if (perm === 'granted') {
        _handles[nbId] = handle; _connected[nbId] = true;
      } else if (perm === 'prompt') {
        _handles[nbId] = handle; _connected[nbId] = false;
      } else {
        await _clearHandle(key);
      }
    } catch(e) { /* fall back to localStorage */ }
  },

  // Request permission for a notebook's handle (requires user gesture).
  async requestPermissionForNotebook(nbId) {
    const handle = _handles[nbId];
    if (!handle) return false;
    try {
      const perm = await handle.requestPermission({ mode: 'readwrite' });
      if (perm === 'granted') { _connected[nbId] = true; return true; }
    } catch(e) {}
    return false;
  },

  // Returns parsed JSON from a notebook's file, or null.
  async readFileForNotebook(nbId) {
    const handle = _handles[nbId];
    if (!handle || !_connected[nbId]) return null;
    try {
      const file = await handle.getFile();
      const text = await file.text();
      return JSON.parse(text);
    } catch(e) {
      fileStore.disconnectNotebook(nbId);
      return null;
    }
  },

  // Writes data as JSON to a notebook's file. Fire-and-forget safe.
  async writeFileForNotebook(nbId, data) {
    const handle = _handles[nbId];
    if (!handle || !_connected[nbId]) return;
    try {
      const writable = await handle.createWritable();
      await writable.write(JSON.stringify(data, null, 2));
      await writable.close();
    } catch(e) {
      if (e.name === 'NotAllowedError') {
        fileStore.disconnectNotebook(nbId);
        if (typeof toast === 'function') toast('File disconnected — permission lost');
      }
    }
  },

  // Open a file picker and connect it to a notebook.
  async connectForNotebook(nbId) {
    if (!('showOpenFilePicker' in window)) return null;
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [{ description: 'Nucleus Data', accept: { 'application/json': ['.json'] } }],
        multiple: false
      });
      const perm = await handle.requestPermission({ mode: 'readwrite' });
      if (perm !== 'granted') return null;
      _handles[nbId] = handle; _connected[nbId] = true;
      await _saveHandle(handle, 'nb_' + nbId);
      return handle;
    } catch(e) {
      if (e.name !== 'AbortError') console.warn('fileStore.connectForNotebook:', e);
      return null;
    }
  },

  // Open a save picker, write data, and connect to a notebook.
  async createAndConnectForNotebook(nbId, data, suggestedName) {
    if (!('showSaveFilePicker' in window)) return null;
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: suggestedName || 'nucleus-data.json',
        types: [{ description: 'Nucleus Data', accept: { 'application/json': ['.json'] } }]
      });
      _handles[nbId] = handle; _connected[nbId] = true;
      await _saveHandle(handle, 'nb_' + nbId);
      await fileStore.writeFileForNotebook(nbId, data);
      return handle;
    } catch(e) {
      if (e.name !== 'AbortError') console.warn('fileStore.createAndConnectForNotebook:', e);
      return null;
    }
  },

  // Disconnect a notebook's file. Clears IDB entry.
  disconnectNotebook(nbId) {
    delete _handles[nbId];
    _connected[nbId] = false;
    _clearHandle('nb_' + nbId);
  },

  // Returns true if the notebook has an active (granted) file connection.
  isActive(nbId) {
    return !!(nbId && _connected[nbId] && _handles[nbId]);
  },

  // Returns the file name for a notebook's handle, or null.
  getFileName(nbId) {
    return (_handles[nbId] && _handles[nbId].name) || null;
  },

  // Returns true if a handle exists but permission is 'prompt' (not yet granted).
  isPending(nbId) {
    return !!(nbId && _handles[nbId] && !_connected[nbId]);
  },

  // ── Handle cache helpers (used by notebooks.js) ──────────

  // Stores a handle in IDB and caches it for nbId so it's immediately usable.
  async _saveHandleForNotebook(nbId, handle) {
    _handles[nbId] = handle;
    _connected[nbId] = true;
    await _saveHandle(handle, 'nb_' + nbId);
  },

  // ── Migration helper ──────────────────────────────────────

  // Reads and moves the legacy 'fileHandle' IDB key to a notebook-scoped key.
  // Returns { handle, name } or null if no legacy handle exists.
  async migrateLegacyHandle(nbId) {
    const handle = await _loadHandle('fileHandle');
    if (!handle) return null;
    await _saveHandle(handle, 'nb_' + nbId);
    await _clearHandle('fileHandle');
    return handle;
  },

  // ── Legacy shims (delegate to active notebook via NB_ACTIVE_ID) ──
  // These keep state.js and existing modals.js callers working.

  get active()   { return fileStore.isActive(typeof NB_ACTIVE_ID !== 'undefined' ? NB_ACTIVE_ID : null); },
  get fileName() { return fileStore.getFileName(typeof NB_ACTIVE_ID !== 'undefined' ? NB_ACTIVE_ID : null); },

  async init() {
    // Legacy shim — notebooks.js calls initForNotebook() directly.
    // Nothing to do here; kept for safety in case called before notebooks.js loads.
  },

  async requestPermission() {
    return fileStore.requestPermissionForNotebook(typeof NB_ACTIVE_ID !== 'undefined' ? NB_ACTIVE_ID : null);
  },

  async readFile() {
    return fileStore.readFileForNotebook(typeof NB_ACTIVE_ID !== 'undefined' ? NB_ACTIVE_ID : null);
  },

  async writeFile(data) {
    return fileStore.writeFileForNotebook(typeof NB_ACTIVE_ID !== 'undefined' ? NB_ACTIVE_ID : null, data);
  },

  async connect() {
    return fileStore.connectForNotebook(typeof NB_ACTIVE_ID !== 'undefined' ? NB_ACTIVE_ID : null);
  },

  async createAndConnect(data) {
    return fileStore.createAndConnectForNotebook(typeof NB_ACTIVE_ID !== 'undefined' ? NB_ACTIVE_ID : null, data);
  },

  disconnect() {
    fileStore.disconnectNotebook(typeof NB_ACTIVE_ID !== 'undefined' ? NB_ACTIVE_ID : null);
  }
};
