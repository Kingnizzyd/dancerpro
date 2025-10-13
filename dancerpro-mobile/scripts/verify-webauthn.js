// Lightweight verification of WebAuthn endpoints without performing authenticator operations.
// Runs against local backend at http://localhost:3001 by default.

const http = require('http');

const BASE = process.env.BASE || 'http://localhost:3001';
const rpID = process.env.RPID || 'localhost';
const email = process.env.TEST_EMAIL || 'testuser@example.com';

function postJSON(url, data) {
  return new Promise((resolve, reject) => {
    const { hostname, port, pathname } = new URL(url);
    const payload = Buffer.from(JSON.stringify(data));
    const options = {
      hostname,
      port: port || 80,
      path: pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': payload.length,
      },
    };
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(body || '{}');
          resolve({ status: res.statusCode, json });
        } catch (e) {
          resolve({ status: res.statusCode, text: body });
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function main() {
  console.log('Verifying WebAuthn endpoints...');
  console.log(`BASE=${BASE}, rpID=${rpID}, email=${email}`);

  // 1) Register start (discoverable required in backend)
  const regStart = await postJSON(`${BASE}/api/webauthn/register/start`, { email, rpID });
  console.log('\n/register/start status:', regStart.status);
  console.log('response keys:', regStart.json ? Object.keys(regStart.json) : regStart.text);
  const regOptions = regStart.json && regStart.json.options;
  if (regStart.status !== 200 || !regOptions || !regOptions.challenge) {
    throw new Error('Register start failed or missing challenge in options');
  }

  // 2) Login start (email-based)
  const loginStart = await postJSON(`${BASE}/api/webauthn/login/start`, { email, rpID });
  console.log('\n/login/start status:', loginStart.status);
  console.log('response keys:', loginStart.json ? Object.keys(loginStart.json) : loginStart.text);
  const loginOptions = loginStart.json && loginStart.json.options;
  if (loginStart.status !== 200 || !loginOptions || !loginOptions.challenge) {
    throw new Error('Login start failed or missing challenge in options');
  }

  // 3) Usernameless login start (discoverable credentials)
  const ulStart = await postJSON(`${BASE}/api/webauthn/login/start/usernameless`, { rpID });
  console.log('\n/login/start/usernameless status:', ulStart.status);
  console.log('response keys:', ulStart.json ? Object.keys(ulStart.json) : ulStart.text);
  const ulOptions = ulStart.json && ulStart.json.options;
  if (ulStart.status !== 200 || !ulOptions || !ulOptions.challenge) {
    throw new Error('Usernameless login start failed or missing challenge in options');
  }

  console.log('\nAll endpoint verifications passed.');
}

main().catch((err) => {
  console.error('Verification failed:', err && err.message ? err.message : err);
  process.exit(1);
});