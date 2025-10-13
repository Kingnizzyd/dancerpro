const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 5500;
const ROOT = path.join(__dirname, '..', 'dist');

const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json',
};

function safePath(urlPath) {
  try {
    const clean = decodeURIComponent(urlPath.split('?')[0]).replace(/\\+/g, '/');
    const full = path.join(ROOT, clean);
    if (fs.existsSync(full) && fs.statSync(full).isFile()) return full;
  } catch {}
  return path.join(ROOT, 'index.html');
}

const server = http.createServer((req, res) => {
  const filePath = safePath(req.url === '/' ? '/index.html' : req.url);
  const ext = path.extname(filePath).toLowerCase();
  const type = MIME[ext] || 'application/octet-stream';
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/plain');
      res.end('Not found');
      return;
    }
    res.statusCode = 200;
    res.setHeader('Content-Type', type);
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Static preview available at http://localhost:${PORT}/`);
});