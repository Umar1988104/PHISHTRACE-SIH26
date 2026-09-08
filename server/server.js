/* =========================================================
   PHISHTRACE — Version 4 backend
   =========================================================
   Run with: npm install && npm start   (from inside the server/ folder)
   Serves the site AND the API from one process/one port. See
   server/.env.example for required setup (Gemini key, JWT secret, and now
   a MongoDB connection string).
   ========================================================= */
require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const db = require('./db');
const { hashPassword, verifyPassword, signToken, requireAuth } = require('./auth');
const gemini = require('./gemini');
const visitors = require('./visitors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '2mb' }));

/* ---------- Rate limiting ---------- */
// Generous limit for normal use, tight enough to stop one browser/script from
// hammering the server (and burning through the shared Gemini quota) if many
// people are using the site at once.
const analyzeLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 12,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many checks from this device in a short time — please wait a minute and try again.' }
});
// Stricter limit on auth routes specifically, to slow down password-guessing attempts.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts — please wait a few minutes and try again.' }
});

/* ---------- Auth: signup / login / me ---------- */
app.post('/api/signup', authLimiter, async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email, and password are all required.' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    if (await db.findUserByEmail(email)) return res.status(409).json({ error: 'An account with this email already exists.' });

    const user = await db.createUser({ name, email, passwordHash: hashPassword(password) });
    res.json({ token: signToken(user), name: user.name });
  } catch (e) {
    console.error('Signup error:', e.message);
    res.status(500).json({ error: 'Could not create account — please try again.' });
  }
});

app.post('/api/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });

    const user = await db.findUserByEmail(email);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ error: 'Incorrect email or password.' });
    }
    res.json({ token: signToken(user), name: user.name });
  } catch (e) {
    console.error('Login error:', e.message);
    res.status(500).json({ error: 'Could not log in — please try again.' });
  }
});

app.get('/api/me', requireAuth, (req, res) => {
  res.json({ name: req.user.name, email: req.user.email });
});

/* ---------- Fraud classification (the admin's Gemini key never leaves this file) ---------- */
app.post('/api/analyze', analyzeLimiter, async (req, res) => {
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
app.get('/api/history', requireAuth, async (req, res) => {
  try {
    res.json(await db.getHistoryForUser(req.user.id));
  } catch (e) {
    console.error('History fetch error:', e.message);
    res.status(500).json({ error: 'Could not load history.' });
  }
});

app.post('/api/history', requireAuth, async (req, res) => {
  try {
    const { mode, subject, score } = req.body || {};
    await db.addHistoryEntry(req.user.id, { mode, subject, score });
    res.json({ ok: true });
  } catch (e) {
    console.error('History save error:', e.message);
    res.status(500).json({ error: 'Could not save history entry.' });
  }
});

/* ---------- Version 7: verdict-triggered actions ---------- */
// Ambiguous score (roughly 40-60) -> user can send the case to the team for a human look.
app.post('/api/flag', analyzeLimiter, async (req, res) => {
  try {
    const { mode, subject, score, verdict, evidence } = req.body || {};
    if (!mode || score === undefined) return res.status(400).json({ error: 'Missing case data.' });
    await db.createFlaggedCase({ mode, subject, score, verdict, evidence });
    res.json({ ok: true });
  } catch (e) {
    console.error('Flag error:', e.message);
    res.status(500).json({ error: 'Could not submit this case for review.' });
  }
});

// Simple internal endpoints for the team to see/clear the queue (no dashboard UI yet —
// protected by a shared admin key so random visitors can't read flagged case content).
function requireAdmin(req, res, next) {
  const key = req.headers['x-admin-key'];
  if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Missing or incorrect admin key.' });
  }
  next();
}
app.get('/api/flags', requireAdmin, async (req, res) => {
  try {
    res.json(await db.getPendingFlaggedCases());
  } catch (e) {
    res.status(500).json({ error: 'Could not load flagged cases.' });
  }
});
app.post('/api/flags/:id/resolve', requireAdmin, async (req, res) => {
  try {
    const { reviewerVerdict } = req.body || {};
    res.json(await db.resolveFlaggedCase(req.params.id, reviewerVerdict || 'Reviewed'));
  } catch (e) {
    res.status(500).json({ error: 'Could not update this case.' });
  }
});

/* ---------- Live visitor counter (simple heartbeat — see visitors.js) ---------- */
app.post('/api/visitors/ping', (req, res) => {
  const { sessionId } = req.body || {};
  if (!sessionId) return res.status(400).json({ error: 'Missing sessionId.' });
  res.json({ count: visitors.ping(sessionId) });
});
app.get('/api/visitors', (req, res) => {
  res.json({ count: visitors.getCount() });
});

/* ---------- Serve the frontend (index.html / app.js / style.css) from the parent folder ---------- */
const FRONTEND_DIR = path.join(__dirname, '..');
app.use(express.static(FRONTEND_DIR));
app.get('/', (req, res) => res.sendFile(path.join(FRONTEND_DIR, 'index.html')));

async function start() {
  await db.connect();
  app.listen(PORT, () => {
    console.log(`PhishTrace server running at http://localhost:${PORT}`);
    if (!process.env.GEMINI_API_KEY) {
      console.warn('⚠ GEMINI_API_KEY is not set in server/.env — AI classification will fail until it is.');
    }
  });
}

start().catch(err => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
