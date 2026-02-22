import React, { useEffect, useState } from 'react';
import { handleOAuthCallback } from '../utils/databricksAuth';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react@0.487.0';
import { colors } from '../styles/cohive-theme';

interface OAuthCallbackProps {
  onSuccess: () => void;
  onError: (error: Error) => void;
}

export function OAuthCallback({ onSuccess, onError }: OAuthCallbackProps) {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Completing authentication...');
  const [errorDetails, setErrorDetails] = useState<string>('');

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      setStatus('loading');
      setMessage('Exchanging authorization code...');
      
      console.log('🔐 Starting OAuth callback handling...');

      const session = await handleOAuthCallback().catch(err => {
        console.error('❌ OAuth callback error:', err);
        throw err;
      });

      if (session) {
        console.log('✅ Session created successfully');
        setStatus('success');
        setMessage('Authentication successful! Redirecting...');
        
        // Wait a moment before redirecting
        setTimeout(() => {
          onSuccess();
        }, 1500);
      } else {
        throw new Error('Failed to create session - session is null or undefined');
      }
    } catch (error) {
      console.error('❌ OAuth callback failed:', error);
      setStatus('error');
      
      const errorObj = error instanceof Error ? error : new Error('Authentication failed');
      const errorMessage = errorObj.message || 'Authentication failed';
      
      setMessage(errorMessage);
      
      // Capture additional error details for debugging
      if (error && typeof error === 'object') {
        const details = JSON.stringify(error, null, 2);
        setErrorDetails(details);
        console.error('Error details:', details);
      }
      
      onError(errorObj);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colors.background.primary }}>
      <div className="max-w-md w-full p-8 rounded-lg border" style={{ 
        backgroundColor: colors.background.secondary,
        borderColor: colors.border.light 
      }}>
        <div className="flex flex-col items-center gap-6 text-center">
          {/* Icon */}
          {status === 'loading' && (
            <Loader2 className="h-16 w-16 animate-spin" style={{ color: colors.hex.purple.light }} />
          )}
          {status === 'success' && (
            <CheckCircle2 className="h-16 w-16" style={{ color: colors.hex.Findings }} />
          )}
          {status === 'error' && (
            <AlertCircle className="h-16 w-16" style={{ color: '#ef4444' }} />
          )}

          {/* Message */}
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold" style={{ color: colors.text.primary }}>
              {status === 'loading' && 'Authenticating...'}
              {status === 'success' && 'Success!'}
              {status === 'error' && 'Authentication Failed'}
            </h2>
            <p className="text-sm" style={{ color: colors.text.secondary }}>
              {message}
            </p>
            
            {/* Show detailed error info */}
            {status === 'error' && errorDetails && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-xs" style={{ color: colors.text.secondary }}>
                  Technical Details
                </summary>
                <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-40" style={{ color: colors.text.primary }}>
                  {errorDetails}
                </pre>
              </details>
            )}
          </div>

          {/* Additional info for error state */}
          {status === 'error' && (
            <div className="flex flex-col gap-3 w-full">
              <button
                onClick={() => window.location.href = '/'}
                className="px-4 py-2 rounded-lg text-white"
                style={{ backgroundColor: colors.hex.purple.light }}
              >
                Return to CoHive
              </button>
              <p className="text-xs" style={{ color: colors.text.secondary }}>
                Check the browser console (F12) for more details
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}