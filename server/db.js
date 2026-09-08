/* =========================================================
   PHISHTRACE — Version 4 data layer (MongoDB Atlas via Mongoose)
   =========================================================
   Same exported functions as the old JSON-file db.js, so server.js barely
   had to change — but now data actually persists on a real, always-on
   database that works no matter where the backend is hosted (this is what
   makes public deployment on Render/Netlify possible; a local JSON file or
   SQLite file would not survive on most free hosts).

   Get a free connection string at https://www.mongodb.com/cloud/atlas/register
   (free "M0" tier, no credit card required) and put it in server/.env as
   MONGODB_URI. See server/.env.example for the exact format.
   ========================================================= */
const mongoose = require('mongoose');

async function connect() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('✗ MONGODB_URI is not set in server/.env — see .env.example.');
    process.exit(1);
  }
  await mongoose.connect(uri);
  console.log('✓ Connected to MongoDB');
}

/* ---------- Schemas ---------- */
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const historySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  mode: String,
  subject: String,
  score: Number,
  ts: { type: Date, default: Date.now }
});

const flaggedCaseSchema = new mongoose.Schema({
  mode: String,               // 'email' | 'link' | 'message'
  subject: String,            // short label shown in the reviewer list
  score: Number,
  verdict: String,
  evidence: mongoose.Schema.Types.Mixed, // whatever the frontend had for that mode
  status: { type: String, default: 'pending' }, // 'pending' | 'reviewed'
  reviewerVerdict: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const History = mongoose.model('History', historySchema);
const FlaggedCase = mongoose.model('FlaggedCase', flaggedCaseSchema);

/* ---------- Users ---------- */
async function findUserByEmail(email) {
  return User.findOne({ email: email.toLowerCase() });
}

async function findUserById(id) {
  try {
    return await User.findById(id);
  } catch (e) {
    return null; // invalid ObjectId format, e.g. a stale/tampered token
  }
}

async function createUser({ name, email, passwordHash }) {
  return User.create({ name, email, passwordHash });
}

/* ---------- History ---------- */
async function getHistoryForUser(userId) {
  return History.find({ userId }).sort({ ts: -1 }).limit(50);
}

async function addHistoryEntry(userId, entry) {
  return History.create({ userId, mode: entry.mode, subject: entry.subject, score: entry.score });
}

/* ---------- Flagged cases (Version 7 — manual review queue) ---------- */
async function createFlaggedCase({ mode, subject, score, verdict, evidence }) {
  return FlaggedCase.create({ mode, subject, score, verdict, evidence });
}

async function getPendingFlaggedCases() {
  return FlaggedCase.find({ status: 'pending' }).sort({ createdAt: -1 }).limit(100);
}

async function resolveFlaggedCase(id, reviewerVerdict) {
  return FlaggedCase.findByIdAndUpdate(id, { status: 'reviewed', reviewerVerdict }, { new: true });
}

module.exports = {
  connect, findUserByEmail, findUserById, createUser, getHistoryForUser, addHistoryEntry,
  createFlaggedCase, getPendingFlaggedCases, resolveFlaggedCase
};
