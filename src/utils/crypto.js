/**
 * AES-256-GCM encryption for connection export files.
 * Key derivation: PBKDF2-SHA-256, 200 000 iterations.
 * Works in both Electron and web/Docker (Web Crypto API).
 */

const EXPORT_TYPE = 'netsqlazman-connections-v1'

function b64(buf) { return btoa(String.fromCharCode(...new Uint8Array(buf))) }
function unb64(s)  { return Uint8Array.from(atob(s), (c) => c.charCodeAt(0)) }

async function deriveKey(passphrase, salt, usage) {
  const raw = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 200_000, hash: 'SHA-256' },
    raw,
    { name: 'AES-GCM', length: 256 },
    false,
    [usage]
  )
}

/**
 * Encrypt an array of connection objects with a passphrase.
 * Returns a JSON-serialisable object with _type marker.
 */
export async function encryptConnections(connections, passphrase) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv   = crypto.getRandomValues(new Uint8Array(12))
  const key  = await deriveKey(passphrase, salt, 'encrypt')
  const ct   = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(JSON.stringify(connections))
  )
  return { _type: EXPORT_TYPE, salt: b64(salt), iv: b64(iv), data: b64(ct) }
}

/**
 * Decrypt an encrypted export object.
 * Throws DOMException if the passphrase is wrong.
 */
export async function decryptConnections(payload, passphrase) {
  if (payload._type !== EXPORT_TYPE) throw new Error('Unknown file format')
  const salt = unb64(payload.salt)
  const iv   = unb64(payload.iv)
  const ct   = unb64(payload.data)
  const key  = await deriveKey(passphrase, salt, 'decrypt')
  const pt   = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct)
  return JSON.parse(new TextDecoder().decode(pt))
}

/** Returns true if a parsed JSON object looks like an encrypted export. */
export function isEncryptedExport(obj) {
  return obj && obj._type === EXPORT_TYPE
}
