# PHISHTRACE — AI-Powered Email Threat Detection, GeoLocation & Forensic Intelligence Platform

Built for Smart India Hackathon 2026.

## Problem Statement
AI-Powered Email Threat Detection, GeoLocation and Forensic Intelligence Platform — detecting phishing, spoofing, and business-email-compromise (BEC) attacks, and tracing the probable origin of the sending infrastructure.

## What PhishTrace does
Three tabs on one input box — Email, Link, and Message — each using detection logic honest to what evidence actually exists for that input type:

- **Email mode:** parses the `Received:` relay chain to extract the originating IP, validates SPF/DKIM/DMARC authentication results, geolocates the origin IP and plots it on a map
- **Link mode:** parses the URL's domain/host structure and flags heuristics — raw-IP hostnames, punycode, known shorteners, suspicious keywords, brand-impersonation signals in the hostname (no headers or geolocation exist for a bare link)
- **Message mode:** no headers or domain to inspect, so detection is pure AI language-pattern analysis (urgency cues, fake KYC/OTP/prize language)
- All three modes finish with an AI-powered fraud classification (Gemini API) producing a risk score, verdict, red flags, and a written forensic report
- Case history is stored server-side per account, so it now follows a logged-in user across devices instead of being stuck in one browser
- **Progressive-disclosure results:** a one-line verdict with an icon appears first; a "See full details" toggle reveals the score gauge, red flags, header/geo/trace panels, and full report
- **Real accounts:** sign up / log in (name, email, password) to unlock personal case history — still never required to use the core checking feature
- **Multilingual UI:** switch between English and Hindi via the language selector in the header — this also changes the language Gemini writes the summary/red flags/forensic report in (the verdict category itself stays a fixed internal value so scoring logic is unaffected)
- **Single admin-managed Gemini key:** end users never see or enter any API key — one key lives privately on the server (`server/.env`) and every request routes through it
- **Real database:** accounts and case history are stored in MongoDB (not a local file), so they survive server restarts and work no matter where the backend is hosted
- **Caching + rate limiting + a request queue:** identical repeat checks are served from a short-lived cache instead of re-calling Gemini; per-device rate limits stop one user from overwhelming the shared Gemini quota; a small queue caps how many Gemini calls run at once so a burst of simultaneous users doesn't get rejected
- **Live visitor counter:** shows how many people are on the site right now (simple heartbeat-based, no accounts needed)
- **Geolocation trust signals:** the origin IP is now checked against two independent geolocation providers and flagged if they disagree; VPN/proxy/Tor/hosting-datacenter IPs are flagged with a clear warning that the shown location is likely not the attacker's real one
- **True multilingual detection:** scam content itself may be in English, Hindi, or Hinglish (code-mixed) — detection now explicitly handles this regardless of UI language, and shows a "detected input language" line on the verdict
- **QR code ("quishing") detection:** in Link mode, scan a QR code image instead of pasting a URL — decoded entirely in the browser, then runs through the same link-analysis pipeline

## Tech Stack
- Frontend: HTML, CSS, JavaScript (no framework, no build step); jsQR for client-side QR decoding
- Backend: Node.js + Express (`server/`) — holds the one admin Gemini key, handles login/signup (bcrypt + JWT), rate limiting, request queueing, caching, and serves the frontend itself so there's only one thing to run
- Data storage: MongoDB Atlas (free tier) via Mongoose — real, always-on database for user accounts and case history, works regardless of where the backend ends up hosted
- Google Gemini API (`gemini-3.6-flash`) for fraud classification and forensic report generation — prompt-engineered, no ML model training. Prompts now live in `server/gemini.js`, wrapped by a caching layer (`server/cache.js`) and a concurrency queue (`server/queue.js`)
- ipapi.co / ipwho.is for free IP geolocation, cross-checked against each other, with VPN/proxy/hosting detection from ipwho.is's free security data
- Leaflet.js for map rendering

## Files
- `index.html`, `style.css`, `app.js` — frontend: page structure, styling, UI logic, and calls to the backend API
- `start.bat` — double-click to start the server and auto-open the site (Windows)
- `server/server.js` — Express app: serves the frontend and exposes `/api/signup`, `/api/login`, `/api/analyze`, `/api/history`, `/api/visitors`
- `server/db.js` — the MongoDB/Mongoose data layer (users + history)
- `server/auth.js` — password hashing and JWT login-token handling
- `server/gemini.js` — the fraud-classification prompts and the one call to the Gemini API (the admin key lives only here)
- `server/cache.js` — short-lived cache for repeat identical checks
- `server/queue.js` — limits how many Gemini calls run at once
- `server/visitors.js` — live visitor counter (heartbeat-based)
- `server/.env.example` — copy to `server/.env` and fill in your own `GEMINI_API_KEY`, `JWT_SECRET`, and `MONGODB_URI` (`.env` is gitignored — never commit it)

## How to run
1. Clone or download this repo
2. Create a free MongoDB Atlas cluster at mongodb.com/cloud/atlas/register (M0 tier, no credit card) and grab its connection string
3. Open a terminal in the `server/` folder and run `npm install`
4. Copy `server/.env.example` to `server/.env` and fill in:
   - `GEMINI_API_KEY` — a free key from aistudio.google.com/apikey (the ONE admin key for everyone using this deployment)
   - `JWT_SECRET` — any long random string
   - `MONGODB_URI` — your Atlas connection string from step 2
5. Double-click `start.bat` (Windows) — or run `npm start` from inside `server/` — this starts the server and opens `http://localhost:3000`
6. Sign up for an account (top-right profile icon) to unlock case history, or just start analyzing without one
7. Click **"Load a sample phishing email"** on any tab to see a working demo, or paste your own email/link/message — or scan a QR code in Link mode

## Feature Scope
Included: Email/Link/Message tabbed input (with QR code scanning in Link mode), header parsing, IP/geo extraction with cross-checked providers and VPN/hosting flagging, SPF/DKIM/DMARC checks, link domain/heuristic analysis, AI fraud scoring for all three modes with true multilingual (English/Hindi/Hinglish) content detection, forensic report generation, relay trace visualization, progressive-disclosure results UI, real accounts (signup/login) with MongoDB-backed case history, English/Hindi UI language switch, single admin-managed Gemini key, response caching, rate limiting, request queueing, live visitor counter, borderline-score human review queue with an admin dashboard, and a cyber-crime complaint draft generator for high-confidence phishing cases.

Not yet included (future scope): WHOIS/DNS deep lookups, threat-intel/blacklist correlation, graph-based multi-email attribution, chain-of-custody/evidence handling, real-time inbox monitoring, browser extension, community-confirmed scam blocklist, public deployment (Render/Netlify).

## Team
Team PhishTrace
