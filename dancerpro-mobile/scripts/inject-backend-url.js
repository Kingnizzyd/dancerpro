const fs = require('fs');
const path = require('path');

// Prefer EXPO_PUBLIC_BACKEND_URL when valid; otherwise fallback to app.json extra.backendUrl
let backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
try {
  const appJsonPath = path.join(__dirname, '..', 'app.json');
  if (fs.existsSync(appJsonPath)) {
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    const extraDefault = appJson?.expo?.extra?.backendUrl;
    // If env is missing, invalid, or points to a transient tunnel, use stable default
    const invalidEnv = !backendUrl || !/^https?:\/\//i.test(backendUrl) || /trycloudflare\.com/i.test(backendUrl);
    if (invalidEnv && extraDefault) {
      backendUrl = extraDefault;
    }
  }
} catch (e) {
  // noop: will use whatever backendUrl is set to
}

// For Netlify builds, don't inject localhost URLs - let the config.js handle Netlify detection
const isNetlifyBuild = process.env.NETLIFY === 'true' || process.env.CONTEXT === 'production' || process.env.CONTEXT === 'deploy-preview';
if (isNetlifyBuild && backendUrl && backendUrl.includes('localhost')) {
  console.log('Netlify build detected - skipping localhost backend URL injection to allow runtime detection');
  process.exit(0);
}

if (!backendUrl) {
  console.warn('No valid backend URL resolved for injection. Skipping injection.');
  process.exit(0);
}

const distIndex = path.join(__dirname, '..', 'dist', 'index.html');
if (!fs.existsSync(distIndex)) {
  console.warn('dist/index.html not found. Skipping backend URL injection.');
  process.exit(0);
}

const html = fs.readFileSync(distIndex, 'utf8');
const injection = `\n<script>window.__BACKEND_URL__ = '${backendUrl.replace(/'/g, "\\'")}';</script>\n`;

// Place injection right before the Expo AppEntry script tag
const marker = '/_expo/static/js/web/AppEntry-';
let updated = html;
if (html.includes(marker)) {
  updated = html.replace(
    /<script\s+src="\/_expo\/static\/js\/web\/AppEntry-[^"]+"\s+defer><\/script>/,
    `${injection}$&`
  );
} else {
  // Fallback: inject after <head>
  updated = html.replace('<head>', `<head>${injection}`);
}

fs.writeFileSync(distIndex, updated, 'utf8');
console.log('Injected window.__BACKEND_URL__ into dist/index.html');