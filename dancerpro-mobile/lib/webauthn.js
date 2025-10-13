// WebAuthn helper for browser passkeys (desktop & iOS Safari)
// Fallbacks gracefully when not on web platform.

import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import { BACKEND_URL } from './config';

function getBackendBase() {
  // Prefer injected backend URL in web export; fallback to local dev.
  if (typeof window !== 'undefined') {
    const injected = window.__BACKEND_URL__;
    if (injected) return injected;
    if (BACKEND_URL) return BACKEND_URL;
    return 'http://localhost:3001';
  }
  return BACKEND_URL || 'http://localhost:3001';
}

function getRpID() {
  if (typeof window !== 'undefined') {
    try {
      return window.location.hostname;
    } catch {}
  }
  return 'localhost';
}

function getOrigin() {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return 'http://localhost:5500';
}

export async function createPasskey(email) {
  const base = getBackendBase();
  const rpID = getRpID();
  const origin = getOrigin();
  // 1) Get registration options from backend
  const startResp = await fetch(`${base}/api/webauthn/register/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, rpID }),
  });
  if (!startResp.ok) throw new Error(`Failed to get registration options: ${await startResp.text()}`);
  const { options } = await startResp.json();

  // 2) Start registration in browser
  const attResp = await startRegistration(options);

  // 3) Send attestation response to backend for verification
  const finishResp = await fetch(`${base}/api/webauthn/register/finish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, response: attResp, rpID, origin }),
  });
  if (!finishResp.ok) throw new Error(`Registration verification failed: ${await finishResp.text()}`);
  return finishResp.json();
}

export async function loginWithPasskey(email) {
  const base = getBackendBase();
  const rpID = getRpID();
  const origin = getOrigin();
  // 1) Get authentication options
  const startResp = await fetch(`${base}/api/webauthn/login/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, rpID }),
  });
  if (!startResp.ok) throw new Error(`Failed to get authentication options: ${await startResp.text()}`);
  const { options } = await startResp.json();

  // 2) Start authentication in browser
  const assertionResp = await startAuthentication(options);

  // 3) Verify assertion at backend
  const finishResp = await fetch(`${base}/api/webauthn/login/finish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, response: assertionResp, rpID, origin }),
  });
  if (!finishResp.ok) throw new Error(`Authentication verification failed: ${await finishResp.text()}`);
  return finishResp.json();
}

export async function loginWithPasskeyDiscoverable() {
  const base = getBackendBase();
  const rpID = getRpID();
  const origin = getOrigin();
  // 1) Get authentication options without allowCredentials
  const startResp = await fetch(`${base}/api/webauthn/login/start/usernameless`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rpID }),
  });
  if (!startResp.ok) throw new Error(`Failed to get usernameless auth options: ${await startResp.text()}`);
  const { options } = await startResp.json();

  // 2) Start authentication in browser
  const assertionResp = await startAuthentication(options);

  // 3) Verify assertion at backend
  const finishResp = await fetch(`${base}/api/webauthn/login/finish/usernameless`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ response: assertionResp, rpID, origin }),
  });
  if (!finishResp.ok) throw new Error(`Usernameless authentication failed: ${await finishResp.text()}`);
  return finishResp.json();
}