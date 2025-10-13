const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');
const indexPath = path.join(distDir, 'index.html');
const manifestPath = path.join(distDir, 'manifest.webmanifest');
const swPath = path.join(distDir, 'sw.js');
const faviconPath = path.join(distDir, 'favicon.png');

if (!fs.existsSync(indexPath)) {
  console.error('dist/index.html not found. Run export before adding PWA assets.');
  process.exit(1);
}

// Create a simple manifest
const manifest = {
  name: 'DancerPro',
  short_name: 'DancerPro',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  theme_color: '#0d0d0d',
  background_color: '#0d0d0d',
  icons: [
    { src: '/favicon.png', sizes: '192x192', type: 'image/png' },
    { src: '/favicon.png', sizes: '512x512', type: 'image/png' },
  ],
};

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

// Minimal service worker: claim clients; pass-through fetch; placeholder cache for index
const sw = `self.addEventListener('install', (event) => { self.skipWaiting(); });
self.addEventListener('activate', (event) => { event.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', (event) => { event.respondWith(fetch(event.request)); });`;
fs.writeFileSync(swPath, sw, 'utf8');

// Ensure a favicon.png exists to prevent 404s referenced by manifest and iOS icon
if (!fs.existsSync(faviconPath)) {
  // 1x1 transparent PNG (base64)
  const base64Png =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==';
  fs.writeFileSync(faviconPath, Buffer.from(base64Png, 'base64'));
  console.log('Generated placeholder favicon.png in dist/');
}

// Inject manifest link, iOS meta/icon, and SW registration into index.html
let html = fs.readFileSync(indexPath, 'utf8');

const headInject = [
  '<link rel="manifest" href="/manifest.webmanifest">',
  '<meta name="apple-mobile-web-app-capable" content="yes">',
  '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">',
  '<link rel="apple-touch-icon" href="/favicon.png">',
].join('\n');

// Inject into <head>
html = html.replace('<head>', `<head>\n${headInject}\n`);

// Register service worker before closing body
const swRegister = `\n<script>if ('serviceWorker' in navigator) { navigator.serviceWorker.register('/sw.js').catch(()=>{}); }</script>\n`;
html = html.replace('</body>', `${swRegister}</body>`);

fs.writeFileSync(indexPath, html, 'utf8');
console.log('PWA assets added: manifest.webmanifest, sw.js, and HTML injections completed.');