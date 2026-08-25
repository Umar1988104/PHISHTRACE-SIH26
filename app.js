/* =========================================================
   PHISHTRACE — MVP logic (single file, Gemini API)
   ========================================================= */
const el = (id) => document.getElementById(id);

/* ---------- API key modal ---------- */
const apiModal = el('apiModal');
el('apiKeyBtn').onclick = () => {
  el('apiKeyInput').value = localStorage.getItem('phishtrace_gemini_key') || '';
  apiModal.style.display = 'flex';
};
el('apiCancel').onclick = () => apiModal.style.display = 'none';
el('apiSave').onclick = () => {
  const key = el('apiKeyInput').value.trim();
  if (key) localStorage.setItem('phishtrace_gemini_key', key);
  apiModal.style.display = 'none';
};

/* ---------- Sample email ---------- */
const SAMPLE_EMAIL = `Delivered-To: victim@examplecorp.in
Received: by 2002:a05:6402:1234:b0:512:abcd:ef01 with SMTP id x1csp1234abc;
        Mon, 25 Aug 2026 03:12:44 -0700 (PDT)
Received: from mail-relay-203.freehostserver.ru (mail-relay-203.freehostserver.ru [185.220.101.47])
        by mx.google.com with ESMTPS id y9-20020a170902abcd
        for <victim@examplecorp.in>;
        Mon, 25 Aug 2026 03:12:43 -0700 (PDT)
Received: from localhost (unknown [10.0.0.5])
        by mail-relay-203.freehostserver.ru (Postfix) with ESMTP id 4A1B2C3D4E
        for <victim@examplecorp.in>; Mon, 25 Aug 2026 10:12:40 +0000 (UTC)
Return-Path: <accounts-update@hdfcbank-secure.info>
From: "HDFC Bank Security" <accounts-update@hdfcbank-secure.info>
Reply-To: hdfc.verify.team@protonmail.com
To: victim@examplecorp.in
Subject: URGENT: Your KYC has been suspended - Verify within 24 hours
Date: Mon, 25 Aug 2026 10:12:38 +0000
Message-ID: <9f8e7d6c5b4a@freehostserver.ru>
DKIM-Signature: v=1; a=rsa-sha256; d=freehostserver.ru; s=default; bh=abc123; h=From:To:Subject; b=invalid
Authentication-Results: mx.google.com;
       dkim=fail (bad signature) header.d=hdfcbank-secure.info;
       spf=softfail (google.com: domain of accounts-update@hdfcbank-secure.info does not designate 185.220.101.47 as permitted sender);
       dmarc=fail (p=NONE sp=NONE dis=NONE) header.from=hdfcbank-secure.info
Content-Type: text/html; charset=UTF-8

Dear Customer,

Your KYC verification has expired and your account access will be permanently suspended within 24 hours.

Click here immediately to verify your details and avoid suspension:
http://hdfc-kyc-verify.secure-bank-update.info/login?ref=8827aa

Failure to verify will result in permanent blocking of your account and reporting to RBI.

Regards,
HDFC Bank Security Team`;

el('loadSample').onclick = () => { el('emailInput').value = SAMPLE_EMAIL; };

/* ---------- History (localStorage) ---------- */
function getHistory(){ return JSON.parse(localStorage.getItem('phishtrace_history') || '[]'); }
function saveHistory(entry){
  const h = getHistory();
  h.unshift(entry);
  localStorage.setItem('phishtrace_history', JSON.stringify(h.slice(0, 20)));
  renderHistory();
}
function renderHistory(){
  const h = getHistory();
  el('statCount').textContent = h.length;
  el('statFlagged').textContent = h.filter(x => x.score >= 50).length;
  if (!h.length) { el('historyPanel').style.display = 'none'; return; }
  el('historyPanel').style.display = 'block';
  el('historyList').innerHTML = h.map(item => `
    <div class="history-item">
      <span>${escapeHtml(item.subject || '(no subject)')}</span>
      <span class="h-score" style="color:${scoreColor(item.score)}">${item.score}</span>
    </div>`).join('');
}
function escapeHtml(s){ return (s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function scoreColor(score){
  if (score >= 70) return 'var(--alert)';
  if (score >= 35) return 'var(--warn)';
  return 'var(--safe)';
}

/* =========================================================
   1. HEADER PARSING
   ========================================================= */
function parseHeaders(raw) {
  const headerBlockEnd = raw.search(/\n\s*\n/);
  const headerBlock = headerBlockEnd !== -1 ? raw.slice(0, headerBlockEnd) : raw;

  const get = (name) => {
    const re = new RegExp('^' + name + ':\\s*(.+(?:\\n[ \\t].+)*)', 'im');
    const m = headerBlock.match(re);
    return m ? m[1].replace(/\n[ \t]+/g, ' ').trim() : null;
  };

  const receivedMatches = [...headerBlock.matchAll(/^Received:\s*([\s\S]*?)(?=^\S+:|\s*$(?![\s\S]))/gim)]
    .map(m => m[1].replace(/\n[ \t]+/g, ' ').trim());

  const from = get('From');
  const returnPath = get('Return-Path');
  const replyTo = get('Reply-To');
  const messageId = get('Message-ID');
  const subject = get('Subject') || '(no subject)';
  const authResults = get('Authentication-Results');
  const dkimSig = get('DKIM-Signature');

  const ipRegex = /\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b/g;
  const relayHops = receivedMatches.map((line, idx) => {
    const ips = [...line.matchAll(ipRegex)].map(m => m[1]).filter(ip => !isPrivateIp(ip));
    const fromMatch = line.match(/from\s+([^\s]+)/i);
    const byMatch = line.match(/by\s+([^\s]+)/i);
    return { index: idx, raw: line, host: fromMatch ? fromMatch[1] : null, by: byMatch ? byMatch[1] : null, ip: ips.length ? ips[0] : null };
  });

  let originIp = null;
  for (let i = relayHops.length - 1; i >= 0; i--) {
    if (relayHops[i].ip) { originIp = relayHops[i].ip; break; }
  }

  const authStatus = (mechanism) => {
    if (!authResults) return 'unknown';
    const re = new RegExp(mechanism + '\\s*=\\s*(\\w+)', 'i');
    const m = authResults.match(re);
    return m ? m[1].toLowerCase() : 'unknown';
  };

  return {
    from, returnPath, replyTo, messageId, subject,
    spf: authStatus('spf'), dkim: authStatus('dkim'), dmarc: authStatus('dmarc'),
    hasDkimSignature: !!dkimSig, relayHops, originIp,
    bodyText: headerBlockEnd !== -1 ? raw.slice(headerBlockEnd).trim() : ''
  };
}

function isPrivateIp(ip) {
  return /^10\.|^172\.(1[6-9]|2\d|3[0-1])\.|^192\.168\.|^127\.|^0\.0\.0\.0$/.test(ip);
}

function extractDomain(addr) {
  if (!addr) return null;
  const m = addr.match(/@([\w.-]+)/);
  return m ? m[1].toLowerCase() : null;
}

/* =========================================================
   2. GEOLOCATION (ipapi.co — free, CORS-enabled)
   ========================================================= */
async function geolocateIp(ip) {
  if (!ip) return null;

  // Primary: ipwho.is (free, HTTPS, CORS-enabled, no key needed)
  try {
    const res = await fetch(`https://ipwho.is/${ip}`);
    const data = await res.json();
    if (data.success !== false && data.latitude) {
      return {
        ip, city: data.city, region: data.region, country: data.country,
        org: data.connection?.isp || data.connection?.org, lat: data.latitude, lon: data.longitude
      };
    }
  } catch (e) {
    console.warn('ipwho.is lookup failed, trying fallback:', e);
  }

  // Fallback: ipapi.co
  try {
    const res = await fetch(`https://ipapi.co/${ip}/json/`);
    if (!res.ok) throw new Error('geo lookup failed');
    const data = await res.json();
    if (data.error) return null;
    return { ip, city: data.city, region: data.region, country: data.country_name, org: data.org, lat: data.latitude, lon: data.longitude };
  } catch (e) {
    console.warn('Geolocation failed:', e);
    return null;
  }
}

/* =========================================================
   3. LLM CLASSIFICATION — Gemini API
   ========================================================= */
async function classifyWithLLM(parsed, geo) {
  const apiKey = localStorage.getItem('phishtrace_gemini_key');
  if (!apiKey) {
    return {
      score: null,
      verdict: 'API key required',
      summary: 'Add your free Gemini API key (⚙ button, top right — get one at aistudio.google.com/apikey) to run AI classification. Header-based checks below are still fully computed.',
      red_flags: []
    };
  }

  const fromDomain = extractDomain(parsed.from);
  const returnPathDomain = extractDomain(parsed.returnPath);
  const replyToDomain = extractDomain(parsed.replyTo);

  const prompt = `You are an email forensic security analyst. Analyze this email for phishing, spoofing, impersonation, or business-email-compromise (BEC) indicators. Be specific and reference the actual header/body evidence given.

PARSED HEADER DATA:
- From: ${parsed.from}
- Return-Path: ${parsed.returnPath}
- Reply-To: ${parsed.replyTo}
- Subject: ${parsed.subject}
- SPF: ${parsed.spf}
- DKIM: ${parsed.dkim}
- DMARC: ${parsed.dmarc}
- From-domain vs Return-Path-domain mismatch: ${fromDomain !== returnPathDomain}
- From-domain vs Reply-To-domain mismatch: ${fromDomain !== replyToDomain}
- Origin IP: ${parsed.originIp || 'not found'}
- Origin Geolocation: ${geo ? `${geo.city || '?'}, ${geo.country || '?'} (${geo.org || 'unknown org'})` : 'unresolved'}
- Number of relay hops: ${parsed.relayHops.length}

EMAIL BODY:
${parsed.bodyText.slice(0, 3000)}

Respond with ONLY valid JSON, no markdown fences, no preamble, matching this exact schema:
{
  "score": <integer 0-100, fraud/risk confidence, 0=clearly legitimate, 100=near-certain fraud>,
  "verdict": "<one of: Legitimate, Suspicious, Likely Phishing, Confirmed Phishing/BEC>",
  "summary": "<2-3 sentence plain-English explanation of the verdict for a non-technical admin>",
  "red_flags": ["<short red flag>", "<short red flag>", ...up to 6],
  "forensic_report": "<a structured 150-250 word forensic report covering: authentication findings, sender identity analysis, origin/infrastructure assessment, and a recommended action. Write it like a short investigator's note.>"
}`;

  const callGemini = () => fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' }
      })
    }
  );

  // Retry up to 3 times on 503 (model temporarily overloaded) with a short backoff
  let response;
  let lastErrText = '';
  for (let attempt = 0; attempt < 3; attempt++) {
    response = await callGemini();
    if (response.ok) break;
    if (response.status !== 503) break; // don't retry on other errors (bad key, bad request, etc.)
    lastErrText = await response.text();
    await sleep(1200 * (attempt + 1));
  }

  if (!response.ok) {
    const errText = lastErrText || await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errText.slice(0, 200)}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('\n').trim();
  if (!text) throw new Error('Empty response from Gemini API');
  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

/* =========================================================
   4. RENDERING
   ========================================================= */
let mapInstance = null;

function renderHeaderTable(parsed) {
  const rows = [
    ['From', escapeHtml(parsed.from || '—')],
    ['Return-Path', escapeHtml(parsed.returnPath || '—')],
    ['Reply-To', escapeHtml(parsed.replyTo || '—')],
    ['Message-ID', escapeHtml(parsed.messageId || '—')],
    ['SPF', authCell(parsed.spf)],
    ['DKIM', authCell(parsed.dkim)],
    ['DMARC', authCell(parsed.dmarc)],
    ['Relay hops', String(parsed.relayHops.length)],
    ['Origin IP', escapeHtml(parsed.originIp || 'not found')]
  ];
  el('headerTable').innerHTML = rows.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('');
}

function authCell(status) {
  const cls = status === 'pass' ? 'pass' : (status === 'fail' || status === 'softfail') ? 'fail' : 'unknown';
  return `<span class="${cls}">${status.toUpperCase()}</span>`;
}

function renderTrace(parsed, geo) {
  const items = parsed.relayHops.map((hop, i) => {
    const isOrigin = hop.ip === parsed.originIp && i === parsed.relayHops.length - 1;
    return `<li class="${isOrigin ? 'origin' : ''}">
      <div class="hop-badge">${i + 1}</div>
      <div>
        <div>${escapeHtml(hop.host || hop.by || 'unknown host')} ${hop.ip ? `— <span style="color:var(--trace)">${hop.ip}</span>` : ''}</div>
        ${isOrigin ? `<div style="color:var(--alert);margin-top:2px;">↳ Probable origin${geo ? ` — ${escapeHtml(geo.city || '?')}, ${escapeHtml(geo.country || '?')}` : ''}</div>` : ''}
      </div>
    </li>`;
  }).join('');
  el('traceList').innerHTML = items || '<li>No relay headers found.</li>';
}

function renderMap(geo) {
  if (mapInstance) { mapInstance.remove(); mapInstance = null; }
  if (!geo || !geo.lat || !geo.lon) {
    el('map').innerHTML = '';
    el('geoMeta').innerHTML = '<span style="color:var(--warn)">Could not resolve geolocation for the extracted IP.</span>';
    return;
  }
  mapInstance = L.map('map', { zoomControl: false, attributionControl: false }).setView([geo.lat, geo.lon], 6);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { subdomains: 'abcd' }).addTo(mapInstance);
  L.circleMarker([geo.lat, geo.lon], { radius: 8, color: '#e63946', fillColor: '#e63946', fillOpacity: 0.6 }).addTo(mapInstance);

  el('geoMeta').innerHTML = `
    <div><b>IP:</b> ${escapeHtml(geo.ip)}</div>
    <div><b>Location:</b> ${escapeHtml(geo.city || '?')}, ${escapeHtml(geo.region || '')} ${escapeHtml(geo.country || '')}</div>
    <div><b>Network / ISP:</b> ${escapeHtml(geo.org || 'unknown')}</div>
  `;
}

function renderVerdict(result) {
  const score = result.score;
  el('scoreNum').textContent = score === null ? '—' : score;
  const ring = el('scoreRing');
  const color = score === null ? '#4a5566' : scoreColor(score);
  ring.style.background = `conic-gradient(${color} ${((score||0)/100)*360}deg, var(--panel-2) 0deg)`;
  ring.style.boxShadow = score === null ? 'none' : `0 0 30px -8px ${color}`;

  const label = el('scoreLabel');
  label.textContent = result.verdict || 'Pending';
  label.style.color = color;
  label.style.background = score === null ? 'var(--panel-2)' : color + '22';
  label.style.border = `1px solid ${color}55`;

  el('verdictTitle').textContent = result.verdict || 'Awaiting analysis';
  el('verdictText').textContent = result.summary || '';
  el('flagsRow').innerHTML = (result.red_flags || []).map(f => `<span class="flag-chip">⚑ ${escapeHtml(f)}</span>`).join('');
  el('reportText').textContent = result.forensic_report || result.summary || 'Add an API key to generate the full forensic report.';
}

/* =========================================================
   5. MAIN FLOW
   ========================================================= */
const loadingSteps = document.querySelectorAll('.loading-line');
function setLoadingStep(i) {
  loadingSteps.forEach((s, idx) => s.classList.toggle('active', idx <= i));
}

el('analyzeBtn').onclick = async () => {
  const raw = el('emailInput').value.trim();
  if (!raw) { alert('Paste a raw email first.'); return; }

  el('analyzeBtn').disabled = true;
  el('results').style.display = 'none';
  el('loadingBox').style.display = 'block';
  setLoadingStep(0);

  try {
    const parsed = parseHeaders(raw);
    renderHeaderTable(parsed);
    renderTrace(parsed, null);

    setLoadingStep(1);
    await sleep(300);

    setLoadingStep(2);
    const geo = await geolocateIp(parsed.originIp);
    renderMap(geo);
    renderTrace(parsed, geo);

    setLoadingStep(3);
    let llmResult;
    try {
      llmResult = await classifyWithLLM(parsed, geo);
    } catch (e) {
      console.error(e);
      llmResult = { score: null, verdict: 'AI classification failed', summary: e.message, red_flags: [], forensic_report: '' };
    }
    renderVerdict(llmResult);

    el('loadingBox').style.display = 'none';
    el('results').style.display = 'block';

    saveHistory({ subject: parsed.subject, score: llmResult.score ?? 0, ts: Date.now() });
  } catch (err) {
    console.error(err);
    el('loadingBox').style.display = 'none';
    alert('Something went wrong parsing this email: ' + err.message);
  } finally {
    el('analyzeBtn').disabled = false;
  }
};

function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

renderHistory();
