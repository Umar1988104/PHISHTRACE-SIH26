# PHISHTRACE — AI-Powered Email Threat Detection, GeoLocation & Forensic Intelligence Platform

Built for Smart India Hackathon 2026.

## Problem Statement
AI-Powered Email Threat Detection, GeoLocation and Forensic Intelligence Platform — detecting phishing, spoofing, and business-email-compromise (BEC) attacks, and tracing the probable origin of the sending infrastructure.

## What this MVP does
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

## Tech Stack
- Frontend: HTML, CSS, JavaScript (no framework, no build step)
- Backend: Node.js + Express (`server/`) — holds the one admin Gemini key, handles login/signup (bcrypt + JWT), and serves the frontend itself so there's only one thing to run
- Data storage: a small JSON file (`server/data.json`, auto-created, gitignored) for user accounts and case history — deliberately simple so an all-beginner team needs zero native dependencies or external database service to run this locally; swapping it for a real SQL database later only means rewriting `server/db.js`
- Google Gemini API (`gemini-3.6-flash`) for fraud classification and forensic report generation — prompt-engineered, no ML model training. Prompts now live in `server/gemini.js`
- ipapi.co / ipwho.is for free IP geolocation (still called directly from the browser — no key needed)
- Leaflet.js for map rendering

## Files
- `index.html`, `style.css`, `app.js` — frontend: page structure, styling, UI logic, and calls to the backend API
- `server/server.js` — Express app: serves the frontend and exposes `/api/signup`, `/api/login`, `/api/analyze`, `/api/history`
- `server/db.js` — the JSON-file data layer (users + history)
- `server/auth.js` — password hashing and JWT login-token handling
- `server/gemini.js` — the fraud-classification prompts and the one call to the Gemini API (the admin key lives only here)
- `server/.env.example` — copy to `server/.env` and fill in your own `GEMINI_API_KEY` and `JWT_SECRET` (`.env` is gitignored — never commit it)

## How to run
1. Clone or download this repo
2. Open a terminal in the `server/` folder and run `npm install`
3. Copy `server/.env.example` to `server/.env` and fill in:
   - `GEMINI_API_KEY` — a free key from aistudio.google.com/apikey (the ONE admin key for everyone using this deployment)
   - `JWT_SECRET` — any long random string
4. Run `npm start` (or `node server.js`) from inside `server/`
5. Open `http://localhost:3000` in a browser — the server serves the whole site
6. Sign up for an account (top-right profile icon) to unlock case history, or just start analyzing without one
7. Click **"Load a sample phishing email"** on any tab to see a working demo, or paste your own email/link/message

## MVP Scope
Included: Email/Link/Message tabbed input, header parsing, IP/geo extraction, SPF/DKIM/DMARC checks, link domain/heuristic analysis, AI fraud scoring for all three modes, forensic report generation, relay trace visualization, progressive-disclosure results UI, real accounts (signup/login) with server-side case history, English/Hindi UI language switch, single admin-managed Gemini key.

Not yet included (future scope): WHOIS/DNS deep lookups, threat-intel/blacklist correlation, graph-based multi-email attribution, chain-of-custody/evidence handling, real-time inbox monitoring, browser extension.

## Team
Team PhishTrace
