# Databricks OAuth Troubleshooting Guide

## Error: Authentication Failed

If you see an error page after authenticating with Databricks, follow these steps to diagnose the issue:

### 1. Check Browser Console

1. Open browser developer tools (Press `F12`)
2. Go to the **Console** tab
3. Look for error messages starting with `❌`
4. Take note of any error details

### 2. Common Issues and Solutions

#### Missing Environment Variables

**Error Message:**
```
Server configuration error: Missing DATABRICKS_CLIENT_ID
Server configuration error: Missing DATABRICKS_CLIENT_SECRET
```

**Solution:**
You need to set up environment variables on your server:

```bash
DATABRICKS_CLIENT_ID=your_client_id_here
DATABRICKS_CLIENT_SECRET=your_client_secret_here
DATABRICKS_REDIRECT_URI=https://yourdomain.com/oauth/callback
```

For Vercel deployment, add these in: **Project Settings → Environment Variables**

#### Redirect URI Mismatch

**Error Message:**
```
redirect_uri_mismatch
Invalid redirect_uri
```

**Solution:**
1. Check that `DATABRICKS_REDIRECT_URI` environment variable matches exactly what's configured in your Databricks OAuth app
2. The redirect URI should be: `https://yourdomain.com/oauth/callback`
3. Make sure there are no trailing slashes
4. Protocol must be `https://` (not `http://`) for production

#### Invalid Authorization Code

**Error Message:**
```
invalid_grant
Authorization code has expired
```

**Solution:**
- This usually means you waited too long between authenticating and the redirect
- Simply try authenticating again
- Authorization codes expire after a few minutes

#### Network/CORS Issues

**Error Message:**
```
Failed to fetch
Network request failed
```

**Solution:**
1. Check your internet connection
2. Verify that the `/api/databricks/auth` endpoint is accessible
3. Check server logs for more details
4. Ensure CORS is properly configured

### 3. View Technical Details

On the error page:
1. Click **"Technical Details"** to expand error information
2. This shows the raw error response from the server
3. Copy this information when reporting issues

### 4. Check Server Logs

If deployed on Vercel:
1. Go to your Vercel dashboard
2. Select your project
3. Go to **Deployments** → Click your deployment
4. Click **Functions** tab
5. Look for logs from `/api/databricks/auth`

### 5. Verify Databricks OAuth Configuration

In your Databricks workspace:
1. Go to **Settings** → **OAuth Applications**
2. Find your CoHive application
3. Verify:
   - **Client ID** matches `DATABRICKS_CLIENT_ID` env var
   - **Redirect URIs** includes your callback URL exactly
   - The application is enabled/active

### 6. Test in Different Browser

Sometimes browser extensions or cache can cause issues:
1. Try in incognito/private mode
2. Clear browser cache and cookies
3. Try a different browser

### 7. Still Having Issues?

If none of the above helps:

1. **Copy Error Details:**
   - Error message from the error page
   - Console logs (from browser F12)
   - Server logs (from Vercel dashboard)

2. **Check Configuration:**
   - Environment variables are set correctly
   - Redirect URI matches exactly
   - Workspace host is correct

3. **Contact Support:**
   - Include all error details
   - Include steps to reproduce
   - Include screenshots if helpful

## Environment Variables Checklist

Required for OAuth to work:

- [ ] `DATABRICKS_CLIENT_ID` - From Databricks OAuth app
- [ ] `DATABRICKS_CLIENT_SECRET` - From Databricks OAuth app  
- [ ] `DATABRICKS_REDIRECT_URI` - Must be `https://yourdomain.com/oauth/callback`
- [ ] `VITE_DATABRICKS_CLIENT_ID` - Same as DATABRICKS_CLIENT_ID (for frontend)
- [ ] `VITE_DATABRICKS_REDIRECT_URI` - Same as DATABRICKS_REDIRECT_URI (for frontend)

## OAuth Flow Diagram

```
User clicks hex
    ↓
DatabricksAuthPrompt shows
    ↓
User enters workspace host
    ↓
Redirects to Databricks OAuth page
    ↓
User authorizes
    ↓
Databricks redirects to /oauth/callback?code=xxx&state=yyy
    ↓
OAuthCallback component loads
    ↓
Calls /api/databricks/auth with code
    ↓
Server exchanges code for token
    ↓
Token stored in sessionStorage
    ↓
Redirects back to hex page
    ↓
Success! User can now use hexes
```

## Quick Test

To test if OAuth is working:

1. Clear sessionStorage (Browser DevTools → Application → Session Storage → Clear All)
2. Refresh the page
3. Click any hex that requires Databricks
4. Enter your workspace host (e.g., `your-workspace.cloud.databricks.com`)
5. Authorize on Databricks
6. Should redirect back to CoHive hex page successfully

If it fails, check the error message and follow troubleshooting steps above.
