# Databricks Testing App

A simple application to test Databricks methods through an intuitive UI. Each button controls a single function in Databricks.

## Configuration

- **Databricks Deployment**: dbc-1b7ba151-05e9
- **Databricks URL**: https://dbc-1b7ba151-05e9.cloud.databricks.com
- **GitHub**: https://github.com/Lesliewoodresearch/testSimple
- **Backend**: Vercel Serverless Functions

## Features

### Function 1: File Upload
Upload files from your computer to Databricks storage.

## Vercel Backend Setup

To deploy this app on Vercel with Databricks integration, you'll need to create API routes:

### 1. Create `/api/databricks/upload.ts`

```typescript
import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const form = formidable({});
    const [fields, files] = await form.parse(req);
    
    const file = files.file?.[0];
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Read file content
    const fileContent = fs.readFileSync(file.filepath);
    
    // Upload to Databricks
    // You'll need to implement this based on your Databricks setup
    // Example using Databricks REST API:
    const databricksResponse = await fetch(
      'https://dbc-1b7ba151-05e9.cloud.databricks.com/api/2.0/dbfs/put',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.DATABRICKS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path: `/FileStore/uploads/${file.originalFilename}`,
          contents: fileContent.toString('base64'),
          overwrite: true,
        }),
      }
    );

    if (!databricksResponse.ok) {
      throw new Error('Databricks upload failed');
    }

    return res.status(200).json({
      success: true,
      path: `/FileStore/uploads/${file.originalFilename}`,
      message: 'File uploaded successfully',
    });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Upload failed',
    });
  }
}
```

### 2. Environment Variables

Add to your Vercel project settings or `.env.local`:

```
DATABRICKS_TOKEN=your_databricks_token_here
DATABRICKS_URL=https://dbc-1b7ba151-05e9.cloud.databricks.com
```

### 3. Install Dependencies

```bash
npm install formidable
npm install -D @types/formidable
```

## Security

- Databricks credentials are stored securely in Databricks
- Use Vercel environment variables for tokens
- This is a Bring Your Own Data (BYOD) application

## Adding More Functions

To add additional Databricks functions:

1. Add a new button section in `/components/DatabricksTest.tsx`
2. Create corresponding handler function
3. Create new API route in `/api/databricks/`
4. Update this README with implementation details

## Development

```bash
npm install
npm run dev
```

## Deployment

Push to GitHub and connect to Vercel for automatic deployments.
