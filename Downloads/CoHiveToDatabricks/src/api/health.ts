/**
 * Vercel Serverless Function: Health Check
 * Simple endpoint to verify the API is running
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  return res.status(200).json({
    status: 'healthy',
    service: 'CoHive API',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
}
