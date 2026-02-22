/**
 * Databricks OAuth Token Exchange API Route
 * CRITICAL: This must run server-side to keep client_secret secure
 */

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, workspaceHost, grantType = 'authorization_code', refreshToken } = req.body;

  console.log(`[OAuth] Received ${grantType} request for workspace: ${workspaceHost}`);

  // Validate required environment variables
  if (!process.env.DATABRICKS_CLIENT_ID) {
    console.error('❌ Missing DATABRICKS_CLIENT_ID environment variable');
    return res.status(500).json({ 
      error: 'Server configuration error: Missing DATABRICKS_CLIENT_ID. Please contact administrator.' 
    });
  }
  
  if (!process.env.DATABRICKS_CLIENT_SECRET) {
    console.error('❌ Missing DATABRICKS_CLIENT_SECRET environment variable');
    return res.status(500).json({ 
      error: 'Server configuration error: Missing DATABRICKS_CLIENT_SECRET. Please contact administrator.' 
    });
  }
  
  if (!process.env.DATABRICKS_REDIRECT_URI) {
    console.error('⚠️ Missing DATABRICKS_REDIRECT_URI environment variable, will use default');
  }

  // Validate input based on grant type
  if (grantType === 'authorization_code') {
    if (!code || !workspaceHost) {
      console.error('❌ Missing code or workspaceHost');
      return res.status(400).json({ 
        error: 'Missing required parameters: code and workspaceHost' 
      });
    }
  } else if (grantType === 'refresh_token') {
    if (!refreshToken || !workspaceHost) {
      console.error('❌ Missing refreshToken or workspaceHost');
      return res.status(400).json({ 
        error: 'Missing required parameters: refreshToken and workspaceHost' 
      });
    }
  } else {
    return res.status(400).json({ error: 'Invalid grant_type' });
  }

  try {
    const tokenUrl = `https://${workspaceHost}/oidc/v1/token`;
    
    // Build request body based on grant type
    const params = new URLSearchParams({
      client_id: process.env.DATABRICKS_CLIENT_ID,
      client_secret: process.env.DATABRICKS_CLIENT_SECRET,
      grant_type: grantType,
    });

    if (grantType === 'authorization_code') {
      params.append('code', code);
      const redirectUri = process.env.DATABRICKS_REDIRECT_URI || '';
      params.append('redirect_uri', redirectUri);
      console.log(`[OAuth] Using redirect_uri: ${redirectUri}`);
    } else if (grantType === 'refresh_token') {
      params.append('refresh_token', refreshToken);
    }

    console.log(`[OAuth] Requesting token from: ${tokenUrl}`);

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [OAuth] Token exchange failed with status ${response.status}:`, errorText);
      
      // Try to parse error as JSON for better error messages
      let errorMessage = 'Failed to exchange code for token';
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error_description) {
          errorMessage = errorJson.error_description;
        } else if (errorJson.error) {
          errorMessage = errorJson.error;
        }
      } catch (e) {
        // Use raw error text if not JSON
        errorMessage = errorText || errorMessage;
      }
      
      return res.status(response.status).json({ 
        error: errorMessage,
        statusCode: response.status,
        details: errorText 
      });
    }

    const tokenData = await response.json();

    console.log('✅ [OAuth] Token exchange successful');

    return res.status(200).json(tokenData);
  } catch (error) {
    console.error('❌ [OAuth] Token exchange error:', error);
    return res.status(500).json({ 
      error: 'Internal server error during token exchange',
      message: error.message 
    });
  }
}