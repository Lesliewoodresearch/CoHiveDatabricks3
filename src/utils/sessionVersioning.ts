/**
 * Session Versioning Utilities
 * 
 * Handles versioning for iterations and summaries based on brand/project type sessions.
 * 
 * Versioning Rules:
 * - First iteration: Brand_ProjectType_Date (no version suffix)
 * - Continuous iterations: Brand_ProjectType_Date_V2, _V3, _V4... (no letter)
 * - After context switch (working on different brand/project and returning): Brand_ProjectType_Date_Va1, _Va2, _Vb1, _Vb2... (with letter)
 * 
 * Example Flow:
 * - Nike/Packaging first: Nike_Packaging_2026-03-07
 * - Nike/Packaging second: Nike_Packaging_2026-03-07_V2
 * - Nike/Packaging third: Nike_Packaging_2026-03-07_V3
 * - Adidas/Packaging first: Adidas_Packaging_2026-03-07 (context switch)
 * - Adidas/Packaging second: Adidas_Packaging_2026-03-07_V2
 * - Nike/Packaging (returning): Nike_Packaging_2026-03-07_Va1 (context switched back)
 * - Nike/Packaging (next): Nike_Packaging_2026-03-07_Va2
 */

export interface SessionVersion {
  sessionKey: string; // e.g., "Nike_Packaging"
  baseFileName: string; // e.g., "Nike_Packaging_2026-03-07"
  currentVersionLetter: string | null; // null for continuous iterations, 'a', 'b', 'c' after context switch
  iterationNumber: number; // 0 = first (no suffix), 1 = V2, 2 = V3, etc.
  lastModified: number; // timestamp
  contextSwitched: boolean; // true if user worked on different brand/project and came back
}

// Track the last active session globally
let lastActiveSessionKey: string | null = null;

/**
 * Get or create session version tracking for a brand + project type combination
 */
export function getSessionVersion(
  sessionVersions: { [key: string]: SessionVersion },
  brand: string,
  projectType: string
): SessionVersion {
  const sessionKey = `${brand}_${projectType}`;
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const baseFileName = `${brand}_${projectType}_${today}`;
  
  // Check if session exists and is from today
  const existingSession = sessionVersions[sessionKey];
  
  if (existingSession) {
    const existingDate = new Date(existingSession.lastModified).toISOString().split('T')[0];
    
    // If session is from today, check for context switch
    if (existingDate === today) {
      // Check if user switched contexts (worked on different brand/project)
      const contextSwitched = lastActiveSessionKey !== null && lastActiveSessionKey !== sessionKey;
      
      return {
        ...existingSession,
        contextSwitched,
      };
    }
    
    // If session is from a previous day, create new session
    const newSession: SessionVersion = {
      sessionKey,
      baseFileName,
      currentVersionLetter: null,
      iterationNumber: 0,
      lastModified: Date.now(),
      contextSwitched: false,
    };
    
    return newSession;
  }
  
  // No existing session - create new one
  const newSession: SessionVersion = {
    sessionKey,
    baseFileName,
    currentVersionLetter: null,
    iterationNumber: 0,
    lastModified: Date.now(),
    contextSwitched: false,
  };
  
  return newSession;
}

/**
 * Increment version letter (a -> b -> c, etc.)
 */
export function incrementVersionLetter(currentLetter: string | null): string {
  if (!currentLetter) return 'a';
  
  const charCode = currentLetter.charCodeAt(0);
  if (charCode >= 97 && charCode < 122) { // 'a' to 'y'
    return String.fromCharCode(charCode + 1);
  }
  return 'z'; // Max out at 'z'
}

/**
 * Generate iteration filename with proper versioning
 * @param sessionVersions - Current session version state
 * @param brand - Brand name
 * @param projectType - Project type
 * @returns Object with filename and updated session
 */
export function generateIterationFileName(
  sessionVersions: { [key: string]: SessionVersion },
  brand: string,
  projectType: string
): { fileName: string; updatedSession: SessionVersion } {
  const session = getSessionVersion(sessionVersions, brand, projectType);
  const sessionKey = `${brand}_${projectType}`;
  
  let fileName: string;
  let versionLetter = session.currentVersionLetter;
  let iterationNum = session.iterationNumber;
  
  // Determine if this is a context switch scenario
  if (session.contextSwitched && session.iterationNumber > 0) {
    // Context switched - start new version letter series
    versionLetter = incrementVersionLetter(versionLetter);
    iterationNum = 0; // Reset to 0 (will become Va1)
  }
  
  // Increment iteration number
  iterationNum++;
  
  // Generate filename based on rules
  if (iterationNum === 1) {
    // First iteration - no version suffix
    fileName = session.baseFileName;
  } else if (versionLetter === null) {
    // Continuous iterations - use V2, V3, V4... (no letter)
    fileName = `${session.baseFileName}_V${iterationNum}`;
  } else {
    // After context switch - use Va1, Va2, Vb1, Vb2... (with letter)
    fileName = `${session.baseFileName}_V${versionLetter}${iterationNum}`;
  }
  
  // Create updated session
  const updatedSession: SessionVersion = {
    ...session,
    currentVersionLetter: versionLetter,
    iterationNumber: iterationNum,
    lastModified: Date.now(),
    contextSwitched: false, // Reset context switch flag after handling
  };
  
  // Update last active session tracker
  lastActiveSessionKey = sessionKey;
  
  return { fileName, updatedSession };
}

/**
 * Manually start a new version run (increment version letter)
 */
export function startNewVersionRun(
  sessionVersions: { [key: string]: SessionVersion },
  brand: string,
  projectType: string
): { fileName: string; updatedSession: SessionVersion } {
  const session = getSessionVersion(sessionVersions, brand, projectType);
  
  // Force a new version letter
  const versionLetter = incrementVersionLetter(session.currentVersionLetter);
  
  // Create updated session with new version letter, reset iteration to 1
  const updatedSession: SessionVersion = {
    ...session,
    currentVersionLetter: versionLetter,
    iterationNumber: 1,
    lastModified: Date.now(),
    contextSwitched: false,
  };
  
  const fileName = `${session.baseFileName}_V${versionLetter}1`;
  
  return { fileName, updatedSession };
}

/**
 * Load session versions from localStorage
 */
export function loadSessionVersions(): { [key: string]: SessionVersion } {
  try {
    const saved = localStorage.getItem('cohive_session_versions');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load session versions', e);
  }
  return {};
}

/**
 * Save session versions to localStorage
 */
export function saveSessionVersions(sessionVersions: { [key: string]: SessionVersion }): void {
  try {
    localStorage.setItem('cohive_session_versions', JSON.stringify(sessionVersions));
  } catch (e) {
    console.error('Failed to save session versions', e);
  }
}

/**
 * Get last active session key (for tracking context switches)
 */
export function getLastActiveSessionKey(): string | null {
  return lastActiveSessionKey;
}

/**
 * Set last active session key (for tracking context switches)
 */
export function setLastActiveSessionKey(sessionKey: string | null): void {
  lastActiveSessionKey = sessionKey;
}
