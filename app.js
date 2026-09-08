/* =========================================================
   PHISHTRACE — MVP logic (single file, Gemini API)
   ========================================================= */
const el = (id) => document.getElementById(id);
let fullDetailsOpen = false;

/* ---------- Backend base URL ---------- */
/* The server serves the frontend itself, so same-origin requests just work.
   Change this only if you split the frontend and backend onto different hosts. */
const BACKEND_BASE = '';

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

/* ---------- Sample link & message ---------- */
const SAMPLE_LINK = `http://hdfc-kyc-verify.secure-bank-update.info/login?ref=8827aa`;
const SAMPLE_MESSAGE = `Dear Customer, your UPI ID will be BLOCKED today due to KYC expiry. To avoid suspension, update your details immediately: http://paytm-kyc-update.in/verify Do not ignore, action required within 2 hours.`;

/* =========================================================
   i18n — UI language (English / Hindi)
   ========================================================= */
const LANG_STRINGS = {
  en: {
    brandTag: 'Email Threat & Forensic Intelligence',
    heroTitle: 'Paste an email, a link, or a message. Get the trace.',
    heroSubtitle: 'Analyzes headers, authentication results, domain structure, and language patterns to flag phishing, spoofing, and BEC attempts — then traces the likely origin where evidence exists.',
    statAnalyzed: 'Analyzed', statFlagged: 'Flagged',
    tabs: { email: 'Email', link: 'Link', message: 'Message' },
    modes: {
      email: {
        title: 'Raw Email Input',
        placeholder: `Paste the full raw email source here — including headers (Received, From, Return-Path, DKIM-Signature, etc.) followed by the body.

Tip: In Gmail, use 'Show original' to copy the raw source.`,
        sampleLabel: 'Load a sample phishing email →',
        analyzeLabel: 'Analyze Email',
        alertEmpty: 'Paste a raw email first.',
        loadingSteps: ['Parsing headers and relay chain…', 'Validating SPF / DKIM / DMARC…', 'Resolving origin IP geolocation…', 'Running AI fraud classification…']
      },
      link: {
        title: 'Link to Check',
        placeholder: 'Paste the suspicious link here — a full URL including http:// or https://.',
        sampleLabel: 'Load a sample phishing link →',
        analyzeLabel: 'Analyze Link',
        alertEmpty: 'Paste a link first.',
        loadingSteps: ['Parsing URL and domain structure…', 'Checking redirect / shortener patterns…', 'Screening for lookalike & typosquat signals…', 'Running AI risk classification…']
      },
      message: {
        title: 'Message to Check',
        placeholder: 'Paste the suspicious SMS / WhatsApp / chat message text here.',
        sampleLabel: 'Load a sample scam message →',
        analyzeLabel: 'Analyze Message',
        alertEmpty: 'Paste a message first.',
        loadingSteps: ['Reading message content…', 'Scanning for urgency & scam-language cues…', 'Cross-checking known fraud patterns…', 'Running AI risk classification…']
      }
    },
    seeFullDetails: 'See full details ▾', hideDetails: 'Hide details ▲',
    headerAnalysisTitle: 'Header & Protocol Analysis', geoTitle: 'Origin Geolocation',
    traceTitle: 'Relay / Trace Path', linkAnalysisTitle: 'Link & Domain Analysis',
    reportTitle: 'Forensic Report (AI-Generated)', historyTitle: 'Case History',
    cancelBtn: 'Cancel', saveBtn: 'Save',
    footerText: 'PHISHTRACE — SIH 2026 · Analysis assists investigation, does not replace it · Built with HTML/CSS/JS',
    profileBtnLogin: '👤 Login',
    loginModalTitleLogin: 'Log In', loginModalTitleSignup: 'Sign Up',
    loginModalDescLogin: 'Log in to unlock your case history — it now follows you across devices.',
    loginModalDescSignup: 'Create an account to unlock your case history — it now follows you across devices.',
    namePlaceholder: 'Your name', emailPlaceholder: 'Email', passwordPlaceholder: 'Password',
    loginBtn: 'Log In', signupBtn: 'Sign Up',
    toggleToSignup: "Don't have an account? Sign up", toggleToLogin: 'Already have an account? Log in',
    historyMenuItem: 'History', logoutBtn: 'Log Out',
    verdictLabels: { Legitimate: 'Legitimate', Suspicious: 'Suspicious', 'Likely Phishing': 'Likely Phishing', 'Confirmed Phishing/BEC': 'Confirmed Phishing/BEC', 'API key required': 'API key required', 'AI classification failed': 'AI classification failed' },
    quickLine: {
      Legitimate: 'This looks legitimate — no strong signs of fraud were found.',
      Suspicious: 'This looks suspicious — some red flags were found. Proceed carefully.',
      'Likely Phishing': 'This is likely phishing — treat it as untrusted.',
      'Confirmed Phishing/BEC': 'This is confirmed phishing / BEC — do not click, reply, or share any details.',
      'API key required': 'Add a Gemini API key to get an AI verdict.',
      'AI classification failed': 'AI classification failed — see details below.'
    },
    geminiLanguageName: 'English',
    noHeadersWarning: '⚠ No raw email headers were detected in this input — this looks like the visible message text was pasted rather than the true raw source. Authentication and origin checks could not run, so the verdict below relies on message content only. For a fully verified result, use your email client\u2019s "Show original" / "View source" option and paste that instead.',
    malformedUrl: 'The input could not be parsed as a valid URL.',
    malformedUrlFlag: 'Malformed URL',
    serverUnreachable: 'Could not reach the PhishTrace server. Make sure it is running and try again.',
    fillAllFields: 'Please fill in all fields.'
  },
  hi: {
    brandTag: 'ईमेल खतरा और फोरेंसिक इंटेलिजेंस',
    heroTitle: 'एक ईमेल, लिंक या संदेश पेस्ट करें। ट्रेस पाएं।',
    heroSubtitle: 'हेडर, प्रमाणीकरण परिणाम, डोमेन संरचना और भाषा पैटर्न का विश्लेषण करके फ़िशिंग, स्पूफिंग और BEC प्रयासों को चिन्हित करता है — और जहां प्रमाण मौजूद हो वहां संभावित मूल स्रोत का पता लगाता है।',
    statAnalyzed: 'विश्लेषित', statFlagged: 'चिन्हित',
    tabs: { email: 'ईमेल', link: 'लिंक', message: 'संदेश' },
    modes: {
      email: {
        title: 'रॉ ईमेल इनपुट',
        placeholder: `यहां पूरा रॉ ईमेल स्रोत पेस्ट करें — हेडर सहित (Received, From, Return-Path, DKIM-Signature, आदि) उसके बाद बॉडी।

सुझाव: Gmail में, रॉ स्रोत कॉपी करने के लिए "मूल दिखाएं" (Show original) का उपयोग करें।`,
        sampleLabel: 'एक नमूना फ़िशिंग ईमेल लोड करें →',
        analyzeLabel: 'ईमेल का विश्लेषण करें',
        alertEmpty: 'पहले एक रॉ ईमेल पेस्ट करें।',
        loadingSteps: ['हेडर और रिले चेन पार्स हो रहे हैं…', 'SPF / DKIM / DMARC की पुष्टि हो रही है…', 'मूल IP का भू-स्थान पता लगाया जा रहा है…', 'AI धोखाधड़ी वर्गीकरण चल रहा है…']
      },
      link: {
        title: 'जांचने के लिए लिंक',
        placeholder: 'यहां संदिग्ध लिंक पेस्ट करें — http:// या https:// सहित पूरा URL।',
        sampleLabel: 'एक नमूना फ़िशिंग लिंक लोड करें →',
        analyzeLabel: 'लिंक का विश्लेषण करें',
        alertEmpty: 'पहले एक लिंक पेस्ट करें।',
        loadingSteps: ['URL और डोमेन संरचना पार्स हो रही है…', 'रीडायरेक्ट / शॉर्टनर पैटर्न जांचे जा रहे हैं…', 'लुकअलाइक और टाइपोस्क्वाट संकेतों की जांच हो रही है…', 'AI जोखिम वर्गीकरण चल रहा है…']
      },
      message: {
        title: 'जांचने के लिए संदेश',
        placeholder: 'यहां संदिग्ध SMS / WhatsApp / चैट संदेश टेक्स्ट पेस्ट करें।',
        sampleLabel: 'एक नमूना धोखाधड़ी संदेश लोड करें →',
        analyzeLabel: 'संदेश का विश्लेषण करें',
        alertEmpty: 'पहले एक संदेश पेस्ट करें।',
        loadingSteps: ['संदेश की सामग्री पढ़ी जा रही है…', 'तात्कालिकता और धोखाधड़ी वाली भाषा के संकेत खोजे जा रहे हैं…', 'ज्ञात धोखाधड़ी पैटर्न से मिलान किया जा रहा है…', 'AI जोखिम वर्गीकरण चल रहा है…']
      }
    },
    seeFullDetails: 'पूरी जानकारी देखें ▾', hideDetails: 'जानकारी छिपाएं ▲',
    headerAnalysisTitle: 'हेडर और प्रोटोकॉल विश्लेषण', geoTitle: 'मूल भू-स्थान',
    traceTitle: 'रिले / ट्रेस पथ', linkAnalysisTitle: 'लिंक और डोमेन विश्लेषण',
    reportTitle: 'फोरेंसिक रिपोर्ट (AI-जनित)', historyTitle: 'केस इतिहास',
    cancelBtn: 'रद्द करें', saveBtn: 'सहेजें',
    footerText: 'PHISHTRACE — SIH 2026 · विश्लेषण जांच में सहायता करता है, उसकी जगह नहीं लेता · HTML/CSS/JS से निर्मित',
    profileBtnLogin: '👤 लॉग इन',
    loginModalTitleLogin: 'लॉग इन करें', loginModalTitleSignup: 'साइन अप करें',
    loginModalDescLogin: 'अपना केस इतिहास अनलॉक करने के लिए लॉग इन करें — अब यह सभी डिवाइस पर आपके साथ रहेगा।',
    loginModalDescSignup: 'अपना केस इतिहास अनलॉक करने के लिए खाता बनाएं — अब यह सभी डिवाइस पर आपके साथ रहेगा।',
    namePlaceholder: 'आपका नाम', emailPlaceholder: 'ईमेल', passwordPlaceholder: 'पासवर्ड',
    loginBtn: 'लॉग इन करें', signupBtn: 'साइन अप करें',
    toggleToSignup: 'खाता नहीं है? साइन अप करें', toggleToLogin: 'पहले से खाता है? लॉग इन करें',
    historyMenuItem: 'इतिहास', logoutBtn: 'लॉग आउट',
    verdictLabels: { Legitimate: 'वैध', Suspicious: 'संदिग्ध', 'Likely Phishing': 'संभावित फ़िशिंग', 'Confirmed Phishing/BEC': 'पुष्टि की गई फ़िशिंग/BEC', 'API key required': 'API कुंजी आवश्यक है', 'AI classification failed': 'AI वर्गीकरण विफल' },
    quickLine: {
      Legitimate: 'यह वैध लगता है — धोखाधड़ी के कोई मजबूत संकेत नहीं मिले।',
      Suspicious: 'यह संदिग्ध लगता है — कुछ चेतावनी संकेत मिले हैं, सावधानी बरतें।',
      'Likely Phishing': 'यह संभावित फ़िशिंग है — इसे अविश्वसनीय मानें।',
      'Confirmed Phishing/BEC': 'यह पुष्टि की गई फ़िशिंग/BEC है — क्लिक न करें, जवाब न दें, कोई जानकारी साझा न करें।',
      'API key required': 'AI निर्णय पाने के लिए Gemini API कुंजी जोड़ें।',
      'AI classification failed': 'AI वर्गीकरण विफल रहा — नीचे विवरण देखें।'
    },
    geminiLanguageName: 'Hindi (Devanagari script)',
    noHeadersWarning: '⚠ इस इनपुट में कोई रॉ ईमेल हेडर नहीं मिला — ऐसा लगता है कि दिखने वाला संदेश टेक्स्ट पेस्ट किया गया है, असली रॉ स्रोत नहीं। प्रमाणीकरण और मूल स्रोत की जांच नहीं हो सकी, इसलिए नीचे दिया गया निर्णय केवल संदेश की सामग्री पर आधारित है। पूरी तरह सत्यापित परिणाम के लिए, अपने ईमेल क्लाइंट के "मूल दिखाएं" / "स्रोत देखें" विकल्प का उपयोग करें।',
    malformedUrl: 'इनपुट को मान्य URL के रूप में पार्स नहीं किया जा सका।',
    malformedUrlFlag: 'अमान्य URL',
    serverUnreachable: 'PhishTrace सर्वर तक नहीं पहुंचा जा सका। सुनिश्चित करें कि यह चल रहा है और फिर से प्रयास करें।',
    fillAllFields: 'कृपया सभी फ़ील्ड भरें।'
  }
};

let currentLang = localStorage.getItem('phishtrace_lang') || 'en';
function t() { return LANG_STRINGS[currentLang] || LANG_STRINGS.en; }

function applyStaticTranslations() {
  const s = t();
  el('brandTag').textContent = s.brandTag;
  el('heroTitle').textContent = s.heroTitle;
  el('heroSubtitle').textContent = s.heroSubtitle;
  el('statAnalyzedLabel').textContent = s.statAnalyzed;
  el('statFlaggedLabel').textContent = s.statFlagged;
  document.querySelectorAll('.mode-tab').forEach(btn => { btn.textContent = s.tabs[btn.dataset.mode]; });
  el('headerAnalysisTitle').textContent = s.headerAnalysisTitle;
  el('geoTitle').textContent = s.geoTitle;
  el('traceTitle').textContent = s.traceTitle;
  el('linkAnalysisTitle').textContent = s.linkAnalysisTitle;
  el('reportTitle').textContent = s.reportTitle;
  el('historyTitle').textContent = s.historyTitle;
  el('footerText').textContent = s.footerText;
  el('loginEmailInput').placeholder = s.emailPlaceholder;
  el('loginPasswordInput').placeholder = s.passwordPlaceholder;
  el('loginNameInput').placeholder = s.namePlaceholder;
  el('loginCancel').textContent = s.cancelBtn;
  el('menuHistory').textContent = s.historyMenuItem;
  el('menuLogout').textContent = s.logoutBtn;
  el('seeDetailsBtn').textContent = fullDetailsOpen ? s.hideDetails : s.seeFullDetails;
  applyAuthModeText();
  updateProfileButton();
}

el('langSelect').value = currentLang;
el('langSelect').onchange = (e) => {
  currentLang = e.target.value;
  localStorage.setItem('phishtrace_lang', currentLang);
  applyStaticTranslations();
  setMode(currentMode);
  renderHistory();
};

/* ---------- Mode (tab) handling ---------- */
let currentMode = 'email';

function setMode(mode) {
  currentMode = mode;
  const copy = t().modes[mode];
  document.querySelectorAll('.mode-tab').forEach(btn => btn.classList.toggle('active', btn.dataset.mode === mode));
  el('inputTitle').textContent = copy.title;
  el('emailInput').placeholder = copy.placeholder;
  el('loadSample').textContent = copy.sampleLabel;
  el('analyzeBtn').textContent = copy.analyzeLabel;
  el('emailInput').value = '';
  el('results').style.display = 'none';
  for (let i = 0; i < 4; i++) el('loadStep' + i).textContent = copy.loadingSteps[i];
  // Email-only panels: header table, geolocation/map, relay trace
  el('emailGrid').style.display = mode === 'email' ? 'grid' : 'none';
  el('traceBox').style.display = mode === 'email' ? 'block' : 'none';
  el('linkBox').style.display = mode === 'link' ? 'block' : 'none';
}

document.querySelectorAll('.mode-tab').forEach(btn => {
  btn.onclick = () => setMode(btn.dataset.mode);
});

const SAMPLES = { email: SAMPLE_EMAIL, link: SAMPLE_LINK, message: SAMPLE_MESSAGE };
el('loadSample').onclick = () => { el('emailInput').value = SAMPLES[currentMode]; };

/* ---------- Login / Signup (real accounts, backed by the Version 3 server) ---------- */
const profileMenu = el('profileMenu');
let authMode = 'login'; // 'login' | 'signup'

function getToken() { return localStorage.getItem('phishtrace_token') || null; }
function getUser() { return localStorage.getItem('phishtrace_user') || null; }
function setSession(token, name) {
  localStorage.setItem('phishtrace_token', token);
  localStorage.setItem('phishtrace_user', name);
}
function clearSession() {
  localStorage.removeItem('phishtrace_token');
  localStorage.removeItem('phishtrace_user');
}
function updateProfileButton() {
  const user = getUser();
  el('profileBtn').textContent = user ? `👤 ${user}` : t().profileBtnLogin;
}

function applyAuthModeText() {
  const s = t();
  el('loginModalTitle').textContent = authMode === 'login' ? s.loginModalTitleLogin : s.loginModalTitleSignup;
  el('loginModalDesc').textContent = authMode === 'login' ? s.loginModalDescLogin : s.loginModalDescSignup;
  el('loginNameInput').style.display = authMode === 'signup' ? 'block' : 'none';
  el('loginSave').textContent = authMode === 'login' ? s.loginBtn : s.signupBtn;
  el('authModeToggle').textContent = authMode === 'login' ? s.toggleToSignup : s.toggleToLogin;
}

el('authModeToggle').onclick = () => {
  authMode = authMode === 'login' ? 'signup' : 'login';
  el('loginError').style.display = 'none';
  applyAuthModeText();
};

el('profileBtn').onclick = (e) => {
  e.stopPropagation();
  if (getUser()) {
    profileMenu.classList.toggle('open');
  } else {
    authMode = 'login';
    el('loginNameInput').value = '';
    el('loginEmailInput').value = '';
    el('loginPasswordInput').value = '';
    el('loginError').style.display = 'none';
    applyAuthModeText();
    el('loginModal').style.display = 'flex';
  }
};
document.addEventListener('click', () => profileMenu.classList.remove('open'));
el('loginCancel').onclick = () => el('loginModal').style.display = 'none';

el('loginSave').onclick = async () => {
  const name = el('loginNameInput').value.trim();
  const email = el('loginEmailInput').value.trim();
  const password = el('loginPasswordInput').value;
  const errEl = el('loginError');
  errEl.style.display = 'none';

  if (!email || !password || (authMode === 'signup' && !name)) {
    errEl.textContent = t().fillAllFields;
    errEl.style.display = 'block';
    return;
  }

  el('loginSave').disabled = true;
  try {
    const endpoint = authMode === 'login' ? '/api/login' : '/api/signup';
    const body = authMode === 'login' ? { email, password } : { name, email, password };
    const res = await fetch(BACKEND_BASE + endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Something went wrong.');

    setSession(data.token, data.name);
    el('loginModal').style.display = 'none';
    updateProfileButton();
    renderHistory();
  } catch (e) {
    errEl.textContent = e.message;
    errEl.style.display = 'block';
  } finally {
    el('loginSave').disabled = false;
  }
};

el('menuHistory').onclick = () => {
  profileMenu.classList.remove('open');
  el('historyPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
};
el('menuLogout').onclick = () => {
  clearSession();
  profileMenu.classList.remove('open');
  updateProfileButton();
  renderHistory();
};

/* ---------- History — stored server-side per account, so it follows the user across devices ---------- */
async function getHistory(){
  if (!getToken()) return [];
  try {
    const res = await fetch(BACKEND_BASE + '/api/history', { headers: { Authorization: 'Bearer ' + getToken() } });
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    console.warn('Could not load history:', e);
    return [];
  }
}
async function saveHistory(entry){
  if (!getToken()) return;
  try {
    await fetch(BACKEND_BASE + '/api/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + getToken() },
      body: JSON.stringify(entry)
    });
  } catch (e) {
    console.warn('Could not save history entry:', e);
  }
  renderHistory();
}
async function renderHistory(){
  const h = await getHistory();
  el('statCount').textContent = h.length;
  el('statFlagged').textContent = h.filter(x => x.score >= 50).length;
  if (!getUser() || !h.length) { el('historyPanel').style.display = 'none'; return; }
  el('historyPanel').style.display = 'block';
  el('historyList').innerHTML = h.map(item => `
    <div class="history-item">
      <span>${modeTag(item.mode)} ${escapeHtml(item.subject || '(no subject)')}</span>
      <span class="h-score" style="color:${scoreColor(item.score)}">${item.score}</span>
    </div>`).join('');
}
function modeTag(mode) {
  const labels = { email: 'EMAIL', link: 'LINK', message: 'MSG' };
  return `<span style="color:var(--muted)">[${labels[mode] || 'EMAIL'}]</span>`;
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

  // True when this doesn't look like raw source at all (likely a rendered/copy-pasted
  // view of the email rather than "Show original" output) — matters a lot for how
  // confidently the AI should score, since "no evidence found" must never be treated
  // the same as "evidence found and it failed".
  const noHeadersDetected = !from && !authResults && relayHops.length === 0;

  return {
    from, returnPath, replyTo, messageId, subject,
    spf: authStatus('spf'), dkim: authStatus('dkim'), dmarc: authStatus('dmarc'),
    hasDkimSignature: !!dkimSig, relayHops, originIp, noHeadersDetected,
    bodyText: headerBlockEnd !== -1 ? raw.slice(headerBlockEnd).trim() : raw.trim()
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
   2b. LINK ANALYSIS (domain / redirect heuristics — no headers exist for a link)
   ========================================================= */
const URL_SHORTENERS = ['bit.ly','tinyurl.com','t.co','is.gd','ow.ly','buff.ly','rebrand.ly','cutt.ly','shorte.st','rb.gy'];
const WATCHED_BRANDS = ['hdfc','sbi','icici','axis','paytm','upi','kotak','pnb','rbi','amazon','flipkart','google','microsoft','paypal','whatsapp'];

function analyzeLink(rawInput) {
  let input = rawInput.trim();
  if (!/^https?:\/\//i.test(input)) input = 'http://' + input;
  let u;
  try { u = new URL(input); } catch (e) { return { valid: false, raw: rawInput }; }

  const host = u.hostname.toLowerCase();
  const labels = host.split('.');
  const isIp = /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
  const isPunycode = host.includes('xn--');
  const isShortener = URL_SHORTENERS.includes(host);
  const subdomainCount = Math.max(0, labels.length - 2);
  const hyphenCount = (host.match(/-/g) || []).length;
  const noHttps = u.protocol !== 'https:';
  const pathAndQuery = (u.pathname + u.search).toLowerCase();
  const suspiciousKeywords = ['verify','login','secure','update','kyc','otp','confirm','account','suspend','unlock'].filter(k => pathAndQuery.includes(k) || host.includes(k));
  const registrableDomain = labels.slice(-2).join('.');
  const brandInHostButNotRegistrable = WATCHED_BRANDS.filter(b => host.includes(b) && !registrableDomain.startsWith(b));

  return {
    valid: true, raw: rawInput, fullUrl: u.href, protocol: u.protocol, host, registrableDomain,
    isIp, isPunycode, isShortener, subdomainCount, hyphenCount, noHttps, suspiciousKeywords,
    brandInHostButNotRegistrable, pathAndQuery: u.pathname + u.search
  };
}

/* =========================================================
   3. FRAUD CLASSIFICATION — via the Version 3 backend
   =========================================================
   The Gemini prompts and the admin's API key now live entirely in
   server/gemini.js. The frontend just sends already-parsed evidence and
   gets back the same {score, verdict, summary, red_flags, forensic_report}
   shape it always has.
   ========================================================= */
async function callBackendAnalyze(mode, payload) {
  let res;
  try {
    res = await fetch(BACKEND_BASE + '/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, lang: currentLang, ...payload })
    });
  } catch (e) {
    throw new Error(t().serverUnreachable);
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || t().serverUnreachable);
  return data;
}

async function classifyEmailWithLLM(parsed, geo) {
  return callBackendAnalyze('email', {
    parsed: {
      from: parsed.from, returnPath: parsed.returnPath, replyTo: parsed.replyTo, subject: parsed.subject,
      spf: parsed.spf, dkim: parsed.dkim, dmarc: parsed.dmarc, originIp: parsed.originIp,
      relayHopsCount: parsed.relayHops.length, noHeadersDetected: parsed.noHeadersDetected
    },
    geo: geo ? { city: geo.city, country: geo.country, org: geo.org } : null,
    bodyText: parsed.bodyText.slice(0, 3000)
  });
}

async function classifyLinkWithLLM(link) {
  if (!link.valid) {
    return { score: 100, verdict: 'Suspicious', summary: t().malformedUrl, red_flags: [t().malformedUrlFlag], forensic_report: '' };
  }
  return callBackendAnalyze('link', {
    link: {
      fullUrl: link.fullUrl, host: link.host, registrableDomain: link.registrableDomain, noHttps: link.noHttps,
      isIp: link.isIp, isPunycode: link.isPunycode, isShortener: link.isShortener, subdomainCount: link.subdomainCount,
      hyphenCount: link.hyphenCount, suspiciousKeywords: link.suspiciousKeywords,
      brandInHostButNotRegistrable: link.brandInHostButNotRegistrable, pathAndQuery: link.pathAndQuery
    }
  });
}

async function classifyMessageWithLLM(text) {
  return callBackendAnalyze('message', { text: text.slice(0, 3000) });
}

/* =========================================================
   4. RENDERING
   ========================================================= */
let mapInstance = null;

function renderHeaderTable(parsed) {
  const warningEl = el('headerWarning');
  if (parsed.noHeadersDetected) {
    warningEl.style.display = 'flex';
    warningEl.textContent = t().noHeadersWarning;
  } else {
    warningEl.style.display = 'none';
  }

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

function renderLinkTable(link) {
  if (!link.valid) {
    el('linkTable').innerHTML = `<tr><td>Input</td><td class="fail">Could not be parsed as a valid URL</td></tr>`;
    return;
  }
  const yn = (b, warnIfTrue = true) => `<span class="${b === (warnIfTrue) ? 'fail' : 'pass'}">${b ? 'YES' : 'NO'}</span>`;
  const rows = [
    ['Full URL', escapeHtml(link.fullUrl)],
    ['Hostname', escapeHtml(link.host)],
    ['Registrable domain', escapeHtml(link.registrableDomain)],
    ['Uses HTTPS', link.noHttps ? '<span class="fail">NO</span>' : '<span class="pass">YES</span>'],
    ['Raw IP as hostname', yn(link.isIp)],
    ['Punycode hostname', yn(link.isPunycode)],
    ['Known URL shortener', yn(link.isShortener)],
    ['Subdomain labels', String(link.subdomainCount)],
    ['Hyphens in hostname', String(link.hyphenCount)],
    ['Suspicious keywords', link.suspiciousKeywords.length ? `<span class="fail">${escapeHtml(link.suspiciousKeywords.join(', '))}</span>` : '<span class="pass">none</span>'],
    ['Brand impersonation signal', link.brandInHostButNotRegistrable.length ? `<span class="fail">${escapeHtml(link.brandInHostButNotRegistrable.join(', '))}</span>` : '<span class="pass">none</span>']
  ];
  el('linkTable').innerHTML = rows.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('');
}

function verdictIcon(verdict) {
  if (verdict === 'Legitimate') return '✓';
  if (verdict === 'Suspicious') return '⚠';
  if (verdict === 'Likely Phishing') return '⚠';
  if (verdict === 'Confirmed Phishing/BEC') return '⛔';
  return '?';
}

function renderVerdict(result) {
  const s = t();
  const score = result.score;
  const rawVerdict = result.verdict || 'Suspicious';
  const displayVerdict = s.verdictLabels[rawVerdict] || rawVerdict;
  const color = score === null ? '#4a5566' : scoreColor(score);

  // Quick verdict line (progressive disclosure — shown first)
  el('qvIcon').textContent = verdictIcon(rawVerdict);
  el('qvIcon').style.color = color;
  el('qvIcon').style.borderColor = color + '55';
  el('qvLabel').textContent = displayVerdict;
  el('qvText').textContent = s.quickLine[rawVerdict] || result.summary || '';
  fullDetailsOpen = false;
  el('fullDetails').style.display = 'none';
  el('seeDetailsBtn').textContent = s.seeFullDetails;

  // Full technical detail (revealed on click)
  el('scoreNum').textContent = score === null ? '—' : score;
  const ring = el('scoreRing');
  ring.style.background = `conic-gradient(${color} ${((score||0)/100)*360}deg, var(--panel-2) 0deg)`;
  ring.style.boxShadow = score === null ? 'none' : `0 0 30px -8px ${color}`;

  const label = el('scoreLabel');
  label.textContent = displayVerdict;
  label.style.color = color;
  label.style.background = score === null ? 'var(--panel-2)' : color + '22';
  label.style.border = `1px solid ${color}55`;

  el('verdictTitle').textContent = displayVerdict;
  el('verdictText').textContent = result.summary || '';
  el('flagsRow').innerHTML = (result.red_flags || []).map(f => `<span class="flag-chip">⚑ ${escapeHtml(f)}</span>`).join('');
  el('reportText').textContent = result.forensic_report || result.summary || '';
}

el('seeDetailsBtn').onclick = () => {
  fullDetailsOpen = !fullDetailsOpen;
  el('fullDetails').style.display = fullDetailsOpen ? 'block' : 'none';
  el('seeDetailsBtn').textContent = fullDetailsOpen ? t().hideDetails : t().seeFullDetails;
};

/* =========================================================
   5. MAIN FLOW
   ========================================================= */
const loadingSteps = document.querySelectorAll('.loading-line');
function setLoadingStep(i) {
  loadingSteps.forEach((s, idx) => s.classList.toggle('active', idx <= i));
}

async function runEmailAnalysis(raw) {
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
    llmResult = await classifyEmailWithLLM(parsed, geo);
  } catch (e) {
    console.error(e);
    llmResult = { score: null, verdict: 'AI classification failed', summary: e.message, red_flags: [], forensic_report: '' };
  }
  renderVerdict(llmResult);
  await saveHistory({ mode: 'email', subject: parsed.subject, score: llmResult.score ?? 0, ts: Date.now() });
}

async function runLinkAnalysis(raw) {
  setLoadingStep(1);
  await sleep(200);
  const link = analyzeLink(raw);
  setLoadingStep(2);
  renderLinkTable(link);
  await sleep(200);

  setLoadingStep(3);
  let llmResult;
  try {
    llmResult = await classifyLinkWithLLM(link);
  } catch (e) {
    console.error(e);
    llmResult = { score: null, verdict: 'AI classification failed', summary: e.message, red_flags: [], forensic_report: '' };
  }
  renderVerdict(llmResult);
  await saveHistory({ mode: 'link', subject: link.valid ? link.host : raw.slice(0, 60), score: llmResult.score ?? 0, ts: Date.now() });
}

async function runMessageAnalysis(raw) {
  setLoadingStep(1);
  await sleep(200);
  setLoadingStep(2);
  await sleep(200);

  setLoadingStep(3);
  let llmResult;
  try {
    llmResult = await classifyMessageWithLLM(raw);
  } catch (e) {
    console.error(e);
    llmResult = { score: null, verdict: 'AI classification failed', summary: e.message, red_flags: [], forensic_report: '' };
  }
  renderVerdict(llmResult);
  await saveHistory({ mode: 'message', subject: raw.slice(0, 60), score: llmResult.score ?? 0, ts: Date.now() });
}

el('analyzeBtn').onclick = async () => {
  const raw = el('emailInput').value.trim();
  if (!raw) { alert(t().modes[currentMode].alertEmpty); return; }

  el('analyzeBtn').disabled = true;
  el('results').style.display = 'none';
  el('loadingBox').style.display = 'block';
  setLoadingStep(0);

  try {
    if (currentMode === 'email') await runEmailAnalysis(raw);
    else if (currentMode === 'link') await runLinkAnalysis(raw);
    else await runMessageAnalysis(raw);

    el('loadingBox').style.display = 'none';
    el('results').style.display = 'block';
  } catch (err) {
    console.error(err);
    el('loadingBox').style.display = 'none';
    alert('Something went wrong during analysis: ' + err.message);
  } finally {
    el('analyzeBtn').disabled = false;
  }
};

function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

applyStaticTranslations();
setMode('email');
renderHistory();
