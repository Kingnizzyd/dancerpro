// Configuration for backend URL
// Priority: 1. EXPO_PUBLIC_BACKEND_URL (CI/Netlify builds)
//           2. Runtime overrides (window.__BACKEND_URL__ or URL query param)
//           3. app.json extra
//           4. Development fallback

let BACKEND_URL;

if (typeof window !== 'undefined') {
  // Web environment
  const urlParams = new URLSearchParams(window.location.search);
  const queryBackendUrl = urlParams.get('backendUrl');
  
  BACKEND_URL = 
    process.env.EXPO_PUBLIC_BACKEND_URL ||
    window.__BACKEND_URL__ ||
    queryBackendUrl ||
    require('../app.json').expo?.extra?.backendUrl ||
    'http://localhost:3001';
    
  // For Netlify Functions, use the current site's functions endpoint
  if (window.location.hostname.includes('netlify.app') || window.location.hostname.includes('netlify.com')) {
    BACKEND_URL = `${window.location.origin}/.netlify/functions`;
  }
} else {
  // Native environment
  BACKEND_URL = 
    process.env.EXPO_PUBLIC_BACKEND_URL ||
    require('../app.json').expo?.extra?.backendUrl ||
    'http://localhost:3001';
}

export { BACKEND_URL };