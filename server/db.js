/* =========================================================
   PHISHTRACE — Version 3 data layer
   =========================================================
   A small JSON-file database. It's deliberately simple: one file on disk
   (data.json, gitignored) holding two lists — users and history entries.
   This is what makes history follow a logged-in user across devices instead
   of being stuck in one browser's localStorage (the Version 1/2 approach).

   It's not a full SQL engine — that's a fair trade for an all-beginner team
   that needs zero native dependencies and zero external services to run this
   locally. The read/write functions below are the only place that touches
   the file, so swapping this for a real SQL database later (e.g. Postgres)
   only means rewriting this one file — nothing in server.js has to change.
   ========================================================= */
const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'data.json');

function loadData() {
  if (!fs.existsSync(DB_FILE)) {
    return { users: [], history: [] };
  }
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (e) {
    console.error('Failed to read data.json, starting fresh:', e.message);
    return { users: [], history: [] };
  }
}

function saveData(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

/* ---------- Users ---------- */
function findUserByEmail(email) {
  const data = loadData();
  return data.users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
}

function findUserById(id) {
  const data = loadData();
  return data.users.find(u => u.id === id) || null;
}

function createUser({ name, email, passwordHash }) {
  const data = loadData();
  const user = { id: 'u_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8), name, email, passwordHash, createdAt: Date.now() };
  data.users.push(user);
  saveData(data);
  return user;
}

/* ---------- History ---------- */
function getHistoryForUser(userId) {
  const data = loadData();
  return data.history
    .filter(h => h.userId === userId)
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 50);
}

function addHistoryEntry(userId, entry) {
  const data = loadData();
  data.history.push({ userId, ...entry, ts: entry.ts || Date.now() });
  saveData(data);
}

module.exports = { findUserByEmail, findUserById, createUser, getHistoryForUser, addHistoryEntry };
