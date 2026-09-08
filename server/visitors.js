/* =========================================================
   PHISHTRACE — Version 4 live visitor counter
   =========================================================
   Deliberately simple: each open tab pings this every ~15s with a random
   session ID (generated client-side, kept in sessionStorage). A visitor
   counts as "active" if their last ping was within the last 30 seconds.
   This is in-memory only (resets if the server restarts) — fine for a
   "how many people are on the site right now" stat, not meant to be a
   permanent record (that's what History is for).
   ========================================================= */
const ACTIVE_WINDOW_MS = 30 * 1000;
const lastSeen = new Map(); // sessionId -> timestamp

function ping(sessionId) {
  lastSeen.set(sessionId, Date.now());
  return getCount();
}

function getCount() {
  const cutoff = Date.now() - ACTIVE_WINDOW_MS;
  for (const [id, ts] of lastSeen) {
    if (ts < cutoff) lastSeen.delete(id);
  }
  return lastSeen.size;
}

module.exports = { ping, getCount };
