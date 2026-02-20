/**
 * useDatabricksAuth Hook
 * 
 * PROTECTED FILE - DO NOT REGENERATE FROM FIGMA
 * 
 * This hook encapsulates all Databricks authentication logic,
 * keeping it separate from UI components that Figma-Make might regenerate.
 * 
 * Features:
 * - OAuth login flow
 * - Session management
 * - Token refresh
 * - Health checks
 */

import { useState, useEffect, useCallback } from 'react';
import {
  isAuthenticated as checkIsAuthenticated,
  initiateLogin,
  logout as performLogout,
  getWorkspaceHost as getStoredWorkspaceHost,
  handleOAuthCallback,
  getSession,
} from '../utils/databricksAuth';
import { checkDatabricksHealth } from '../utils/databricksClient';

export function useDatabricksAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [workspaceHost, setWorkspaceHost] = useState<string | null>(null);
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);

  /**
   * Check authentication status
   */
  const checkAuth = useCallback(() => {
    const authenticated = checkIsAuthenticated();
    setIsAuthenticated(authenticated);
    
    if (authenticated) {
      const host = getStoredWorkspaceHost();
      setWorkspaceHost(host);
    } else {
      setWorkspaceHost(null);
    }
  }, []);

  /**
   * Login to Databricks
   */
  const login = useCallback((workspaceUrl: string) => {
    try {
      setOauthError(null);
      initiateLogin(workspaceUrl);
      // User will be redirected, so component will unmount
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initiate login';
      setOauthError(errorMessage);
      console.error('Login error:', err);
    }
  }, []);

  /**
   * Logout from Databricks
   */
  const logout = useCallback(() => {
    performLogout();
    setIsAuthenticated(false);
    setWorkspaceHost(null);
    setIsHealthy(null);
  }, []);

  /**
   * Handle OAuth callback
   */
  const handleCallback = useCallback(async () => {
    try {
      setOauthError(null);
      const session = await handleOAuthCallback();
      
      if (session) {
        setIsAuthenticated(true);
        setWorkspaceHost(session.workspaceHost);
        return session;
      }
      
      return null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'OAuth callback failed';
      setOauthError(errorMessage);
      console.error('OAuth callback error:', err);
      return null;
    }
  }, []);

  /**
   * Check API health
   */
  const checkHealth = useCallback(async () => {
    if (!isAuthenticated) {
      setIsHealthy(false);
      return false;
    }

    setIsCheckingHealth(true);
    
    try {
      const healthy = await checkDatabricksHealth();
      setIsHealthy(healthy);
      return healthy;
    } catch (err) {
      console.error('Health check failed:', err);
      setIsHealthy(false);
      return false;
    } finally {
      setIsCheckingHealth(false);
    }
  }, [isAuthenticated]);

  /**
   * Get session details
   */
  const getSessionInfo = useCallback(() => {
    const session = getSession();
    if (!session) return null;

    const expiresIn = session.expiresAt - Date.now();
    const expiresInMinutes = Math.floor(expiresIn / 1000 / 60);

    return {
      workspaceHost: session.workspaceHost,
      expiresAt: new Date(session.expiresAt),
      expiresInMinutes,
      hasRefreshToken: !!session.refreshToken,
    };
  }, []);

  /**
   * Check if session will expire soon
   */
  const willExpireSoon = useCallback((thresholdMinutes: number = 5): boolean => {
    const sessionInfo = getSessionInfo();
    if (!sessionInfo) return false;
    
    return sessionInfo.expiresInMinutes < thresholdMinutes;
  }, [getSessionInfo]);

  // Check auth status on mount and when storage changes
  useEffect(() => {
    checkAuth();

    // Listen for storage changes (in case user logs in/out in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'cohive_databricks_session') {
        checkAuth();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [checkAuth]);

  // Check health when authentication status changes
  useEffect(() => {
    if (isAuthenticated) {
      checkHealth();
    }
  }, [isAuthenticated, checkHealth]);

  return {
    // State
    isAuthenticated,
    workspaceHost,
    isHealthy,
    isCheckingHealth,
    oauthError,

    // Actions
    login,
    logout,
    handleCallback,
    checkAuth,
    checkHealth,

    // Utilities
    getSessionInfo,
    willExpireSoon,
  };
}
