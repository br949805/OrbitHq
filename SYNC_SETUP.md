# Cloud Sync Setup Guide

End-to-end encrypted cloud sync has been implemented. To use it, you need to register a Dropbox App and configure the app key.

## Step 1: Create a Dropbox App

1. Go to https://www.dropbox.com/developers/apps
2. Click "Create app"
3. Select:
   - **Scoped access**
   - **App folder** (recommended for privacy — limits access to a dedicated folder)
4. Enter an app name (e.g., "OrbitHq")
5. Click "Create app"

## Step 2: Configure OAuth Redirect URI

1. In your app settings, find **"OAuth 2"** section
2. Under **"Redirect URIs"**, add your app's URL:
   - For localhost: `http://localhost:PORT/` (where PORT is your dev server port)
   - For production: `https://yourdomain.com/path/to/OrbitHq/` (the exact path where index.html is served)
3. Click "Add" for each URI
4. Click "Save"

**Important:** The redirect URI must match EXACTLY, including trailing slash and protocol.

## Step 3: Copy Your App Key

1. In the **"Settings"** tab of your Dropbox App
2. Find **"App key"** (also called "Client ID")
3. Copy the value

## Step 4: Add App Key to Code

Open `js/sync-dropbox.js` and replace:

```js
const DROPBOX_APP_KEY = 'YOUR_DROPBOX_APP_KEY_HERE';
```

With your actual app key:

```js
const DROPBOX_APP_KEY = 'abc123def456...';
```

## How It Works

### Encryption
- Data is encrypted with AES-GCM 256-bit using Web Crypto API
- Key is derived from user's password with PBKDF2 (100k iterations)
- Each encryption uses a fresh random IV
- Salt is stored once and reused for all encryptions of that notebook
- **Zero-knowledge:** OrbitHq never sees unencrypted data

### Sync Flow
1. User connects to Dropbox via OAuth (PKCE flow — no server needed)
2. User sets an encryption password in the sync modal
3. On every save, notebook JSON is encrypted and uploaded to `/orbit-sync/{notebookId}.enc` in Dropbox
4. On app load, if no local file is connected, encrypted data is downloaded and decrypted
5. If offline, local data remains safe and usable
6. If sync fails, user sees a status indicator in the hamburger menu

### Password Security
- Password is never stored — only used to derive the encryption key
- Key is held only in memory; cleared when user locks sync or page unloads
- Password verification happens by attempting to decrypt cloud data; if it fails, user sees "wrong password" error

## Testing

1. Open the app in your browser
2. Open the hamburger menu (☰) → scroll to "Cloud Sync (Dropbox)"
3. Click "Manage"
4. Click "Connect Dropbox" — you'll be redirected to Dropbox to authorize
5. After authorization, set your encryption password
6. Click "Sync Now" to verify it works
7. Check your Dropbox app folder — you should see `orbit-sync/` folder with `.enc` files

## Status Indicators

In the hamburger footer, you'll see a cloud status dot:

| Color | Status | Meaning |
|---|---|---|
| Blue (glowing) | `cloud ✓` | Sync is active and working |
| Purple | `locked` | Sync is authorized but password not entered |
| Red | `sync error` | Last sync failed — click to retry |
| Grey | `offline` | Network unavailable |
| Hidden | — | Sync disabled or not authorized |

## Troubleshooting

**"Wrong password" error:**
- You entered a different password than before
- Note: The same password must be used on all devices
- If you forget the password, your cloud data cannot be recovered (zero-knowledge design)

**"Sync error" / "offline":**
- Check your internet connection
- For errors, click the retry button (↺)
- Sync is fire-and-forget; local data is always saved first

**Nothing appears in Dropbox:**
- Check that your redirect URI matches exactly (including trailing slash)
- Make sure the app folder setting is correct
- Look for `orbit-sync/` folder inside your Dropbox app folder

**Auto-sync not working:**
- Make sure "Enable Sync" toggle is on in the sync modal
- Verify the password is entered (sync shows as "locked" if not)
- Check the status indicator in the hamburger menu

## Architecture Notes

- Sync is **optional** — works alongside local file sync
- Local file is **authoritative** — if you have a local file connected, cloud sync is skipped
- Notebooks are **independent** — each notebook can have its own encrypted sync status
- Settings are **synchronized** — settings changes sync along with notebook data

## Files Modified

- `js/sync-crypto.js` — New: cryptography module
- `js/sync-dropbox.js` — New: Dropbox OAuth + file I/O
- `js/sync.js` — New: coordinator module
- `js/state.js` — Modified: push on save, pull on load
- `js/app.js` — Modified: OAuth callback handling
- `js/modals.js` — Modified: sync modal UI
- `js/notebooks.js` — Modified: sync status on notebook switch
- `js/shortcuts.js` — Modified: escape key to close sync modal
- `index.html` — Modified: script tags, sync modal HTML, settings row
- `css/topbar.css` — Modified: new dot styles
