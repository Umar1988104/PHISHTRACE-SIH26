/* =========================================================
   PHISHTRACE — Version 3 backend
   =========================================================
   Run with: npm install && npm start   (from inside the server/ folder)
   Serves the site AND the API from one process/one port, so there's only
   one thing to start locally. See server/.env.example for required setup.
   ========================================================= */
require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');

const db = require('./db');
const { hashPassword, verifyPassword, signToken, requireAuth } = require('./auth');
const gemini = require('./gemini');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '2mb' }));

/* ---------- Auth: signup / login / me ---------- */
app.post('/api/signup', (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ error: 'Name, email, and password are all required.' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  if (db.findUserByEmail(email)) return res.status(409).json({ error: 'An account with this email already exists.' });

  const user = db.createUser({ name, email, passwordHash: hashPassword(password) });
  res.json({ token: signToken(user), name: user.name });
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });

  const user = db.findUserByEmail(email);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Incorrect email or password.' });
  }
  res.json({ token: signToken(user), name: user.name });
});

app.get('/api/me', requireAuth, (req, res) => {
  res.json({ name: req.user.name, email: req.user.email });
});

/* ---------- Fraud classification (the admin's Gemini key never leaves this file) ---------- */
app.post('/api/analyze', async (req, res) => {
  const { mode, ...payload } = req.body || {};
  if (!['email', 'link', 'message'].includes(mode)) {
    return res.status(400).json({ error: 'Invalid mode.' });
  }
  try {
    const result = await gemini.classify(mode, payload);
    res.json(result);
  } catch (e) {
    console.error('Classification error:', e.message);
    const status = e.code === 'NO_SERVER_KEY' ? 503 : 502;
    res.status(status).json({ error: e.message });
  }
});

/* ---------- Case history (requires login — this is what makes history follow the
   user across devices instead of being stuck in one browser's localStorage) ---------- */
app.get('/api/history', requireAuth, (req, res) => {
  res.json(db.getHistoryForUser(req.user.id));
});

app.post('/api/history', requireAuth, (req, res) => {
  const { mode, subject, score } = req.body || {};
  db.addHistoryEntry(req.user.id, { mode, subject, score });
  res.json({ ok: true });
});

/* ---------- Serve the frontend (index.html / app.js / style.css) from the parent folder ---------- */
const FRONTEND_DIR = path.join(__dirname, '..');
app.use(express.static(FRONTEND_DIR));
app.get('/', (req, res) => res.sendFile(path.join(FRONTEND_DIR, 'index.html')));

app.listen(PORT, () => {
  console.log(`PhishTrace server running at http://localhost:${PORT}`);
  if (!process.env.GEMINI_API_KEY) {
    console.warn('⚠ GEMINI_API_KEY is not set in server/.env — AI classification will fail until it is.');
  }
});
