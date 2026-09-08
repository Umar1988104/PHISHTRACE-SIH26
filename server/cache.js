/* =========================================================
   PHISHTRACE — Version 4 result cache
   =========================================================
   If two people (or one person twice) check the exact same email/link/
   message, there's no reason to pay for and wait on a second Gemini call —
   the answer will be the same. This is a simple in-memory cache keyed by a
   hash of (mode + language + the evidence sent to Gemini), with a TTL so
   entries don't live forever. In-memory is fine here: a cache miss just
   means "call Gemini like normal", so losing the cache on a server restart
   costs nothing but a few slower requests, not correctness.
   ========================================================= */
const crypto = require('crypto');

const TTL_MS = 30 * 60 * 1000; // 30 minutes
const MAX_ENTRIES = 500;       // simple cap so this can never grow unbounded

const store = new Map(); // key -> { result, expiresAt }

function keyFor(mode, lang, payload) {
  const raw = JSON.stringify({ mode, lang, payload });
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function get(mode, lang, payload) {
  const key = keyFor(mode, lang, payload);
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.result;
}

function set(mode, lang, payload, result) {
  const key = keyFor(mode, lang, payload);
  if (store.size >= MAX_ENTRIES) {
    // Evict the oldest entry (Maps preserve insertion order) rather than growing forever.
    const oldestKey = store.keys().next().value;
    store.delete(oldestKey);
  }
  store.set(key, { result, expiresAt: Date.now() + TTL_MS });
}

module.exports = { get, set };
