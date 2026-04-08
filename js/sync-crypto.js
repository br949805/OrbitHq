// ── sync-crypto.js ─────────────────────────────────────────────
// End-to-end encryption for cloud sync using Web Crypto API.
// Pure utility module — no DOM, no app state dependencies.
// PBKDF2 key derivation + AES-GCM 256-bit encryption.
// ──────────────────────────────────────────────────────────────

// ── Base64 Helpers ───────────────────────────────────────────

function b64Encode(uint8) {
  let binary = '';
  for (let i = 0; i < uint8.length; i++) {
    binary += String.fromCharCode(uint8[i]);
  }
  return btoa(binary);
}

function b64Decode(str) {
  const binary = atob(str);
  const uint8 = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    uint8[i] = binary.charCodeAt(i);
  }
  return uint8;
}

// ── Key Derivation (PBKDF2) ──────────────────────────────────

async function deriveKey(password, salt) {
  // password: string
  // salt: Uint8Array or base64 string
  // returns: CryptoKey (AES-GCM 256-bit)

  if (typeof salt === 'string') {
    salt = b64Decode(salt);
  }

  const passwordBuffer = new TextEncoder().encode(password);
  const baseKey = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: salt,
      iterations: 100000
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  return derivedKey;
}

// ── Encryption ───────────────────────────────────────────────

async function encryptData(plaintext, password, salt = null) {
  // plaintext: string (the data to encrypt)
  // password: string (user-provided password)
  // salt: Uint8Array or null (if null, generate new)
  // returns: { salt: base64, iv: base64, data: base64 }

  // Generate salt if not provided
  if (!salt) {
    salt = crypto.getRandomValues(new Uint8Array(16));
  }
  if (typeof salt === 'string') {
    salt = b64Decode(salt);
  }

  // Derive key from password + salt
  const key = await deriveKey(password, salt);

  // Generate random IV (12 bytes for AES-GCM)
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Encrypt
  const plaintextBuffer = new TextEncoder().encode(plaintext);
  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    plaintextBuffer
  );

  // Encode as base64
  return {
    salt: b64Encode(salt),
    iv: b64Encode(iv),
    data: b64Encode(new Uint8Array(ciphertextBuffer))
  };
}

// ── Decryption ───────────────────────────────────────────────

async function decryptData(envelope, password) {
  // envelope: { salt: base64, iv: base64, data: base64 }
  // password: string
  // returns: string (decrypted plaintext) or throws on failure

  const salt = b64Decode(envelope.salt);
  const iv = b64Decode(envelope.iv);
  const ciphertextBuffer = b64Decode(envelope.data).buffer;

  // Derive key using same password + salt
  const key = await deriveKey(password, salt);

  // Decrypt
  const plaintextBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    ciphertextBuffer
  );

  return new TextDecoder().decode(plaintextBuffer);
}
