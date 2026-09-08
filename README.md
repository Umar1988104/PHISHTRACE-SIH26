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
- Keeps a local case history of analyzed items, tagged by mode
- **Progressive-disclosure results:** a one-line verdict with an icon appears first; a "See full details" toggle reveals the score gauge, red flags, header/geo/trace panels, and full report
- **Optional login:** a profile icon unlocks personal case history as a convenience — never required to use the core checking feature. This is a client-side-only account (name stored in this browser) until the Version 3 backend adds real accounts
- **Multilingual UI:** switch between English and Hindi via the language selector in the header — this also changes the language Gemini writes the summary/red flags/forensic report in (the verdict category itself stays a fixed internal value so scoring logic is unaffected)

## Tech Stack
- HTML, CSS, JavaScript (no framework, no build step)
- Google Gemini API (`gemini-3.6-flash`) for fraud classification and forensic report generation — prompt-engineered, no ML model training
- ipapi.co for free IP geolocation
- Leaflet.js for map rendering

## Files
- `index.html` — page structure
- `style.css` — all styling
- `app.js` — header parsing, geolocation, Gemini API calls, rendering logic

## How to run
This is a fully static, client-side app — no backend, no build step.

1. Clone or download this repo
2. Open `index.html` directly in a browser (double-click it, or run a simple local server, e.g. `python3 -m http.server`, then visit `localhost:8000`)
3. Click the ⚙ **API Key** button, top right, and paste your own free Gemini API key (get one at aistudio.google.com/apikey) — it's stored only in your browser's localStorage
4. Click **"Load a sample phishing email"** to see a working demo, or paste any raw email source (e.g. from Gmail's "Show original")
5. Click **Analyze Email**

## MVP Scope
Included: Email/Link/Message tabbed input, header parsing, IP/geo extraction, SPF/DKIM/DMARC checks, link domain/heuristic analysis, AI fraud scoring for all three modes, forensic report generation, relay trace visualization, progressive-disclosure results UI, optional client-side login gating case history, English/Hindi UI language switch.

Not yet included (future scope): WHOIS/DNS deep lookups, threat-intel/blacklist correlation, graph-based multi-email attribution, chain-of-custody/evidence handling, real-time inbox monitoring, real backend accounts/database, shared backend API key.

## Team
Team PhishTrace
