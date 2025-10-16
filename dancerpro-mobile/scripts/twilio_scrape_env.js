/*
  Playwright-based Twilio credential scraper for Windows.
  - Reuses your Chrome/Edge default profile to avoid re-login.
  - Navigates Twilio Console Project Settings and Active Numbers.
  - Extracts Account SID, Auth Token (after reveal), and phone number.
  - Writes dancerpro-mobile/backend/.env with captured values.

  Usage:
    node dancerpro-mobile/scripts/twilio_scrape_env.js

  Notes:
  - This runs headful; you will see the browser.
  - If Auth Token is hidden, click the eye/reveal icon; the script keeps scanning.
  - No secrets are printed to the terminal; they are written to the .env file.
*/

const fs = require('fs');
const path = require('path');
const os = require('os');
let chromium;
try {
  // Prefer the core Playwright library for scripting
  ({ chromium } = require('playwright'));
} catch (e) {
  // Fallback to @playwright/test if core is unavailable
  ({ chromium } = require('@playwright/test'));
}
const TWILIO_EMAIL = process.env.TWILIO_EMAIL || process.argv[2] || '';

function getWindowsBrowserProfilePath() {
  const home = process.env.USERPROFILE || os.homedir();
  const chromeDefault = path.join(home, 'AppData', 'Local', 'Google', 'Chrome', 'User Data', 'Default');
  const edgeDefault = path.join(home, 'AppData', 'Local', 'Microsoft', 'Edge', 'User Data', 'Default');
  if (fs.existsSync(chromeDefault)) return chromeDefault;
  if (fs.existsSync(edgeDefault)) return edgeDefault;
  const fallback = path.join(home, 'playwright-twilio-profile');
  if (!fs.existsSync(fallback)) fs.mkdirSync(fallback, { recursive: true });
  return fallback;
}

async function findPatternAcrossFrames(page, regex) {
  try {
    const topHtml = await page.content();
    const mTop = topHtml.match(regex);
    if (mTop) return mTop[0];
  } catch {}
  for (const frame of page.frames()) {
    try {
      const html = await frame.content();
      const m = html.match(regex);
      if (m) return m[0];
    } catch {}
  }
  return null;
}

async function loginIfNeeded(page, email) {
  try {
    await page.goto('https://console.twilio.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  } catch {}
  await page.waitForTimeout(3000);
  // Detect presence of login inputs
  const emailField = page.locator('input[type="email"], input[name*="email"], input#email, input#username, input[id*="email"], input[name="username"]');
  const passwordField = page.locator('input[type="password"], input[id*="password"], input[name*="password"]');
  const loginButton = page.locator('button:has-text("Log in"), button:has-text("Sign in"), input[type="submit"]');
  if (await emailField.count()) {
    if (email) {
      await emailField.first().fill(email).catch(() => {});
    }
    if (await passwordField.count()) {
      await passwordField.first().focus().catch(() => {});
    }
    try {
      await page.evaluate(() => alert('Please enter your Twilio password (and complete any 2FA), then submit. I will proceed automatically once logged in.'));
    } catch {}
    // Attempt a gentle click on login if visible
    if (await loginButton.count()) {
      await loginButton.first().click({ timeout: 2000 }).catch(() => {});
    }
    // Wait up to 3 minutes for console to show SID
    for (let i = 0; i < 180; i++) {
      await page.waitForTimeout(1000);
      const sid = await findPatternAcrossFrames(page, /AC[0-9a-fA-F]{32}/);
      if (sid) break;
    }
  }
}

async function clickRevealNearAuthToken(page) {
  try {
    // Try buttons commonly used for reveal
    const candidates = page.locator(
      'button:has-text("Show"), button:has-text("Reveal"), [aria-label*="Show"], [aria-label*="Reveal"], [data-testid*="reveal"]'
    );
    if (await candidates.count()) {
      await candidates.first().click({ timeout: 2000 }).catch(() => {});
      await page.waitForTimeout(1200);
    }
    // Try buttons within containers that mention "Auth Token"
    const authTokenContainers = page.locator('text=/Auth Token/i');
    if (await authTokenContainers.count()) {
      const btn = authTokenContainers.locator('xpath=..//button|xpath=../..//button');
      if (await btn.count()) {
        await btn.first().click({ timeout: 2000 }).catch(() => {});
        await page.waitForTimeout(1200);
      }
    }
  } catch {}
}

async function extractSidAndToken(page) {
  const urls = [
    'https://www.twilio.com/console/project/settings',
    'https://console.twilio.com/us1/account/settings?frameUrl=%2Fconsole%2Fproject%2Fsettings',
    'https://console.twilio.com/'
  ];
  let sid = null;
  let token = null;
  for (const url of urls) {
    try { await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); } catch {}
    await page.waitForTimeout(3000);
    sid = sid || await findPatternAcrossFrames(page, /AC[0-9a-fA-F]{32}/);
    token = token || await findPatternAcrossFrames(page, /\b(?!AC)[0-9a-fA-F]{32}\b/);
    if (!token) { await clickRevealNearAuthToken(page); }
    token = token || await findPatternAcrossFrames(page, /\b(?!AC)[0-9a-fA-F]{32}\b/);
    if (sid && token) break;
  }
  // If token missing, prompt user and poll for up to ~60s
  if (sid && !token) {
    try { await page.evaluate(() => alert('Please click the eye/reveal icon to show Auth Token; the script will capture it automatically.')); } catch {}
    for (let i = 0; i < 30 && !token; i++) {
      await page.waitForTimeout(2000);
      await clickRevealNearAuthToken(page);
      token = token || await findPatternAcrossFrames(page, /\b(?!AC)[0-9a-fA-F]{32}\b/);
    }
  }
  return { sid, token };
}

async function extractPhoneNumber(page) {
  const urls = [
    'https://console.twilio.com/us1/develop/phone-numbers/manage/active',
    'https://www.twilio.com/console/phone-numbers/incoming'
  ];
  let phone = null;
  for (const url of urls) {
    try { await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); } catch {}
    await page.waitForTimeout(3000);
    phone = phone || await findPatternAcrossFrames(page, /\+\d{10,15}/);
    if (phone) break;
  }
  return phone;
}

async function main() {
  const userDataDir = getWindowsBrowserProfilePath();
  console.log('Using browser profile:', userDataDir);
  const context = await chromium.launchPersistentContext(userDataDir, { headless: false });
  const page = await context.newPage();

  await loginIfNeeded(page, TWILIO_EMAIL);

  let { sid, token } = await extractSidAndToken(page);
  let phone = await extractPhoneNumber(page);

  // If missing SID/token, guide user to login/reveal and poll for up to ~3 minutes
  if (!sid || !token) {
    try {
      await page.goto('https://www.twilio.com/console/project/settings', { waitUntil: 'domcontentloaded', timeout: 60000 });
    } catch {}
    try {
      await page.evaluate(() => alert('Please login to Twilio (Google SSO if applicable), open Project Settings, and click the eye/reveal for Auth Token. I will capture it automatically.'));
    } catch {}
    for (let i = 0; i < 90 && (!sid || !token); i++) {
      await page.waitForTimeout(2000);
      const res = await extractSidAndToken(page);
      sid = sid || res.sid;
      token = token || res.token;
    }
  }

  // If missing phone, guide user to Active Numbers and poll for up to ~2 minutes
  if (!phone) {
    try {
      await page.goto('https://console.twilio.com/us1/develop/phone-numbers/manage/active', { waitUntil: 'domcontentloaded', timeout: 60000 });
    } catch {}
    try {
      await page.evaluate(() => alert('Please ensure Active Numbers are visible. I will capture a number automatically.'));
    } catch {}
    for (let i = 0; i < 60 && !phone; i++) {
      await page.waitForTimeout(2000);
      phone = phone || await extractPhoneNumber(page);
    }
  }

  if (!sid) {
    console.error('Failed to extract Account SID. Ensure you are logged into Twilio Console.');
  }
  if (!token) {
    console.error('Failed to extract Auth Token. Reveal it in Project Settings.');
  }
  if (!phone) {
    console.error('Failed to extract Twilio phone number. Ensure Active Numbers page shows E.164 numbers.');
  }

  const envPath = path.join(__dirname, '..', 'backend', '.env');
  const BASE_URL = 'http://localhost:3001';
  const lines = [
    `NODE_ENV=development`,
    `PORT=3001`,
    `BASE_URL=${BASE_URL}`,
    `JWT_SECRET=replace_with_strong_secret`,
    sid ? `TWILIO_ACCOUNT_SID=${sid}` : `# TWILIO_ACCOUNT_SID=AC...`,
    token ? `TWILIO_AUTH_TOKEN=${token}` : `# TWILIO_AUTH_TOKEN=...`,
    phone ? `TWILIO_PHONE_NUMBER=${phone}` : `# TWILIO_PHONE_NUMBER=+1XXXXXXXXXX`,
    `TWILIO_MOCK=false`
  ];

  fs.writeFileSync(envPath, lines.join('\n') + '\n', 'utf8');
  console.log('Wrote .env to', envPath);
  console.log('Summary:');
  console.log('- Account SID:', sid ? 'captured' : 'missing');
  console.log('- Auth Token:', token ? 'captured' : 'missing');
  console.log('- Phone Number:', phone ? 'captured' : 'missing');

  await context.close();
}

main().catch(async (e) => {
  console.error('Twilio scrape failed:', e);
  process.exit(1);
});