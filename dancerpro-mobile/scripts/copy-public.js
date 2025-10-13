const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');
const distDir = path.join(__dirname, '..', 'dist');

if (!fs.existsSync(publicDir)) {
  console.log('No public/ directory found, skipping copy.');
  process.exit(0);
}

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

const entries = fs.readdirSync(publicDir, { withFileTypes: true });
for (const entry of entries) {
  if (entry.isFile()) {
    const src = path.join(publicDir, entry.name);
    const dest = path.join(distDir, entry.name);
    fs.copyFileSync(src, dest);
    console.log(`Copied ${entry.name} to dist/`);
  }
}