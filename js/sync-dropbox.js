// ── sync-dropbox.js ────────────────────────────────────────────
// Dropbox PKCE OAuth 2.0 flow and file I/O for cloud sync.
// No server needed — works directly from static app.
// ──────────────────────────────────────────────────────────────

// ── Configuration ───────────────────────────────────────────

// NOTE: This must be populated by the user after registering a Dropbox App
// Get this from https://www.dropbox.com/developers/apps
const DROPBOX_APP_KEY = 'YOUR_DROPBOX_APP_KEY_HERE';

// Dropbox API endpoints
const DROPBOX_AUTH_URL = 'https://www.dropbox.com/oauth2/authorize';
const DROPBOX_TOKEN_URL = 'https://api.dropboxapi.com/oauth2/token';
const DROPBOX_UPLOAD_URL = 'https://content.dropboxapi.com/2/files/upload';
const DROPBOX_DOWNLOAD_URL = 'https://content.dropboxapi.com/2/files/download';

// ── Helpers ─────────────────────────────────────────────────

function generateRandomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function b64urlEncode(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function sha256(str) {
  const buffer = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return hashBuffer;
}

// ── Dropbox Sync Singleton ──────────────────────────────────

const dropboxSync = {
  // Private state
  _token: null,

  // Initialize on page load
  async _init() {
    this._loadToken();
  },

  // Load token from localStorage
  _loadToken() {
    try {
      const stored = localStorage.getItem('nucleus_sync_token');
      if (stored) {
        this._token = JSON.parse(stored);
      }
    } catch (e) {}
  },

  // Save token to localStorage
  _saveToken() {
    if (this._token) {
      localStorage.setItem('nucleus_sync_token', JSON.stringify(this._token));
    } else {
      localStorage.removeItem('nucleus_sync_token');
    }
  },

  // Check if token exists and is valid/refreshable
  async isAuthorized() {
    if (!this._token || !this._token.access) return false;
    await this._refreshIfNeeded();
    return !!(this._token && this._token.access);
  },

  // For UI status checks
  _hasToken() {
    return !!(this._token && this._token.access);
  },

  // Refresh access token if needed (within 5 min of expiry)
  async _refreshIfNeeded() {
    if (!this._token || !this._token.refresh) return;
    if (!this._token.expiresAt) return; // Old format, treat as expired

    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    if (now > this._token.expiresAt - fiveMinutes) {
      try {
        const response = await fetch(DROPBOX_TOKEN_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: this._token.refresh,
            client_id: DROPBOX_APP_KEY
          })
        });
        if (response.ok) {
          const data = await response.json();
          this._token.access = data.access_token;
          this._token.expiresAt = Date.now() + (data.expires_in * 1000);
          if (data.refresh_token) {
            this._token.refresh = data.refresh_token;
          }
          this._saveToken();
        } else {
          this._token = null;
          this._saveToken();
        }
      } catch (e) {
        console.error('Token refresh failed:', e);
      }
    }
  },

  // Start the PKCE OAuth flow
  async startAuth() {
    const codeVerifier = generateRandomString(64);
    sessionStorage.setItem('nucleus_sync_pkce_verifier', codeVerifier);

    const challenge = await sha256(codeVerifier);
    const codeChallenge = b64urlEncode(challenge);

    const redirectUri = window.location.origin + window.location.pathname;

    const authUrl = new URL(DROPBOX_AUTH_URL);
    authUrl.searchParams.append('client_id', DROPBOX_APP_KEY);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('code_challenge', codeChallenge);
    authUrl.searchParams.append('code_challenge_method', 'S256');
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('token_access_type', 'offline');

    window.location.href = authUrl.toString();
  },

  // Handle OAuth callback on page load
  async handleAuthCallback() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const error = params.get('error');

    if (error) {
      console.error('Dropbox auth error:', error);
      history.replaceState({}, '', window.location.pathname);
      return false;
    }

    if (!code) {
      return false; // Not a callback
    }

    // Clean URL immediately
    history.replaceState({}, '', window.location.pathname);

    // Exchange code for token
    const codeVerifier = sessionStorage.getItem('nucleus_sync_pkce_verifier');
    if (!codeVerifier) {
      console.error('Code verifier not found');
      return true;
    }

    try {
      const redirectUri = window.location.origin + window.location.pathname;
      const response = await fetch(DROPBOX_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          code_verifier: codeVerifier,
          redirect_uri: redirectUri,
          client_id: DROPBOX_APP_KEY
        })
      });

      if (response.ok) {
        const data = await response.json();
        this._token = {
          access: data.access_token,
          refresh: data.refresh_token || null,
          expiresAt: Date.now() + (data.expires_in * 1000)
        };
        this._saveToken();
        sessionStorage.removeItem('nucleus_sync_pkce_verifier');
        return true;
      } else {
        const errorData = await response.json();
        console.error('Token exchange failed:', errorData);
        return true;
      }
    } catch (e) {
      console.error('Callback handling error:', e);
      return true;
    }
  },

  // Disconnect (clear token)
  async disconnect() {
    this._token = null;
    this._saveToken();
  },

  // Upload a file to Dropbox
  async uploadFile(path, content) {
    // path: string like '/orbit-sync/notebookId.enc'
    // content: string (encrypted JSON)

    if (!this._token || !this._token.access) {
      throw new Error('Not authorized');
    }

    await this._refreshIfNeeded();

    const response = await fetch(DROPBOX_UPLOAD_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this._token.access}`,
        'Dropbox-API-Arg': JSON.stringify({ path, mode: 'overwrite', autorename: false }),
        'Content-Type': 'application/octet-stream'
      },
      body: content
    });

    if (response.status === 401) {
      // Token expired, try to refresh
      await this._refreshIfNeeded();
      if (this._token && this._token.access) {
        return this.uploadFile(path, content); // Retry
      }
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Upload failed: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    return response.json();
  },

  // Download a file from Dropbox
  async downloadFile(path) {
    // path: string like '/orbit-sync/notebookId.enc'
    // returns: string (encrypted JSON) or null (if file not found)

    if (!this._token || !this._token.access) {
      throw new Error('Not authorized');
    }

    await this._refreshIfNeeded();

    const response = await fetch(DROPBOX_DOWNLOAD_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this._token.access}`,
        'Dropbox-API-Arg': JSON.stringify({ path })
      }
    });

    if (response.status === 404) {
      // File doesn't exist yet
      return null;
    }

    if (response.status === 401) {
      // Token expired, try to refresh
      await this._refreshIfNeeded();
      if (this._token && this._token.access) {
        return this.downloadFile(path); // Retry
      }
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Download failed: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    return response.text();
  }
};

// Initialize on load
dropboxSync._init();
