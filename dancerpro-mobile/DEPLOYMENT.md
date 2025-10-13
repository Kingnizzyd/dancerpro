Deployment Guide (Web)

Prerequisites
- Node `>=16` and a stable `npm`.
- Backend running on `http://localhost:3001` or configured via `app.json` `extra.backendUrl`.

Build
- Run `cmd /c node_modules\\.bin\\expo.cmd export -p web --output-dir dist`.
- Then add PWA assets for installable app: `node scripts/add-pwa-assets.js`.
- Optionally inject backend URL for the deployed site: `node scripts/inject-backend-url.js`.
- Artifacts in `dist/` include `index.html`, `metadata.json`, static assets.

Serve
- Any static host (Netlify, Vercel, GitHub Pages) can serve `dist/`.
- For local test: `npx serve dist` (or any static file server).

Environment
- Frontend backend URL: edit `app.json` `extra.backendUrl` for production.
- Backend `.env` keys: `JWT_SECRET`, `TWILIO_*`, `PORT`. Copy and adapt from `backend/.env.example`.

Backend
- Start: `node backend/server.js`.
- Health: `http://localhost:3001/health`.

Notes
- Dependency versions are pinned in `package.json` for reproducible builds.
- Error boundaries are enabled for graceful failure in production.
- PWA: `manifest.webmanifest` and `sw.js` are generated in `dist/` to enable “Add to Home Screen”/Install on Android and cleaner standalone behavior on iOS.

## Point Frontend to Render Backend
- In Netlify → Site Settings → Environment, set:
  - `EXPO_PUBLIC_BACKEND_URL=https://<your-service>.onrender.com`
- Redeploy the site. Confirm browser console shows:
  - `[Config] Using BACKEND_URL: https://<your-service>.onrender.com`
- Optional override at runtime:
  - `https://dancerprotest.netlify.app/?backend=https://<your-service>.onrender.com`

## CORS Reminder
- Ensure backend CORS `origin` includes your Netlify domain: `https://dancerprotest.netlify.app`.

## One-liner for Export + PWA + Backend Injection (Windows)
- `cmd /c node_modules\\.bin\\expo.cmd export -p web --output-dir dist && node scripts/add-pwa-assets.js && set EXPO_PUBLIC_BACKEND_URL=https://<your-service>.onrender.com && node scripts/inject-backend-url.js`