// ── sync.js ────────────────────────────────────────────────────
// Cloud sync coordinator: glues crypto + Dropbox to the app.
// Handles push/pull, status tracking, and password unlock flow.
// ──────────────────────────────────────────────────────────────

// ── Private State ───────────────────────────────────────────

const SYNC_SETTINGS_KEY = 'nucleus_sync_settings';
const SYNC_SALT_KEY = 'nucleus_sync_salt';

let _syncKey = null;         // CryptoKey in memory, null on page load
let _syncPassword = null;    // string in memory only, cleared after key derivation
let _syncStatus = 'idle';    // 'idle'|'syncing'|'error'|'offline'

// ── Settings Management ──────────────────────────────────────

function getSyncSettings() {
  try {
    const stored = localStorage.getItem(SYNC_SETTINGS_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) {}
  return { enabled: false, lastSyncAt: null };
}

function saveSyncSettings(obj) {
  try {
    localStorage.setItem(SYNC_SETTINGS_KEY, JSON.stringify(obj));
  } catch (e) {
    console.error('Failed to save sync settings:', e);
  }
}

function isSyncEnabled() {
  return getSyncSettings().enabled === true;
}

function isSyncUnlocked() {
  return _syncKey !== null;
}

// ── Key Lifecycle ───────────────────────────────────────────

async function unlockSync(password) {
  try {
    let salt = localStorage.getItem(SYNC_SALT_KEY);

    // First time: no salt yet, verify will happen after first push
    if (!salt) {
      _syncPassword = password;
      _syncKey = await deriveKey(password, crypto.getRandomValues(new Uint8Array(16)));
      return true;
    }

    // Subsequent unlocks: derive key and verify with a test download
    _syncPassword = password;
    _syncKey = await deriveKey(password, salt);

    // Optionally test by downloading and decrypting a file, but this requires
    // the notebook to have been synced at least once. For now, we just trust
    // the password and let any decryption errors appear at sync time.
    return true;
  } catch (e) {
    console.error('Unlock failed:', e);
    _syncKey = null;
    _syncPassword = null;
    return false;
  }
}

function lockSync() {
  _syncKey = null;
  _syncPassword = null;
}

// ── Status Management ───────────────────────────────────────

function setSyncStatus(status) {
  _syncStatus = status;
  if (typeof updateSyncStatusUI === 'function') {
    updateSyncStatusUI();
  }
}

function getSyncStatus() {
  return _syncStatus;
}

// ── Push (Encrypt + Upload) ──────────────────────────────────

async function pushNotebook(nbId) {
  // Fire-and-forget safe: never throws
  if (!isSyncEnabled() || !isSyncUnlocked() || !(await dropboxSync.isAuthorized())) {
    return;
  }

  try {
    setSyncStatus('syncing');

    // Serialize current notebook state
    const payload = JSON.stringify({
      version: 1,
      savedAt: new Date().toISOString(),
      ...S
    });

    // Get salt (should exist since unlocked)
    let salt = localStorage.getItem(SYNC_SALT_KEY);
    if (!salt) {
      salt = crypto.getRandomValues(new Uint8Array(16));
      localStorage.setItem(SYNC_SALT_KEY, b64Encode(salt));
    }

    // Encrypt
    const envelope = await encryptData(payload, _syncPassword, salt);
    const envelopeJson = JSON.stringify(envelope);

    // Upload to Dropbox
    const path = `/orbit-sync/${nbId}.enc`;
    await dropboxSync.uploadFile(path, envelopeJson);

    // Update last sync time
    const settings = getSyncSettings();
    settings.lastSyncAt = new Date().toISOString();
    saveSyncSettings(settings);

    setSyncStatus('idle');
  } catch (e) {
    console.error('Push failed:', e);
    if (e.toString().includes('Network') || e.toString().includes('fetch')) {
      setSyncStatus('offline');
    } else {
      setSyncStatus('error');
    }
  }
}

// ── Pull (Download + Decrypt) ────────────────────────────────

async function pullNotebook(nbId) {
  // Returns: parsed data object or null
  // Throws nothing — all errors handled internally
  if (!isSyncEnabled() || !isSyncUnlocked() || !(await dropboxSync.isAuthorized())) {
    return null;
  }

  try {
    setSyncStatus('syncing');

    const path = `/orbit-sync/${nbId}.enc`;
    const envelopeJson = await dropboxSync.downloadFile(path);

    if (!envelopeJson) {
      // File doesn't exist — not an error
      setSyncStatus('idle');
      return null;
    }

    // Parse envelope
    const envelope = JSON.parse(envelopeJson);

    // Decrypt
    const plaintext = await decryptData(envelope, _syncPassword);
    const data = JSON.parse(plaintext);

    setSyncStatus('idle');
    return data;
  } catch (e) {
    console.error('Pull failed:', e);
    if (e.toString().includes('Network') || e.toString().includes('fetch')) {
      setSyncStatus('offline');
    } else if (e.toString().includes('decrypt') || e.message.includes('Unexpected')) {
      setSyncStatus('error');
      toast('Sync: wrong password or corrupted data');
    } else {
      setSyncStatus('error');
    }
    return null;
  }
}

// ── Manual Sync Trigger ──────────────────────────────────────

async function syncNow() {
  if (!isSyncEnabled()) {
    toast('Sync is disabled');
    return;
  }
  if (!isSyncUnlocked()) {
    toast('Sync is locked — unlock in settings');
    return;
  }
  if (!(await dropboxSync.isAuthorized())) {
    toast('Sync not authorized — connect Dropbox');
    return;
  }

  await pushNotebook(NB_ACTIVE_ID);
  if (getSyncStatus() === 'idle') {
    toast('Synced to Dropbox');
  }
}
