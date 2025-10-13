# DancerPro - Full App Deployment on Netlify

This guide explains how to deploy the entire DancerPro application (frontend + backend) on Netlify using Netlify Functions.

## Architecture

- **Frontend**: React Native Web (Expo) - Static site
- **Backend**: Netlify Functions - Serverless API endpoints
- **Database**: File-based storage in `/tmp` (ephemeral)
- **Authentication**: JWT tokens with bcrypt password hashing

## Deployment Steps

### 1. Connect Repository to Netlify

1. Go to [Netlify](https://netlify.com) and sign in
2. Click "New site from Git"
3. Connect your GitHub repository
4. Choose the `dancerpro-mobile` folder as the base directory

### 2. Configure Build Settings

Netlify should automatically detect the `netlify.toml` configuration:

```toml
[build]
  command = "cd netlify/functions && npm install && cd ../.. && npx expo export -p web --output-dir dist && node scripts/add-pwa-assets.js && node scripts/inject-backend-url.js && node scripts/copy-public.js"
  publish = "dist"
  functions = "netlify/functions"
```

### 3. Set Environment Variables

In Netlify Dashboard → Site Settings → Environment Variables, add:

**Required:**
- `JWT_SECRET`: A secure random string for JWT token signing
- `NODE_VERSION`: `20`

**Optional (for SMS features):**
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_API_KEY_SID`
- `TWILIO_API_KEY_SECRET`
- `TWILIO_PHONE_NUMBER`

**Rate Limiting (optional):**
- `LOGIN_RATE_LIMIT`: `30`
- `LOGIN_RATE_WINDOW_MS`: `60000`
- `REGISTER_RATE_LIMIT`: `20`
- `REGISTER_RATE_WINDOW_MS`: `60000`

### 4. Deploy

1. Click "Deploy site"
2. Wait for the build to complete
3. Your app will be available at `https://your-site-name.netlify.app`

## API Endpoints

After deployment, your backend API will be available at:

- `https://your-site.netlify.app/.netlify/functions/health` - Health check
- `https://your-site.netlify.app/.netlify/functions/auth-login` - User login
- `https://your-site.netlify.app/.netlify/functions/auth-register` - User registration
- `https://your-site.netlify.app/.netlify/functions/sync-import` - Get cloud snapshot
- `https://your-site.netlify.app/.netlify/functions/sync-export` - Save cloud snapshot

## Frontend Configuration

The frontend automatically detects when running on Netlify and configures the backend URL to use Netlify Functions:

```javascript
// lib/config.js automatically sets:
BACKEND_URL = "https://your-site.netlify.app/.netlify/functions"
```

## Data Persistence

**Important**: Netlify Functions use ephemeral storage (`/tmp`). Data will be lost between deployments and function cold starts.

For production use, consider:
- External database (PostgreSQL, MongoDB)
- Cloud storage (AWS S3, Google Cloud Storage)
- Netlify Blobs (for simple key-value storage)

## Testing

1. Visit your deployed site
2. Register a new account
3. Login with your credentials
4. Test the "Sync Cloud" feature on the Dashboard
5. Verify data persistence within the same session

## Troubleshooting

### Build Failures
- Check build logs in Netlify Dashboard
- Ensure all environment variables are set
- Verify Node.js version is 20

### Function Errors
- Check function logs in Netlify Dashboard → Functions
- Verify JWT_SECRET is set
- Check CORS headers in browser developer tools

### Frontend Issues
- Check browser console for errors
- Verify BACKEND_URL is correctly set to Netlify Functions
- Test API endpoints directly in browser/Postman

## Local Development

To test locally with Netlify Functions:

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Run local development server
netlify dev
```

This will start both the frontend and Netlify Functions locally.

## Security Notes

- JWT_SECRET should be a strong, random string
- User passwords are hashed with bcrypt (12 rounds)
- CORS is configured to allow all origins (adjust for production)
- Rate limiting is implemented for login/registration
- All API endpoints require authentication except health, login, and register