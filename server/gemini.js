/* =========================================================
   PHISHTRACE — Version 3 Gemini classification (server-side)
   =========================================================
   This is the Version 1/2 client-side prompt logic, moved here so the
   Gemini API key never has to leave the server. The frontend now sends
   already-parsed evidence (header data, link heuristics, or message text)
   and gets back the same {score, verdict, summary, red_flags, forensic_report}
   JSON shape it always has.
   ========================================================= */
const GEMINI_LANG_NAMES = { en: 'English', hi: 'Hindi (Devanagari script)' };

function langName(lang) {
  return GEMINI_LANG_NAMES[lang] || GEMINI_LANG_NAMES.en;
}

function responseSchemaInstructions(lang) {
  const name = langName(lang);
  return `Respond with ONLY valid JSON, no markdown fences, no preamble, matching this exact schema:
{
  "score": <integer 0-100, fraud/risk confidence, 0=clearly legitimate, 100=near-certain fraud>,
  "verdict": "<one of exactly these English strings: Legitimate, Suspicious, Likely Phishing, Confirmed Phishing/BEC>",
  "summary": "<2-3 sentence explanation of the verdict for a non-technical admin, written in ${name}>",
  "red_flags": ["<short red flag, written in ${name}>", ...up to 6],
  "forensic_report": "<a structured 150-250 word forensic report covering the relevant findings and a recommended action, written in ${name}. Write it like a short investigator's note.>"
}
IMPORTANT: the "verdict" field must stay exactly one of the four English strings given above regardless of the response language — only "summary", "red_flags", and "forensic_report" should be written in ${name}.`;
}

function buildEmailPrompt({ parsed, geo, bodyText, lang }) {
  const fromDomain = (parsed.from || '').match(/@([\w.-]+)/)?.[1]?.toLowerCase() || null;
  const returnPathDomain = (parsed.returnPath || '').match(/@([\w.-]+)/)?.[1]?.toLowerCase() || null;
  const replyToDomain = (parsed.replyTo || '').match(/@([\w.-]+)/)?.[1]?.toLowerCase() || null;

  const evidenceWarning = parsed.noHeadersDetected ? `
IMPORTANT — INPUT QUALITY WARNING:
No parseable email headers were found in this input at all (no From/Authentication-Results/Received lines). This almost always means the person pasted the visible message view (e.g. copied text from their inbox) rather than the true raw source (e.g. Gmail "Show original"). This means technical evidence is UNAVAILABLE, not that it was checked and failed.
- Do NOT treat "unknown"/missing SPF, DKIM, DMARC, or origin data as suspicious signals by themselves. Missing evidence is neutral, not negative.
- Judge this using body content only, and hold it to a HIGHER bar before calling it phishing: generic legitimate patterns like a deadline, a call to action, a request to fill a form, or mass/bulk distribution are NOT by themselves red flags — plenty of real institutional, academic, and workplace email looks exactly like this.
- Only score this as "Likely Phishing" or "Confirmed Phishing/BEC" if there are concrete, specific fraud indicators in the wording itself: requests for passwords/OTP/payment/bank details, a link that is clearly a credential-harvesting or brand-impersonation URL, or explicit impersonation language. A link to a well-known, legitimate service (e.g. a Google Form, official portal) used for a plausible administrative purpose is not on its own a red flag.
- If you cannot find concrete fraud-specific evidence, prefer "Legitimate" or a low-scored "Suspicious" over a high score, and say plainly in your summary that raw headers were unavailable so full authentication could not be verified.
` : '';

  return `You are an email forensic security analyst. Analyze this email for phishing, spoofing, impersonation, or business-email-compromise (BEC) indicators. Be specific and reference the actual header/body evidence given. Distinguish carefully between evidence that is genuinely absent versus evidence that was checked and failed — only failed/mismatched checks count as red flags.
${evidenceWarning}
PARSED HEADER DATA:
- From: ${parsed.from || 'not found in input'}
- Return-Path: ${parsed.returnPath || 'not found in input'}
- Reply-To: ${parsed.replyTo || 'not found in input'}
- Subject: ${parsed.subject}
- SPF: ${parsed.spf} ${parsed.spf === 'unknown' ? '(not checked — no data, this is NOT a failure)' : ''}
- DKIM: ${parsed.dkim} ${parsed.dkim === 'unknown' ? '(not checked — no data, this is NOT a failure)' : ''}
- DMARC: ${parsed.dmarc} ${parsed.dmarc === 'unknown' ? '(not checked — no data, this is NOT a failure)' : ''}
- From-domain vs Return-Path-domain mismatch: ${(parsed.from && parsed.returnPath) ? (fromDomain !== returnPathDomain) : 'not applicable — one or both addresses unavailable'}
- From-domain vs Reply-To-domain mismatch: ${(parsed.from && parsed.replyTo) ? (fromDomain !== replyToDomain) : 'not applicable — one or both addresses unavailable'}
- Origin IP: ${parsed.originIp || 'not found'}
- Origin Geolocation: ${geo ? `${geo.city || '?'}, ${geo.country || '?'} (${geo.org || 'unknown org'})` : 'unresolved'}
- Number of relay hops: ${parsed.relayHopsCount ?? 0}

EMAIL BODY:
${(bodyText || '').slice(0, 3000)}

${responseSchemaInstructions(lang)}`;
}

function buildLinkPrompt({ link, lang }) {
  return `You are a URL/domain forensic security analyst. Analyze this link for phishing, spoofing, or scam indicators. There are no email headers available for a bare link — base your assessment only on the domain, path, and structural signals given. Be specific and reference the actual evidence.

LINK EVIDENCE:
- Full URL: ${link.fullUrl}
- Hostname: ${link.host}
- Registrable domain: ${link.registrableDomain}
- Uses HTTPS: ${!link.noHttps}
- Hostname is a raw IP address: ${link.isIp}
- Hostname uses punycode (possible homograph attack): ${link.isPunycode}
- Known URL shortener: ${link.isShortener}
- Number of subdomain labels: ${link.subdomainCount}
- Hyphen count in hostname: ${link.hyphenCount}
- Suspicious keywords found in host/path (verify, login, secure, kyc, otp, etc.): ${(link.suspiciousKeywords || []).join(', ') || 'none'}
- Well-known brand name appearing in hostname but NOT as the actual registrable domain (possible impersonation): ${(link.brandInHostButNotRegistrable || []).join(', ') || 'none'}
- Path/query: ${link.pathAndQuery}

${responseSchemaInstructions(lang)}`;
}

function buildMessagePrompt({ text, lang }) {
  return `You are a fraud-messaging analyst reviewing a plain SMS/WhatsApp-style text message for scam indicators. There are no headers or sender metadata for a plain message — base your assessment purely on language patterns: urgency/threat cues, fake prize or refund language, KYC/OTP/UPI-block scare tactics, requests for money or credentials, suspicious links, impersonation of a bank/government/company, and generic mass-message phrasing. Be specific and reference the actual wording.

MESSAGE TEXT:
${(text || '').slice(0, 3000)}

${responseSchemaInstructions(lang)}`;
}

async function callGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const err = new Error('Server AI key not configured — the admin needs to set GEMINI_API_KEY in server/.env.');
    err.code = 'NO_SERVER_KEY';
    throw err;
  }

  const doCall = () => fetch(
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

  let response;
  let lastErrText = '';
  for (let attempt = 0; attempt < 3; attempt++) {
    response = await doCall();
    if (response.ok) break;
    if (response.status !== 503) break;
    lastErrText = await response.text();
    await new Promise(r => setTimeout(r, 1200 * (attempt + 1)));
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

async function classify(mode, payload) {
  let prompt;
  if (mode === 'email') prompt = buildEmailPrompt(payload);
  else if (mode === 'link') prompt = buildLinkPrompt(payload);
  else if (mode === 'message') prompt = buildMessagePrompt(payload);
  else throw new Error('Unknown mode: ' + mode);

  return callGemini(prompt);
}

module.exports = { classify };
