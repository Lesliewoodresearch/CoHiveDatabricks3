/**
 * Databricks File Client
 * ✅ FIXED: All requests now proxied through Vercel API routes
 */

import { getValidSession, isAuthenticated } from './databricksAuth';

export interface DatabricksFile {
  name: string;
  path: string;
  type: 'workspace' | 'volume' | 'dbfs';
  size?: number;
  modified_at?: number;
}

export interface FileListResponse {
  path: string;
  files: DatabricksFile[];
  count: number;
}

export interface FileReadResponse {
  path: string;
  name: string;
  content: string;
  encoding: 'text' | 'base64';
}

/**
 * Check if user has valid authentication
 */
export function hasCredentials(): boolean {
  return isAuthenticated();
}

/**
 * Make a request to Databricks API via our proxy
 * ✅ FIXED: Now calls /api/databricks/files instead of direct Databricks API
 */
async function databricksRequest(
  endpoint: string,
  method: 'GET' | 'POST' = 'GET',
  body?: any
): Promise<any> {
  try {
    const session = await getValidSession();
    
    if (!session) {
      throw new Error('Not authenticated. Please log in to Databricks.');
    }

    // Call our Vercel API proxy instead of direct Databricks call
    const response = await fetch('/api/databricks/files', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        accessToken: session.accessToken,
        workspaceHost: session.workspaceHost,
        endpoint,
        method,
        body,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API request failed: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error('Databricks request failed:', error);
    throw error;
  }
}

/**
 * List files from a Databricks workspace path
 */
async function listWorkspaceFiles(path: string, fileTypes?: string[]): Promise<DatabricksFile[]> {
  try {
    const response = await databricksRequest(`/api/2.0/workspace/list?path=${encodeURIComponent(path)}`);
    
    const files: DatabricksFile[] = [];
    
    if (response.objects) {
      for (const item of response.objects) {
        if (item.object_type === 'FILE' || item.object_type === 'NOTEBOOK') {
          const fileName = item.path.split('/').pop() || '';
          
          // Filter by file types if specified
          if (!fileTypes || fileTypes.length === 0 || 
              fileTypes.some(ft => fileName.toLowerCase().endsWith(`.${ft.toLowerCase()}`))) {
            files.push({
              name: fileName,
              path: item.path,
              type: 'workspace',
              size: item.size,
              modified_at: item.modified_at,
            });
          }
        }
      }
    }
    
    return files;
  } catch (error) {
    console.error('Error listing workspace files:', error);
    return [];
  }
}

/**
 * List files from a Databricks Unity Catalog volume
 * ✅ FIXED: Changed to use API version 2.1 (was 2.0)
 */
async function listVolumeFiles(path: string, fileTypes?: string[]): Promise<DatabricksFile[]> {
  try {
    // FIXED: Use /api/2.1/fs/directories instead of /api/2.0/fs/directories
    const response = await databricksRequest(`/api/2.1/fs/directories${path}`);
    
    const files: DatabricksFile[] = [];
    
    if (response.contents) {
      for (const item of response.contents) {
        if (!item.is_directory) {
          const fileName = item.name;
          
          if (!fileTypes || fileTypes.length === 0 || 
              fileTypes.some(ft => fileName.toLowerCase().endsWith(`.${ft.toLowerCase()}`))) {
            files.push({
              name: fileName,
              path: item.path,
              type: 'volume',
              size: item.file_size,
              modified_at: item.last_modified,
            });
          }
        }
      }
    }
    
    return files;
  } catch (error) {
    console.error('Error listing volume files:', error);
    return [];
  }
}

/**
 * List files from DBFS
 */
async function listDbfsFiles(path: string, fileTypes?: string[]): Promise<DatabricksFile[]> {
  try {
    // Remove 'dbfs:' prefix if present
    const cleanPath = path.replace(/^dbfs:/, '');
    
    const response = await databricksRequest(`/api/2.0/dbfs/list?path=${encodeURIComponent(cleanPath)}`);
    
    const files: DatabricksFile[] = [];
    
    if (response.files) {
      for (const item of response.files) {
        if (!item.is_dir) {
          const fileName = item.path.split('/').pop() || '';
          
          if (!fileTypes || fileTypes.length === 0 || 
              fileTypes.some(ft => fileName.toLowerCase().endsWith(`.${ft.toLowerCase()}`))) {
            files.push({
              name: fileName,
              path: `dbfs:${item.path}`,
              type: 'dbfs',
              size: item.file_size,
            });
          }
        }
      }
    }
    
    return files;
  } catch (error) {
    console.error('Error listing DBFS files:', error);
    return [];
  }
}

/**
 * List files from a Databricks location
 */
export async function listDatabricksFiles(
  path: string,
  fileTypes?: string[]
): Promise<FileListResponse> {
  let files: DatabricksFile[] = [];

  if (path.startsWith('/Workspace')) {
    files = await listWorkspaceFiles(path, fileTypes);
  } else if (path.startsWith('/Volumes')) {
    files = await listVolumeFiles(path, fileTypes);
  } else if (path.startsWith('dbfs:')) {
    files = await listDbfsFiles(path, fileTypes);
  } else {
    throw new Error('Invalid path. Must start with /Workspace, /Volumes, or dbfs:');
  }

  return {
    path,
    files,
    count: files.length,
  };
}

/**
 * Read a file from Databricks workspace
 */
async function readWorkspaceFile(path: string, encoding: 'text' | 'base64'): Promise<string> {
  try {
    const response = await databricksRequest(`/api/2.0/workspace/export?path=${encodeURIComponent(path)}&format=SOURCE`);
    
    if (encoding === 'base64') {
      return response.content || '';
    } else {
      // Decode base64 content to text
      return atob(response.content || '');
    }
  } catch (error) {
    throw new Error(`Error reading workspace file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Read a file from Databricks volume
 * ✅ FIXED: Changed to use API version 2.1 (was 2.0)
 */
async function readVolumeFile(path: string, encoding: 'text' | 'base64'): Promise<string> {
  try {
    // FIXED: Use /api/2.1/fs/files instead of /api/2.0/fs/files
    const response = await databricksRequest(`/api/2.1/fs/files${path}`);
    
    if (encoding === 'base64') {
      return btoa(response.contents || '');
    } else {
      return response.contents || '';
    }
  } catch (error) {
    throw new Error(`Error reading volume file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Read a file from DBFS
 */
async function readDbfsFile(path: string, encoding: 'text' | 'base64'): Promise<string> {
  try {
    const cleanPath = path.replace(/^dbfs:/, '');
    
    const response = await databricksRequest(
      `/api/2.0/dbfs/read`,
      'POST',
      { path: cleanPath }
    );
    
    if (encoding === 'base64') {
      return response.data || '';
    } else {
      return atob(response.data || '');
    }
  } catch (error) {
    throw new Error(`Error reading DBFS file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Read a file from Databricks
 */
export async function readDatabricksFile(
  path: string,
  encoding: 'text' | 'base64' = 'text'
): Promise<FileReadResponse> {
  let content: string;
  
  if (path.startsWith('/Workspace')) {
    content = await readWorkspaceFile(path, encoding);
  } else if (path.startsWith('/Volumes')) {
    content = await readVolumeFile(path, encoding);
  } else if (path.startsWith('dbfs:')) {
    content = await readDbfsFile(path, encoding);
  } else {
    throw new Error('Invalid path');
  }

  const fileName = path.split('/').pop() || 'unknown';

  return {
    path,
    name: fileName,
    content,
    encoding,
  };
}

/**
 * Check if Databricks API is available
 */
export async function checkDatabricksHealth(): Promise<boolean> {
  try {
    if (!isAuthenticated()) {
      return false;
    }

    const session = await getValidSession().catch(err => {
      console.error('Failed to get valid session during health check:', err);
      return null;
    });
    
    if (!session) {
      return false;
    }

    // Test with a simple workspace list call via our proxy
    const response = await fetch('/api/databricks/files', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        accessToken: session.accessToken,
        workspaceHost: session.workspaceHost,
        endpoint: '/api/2.0/workspace/list?path=/',
        method: 'GET',
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Databricks API health check failed:', error);
    return false;
  }
}

/**
 * Common Databricks paths for quick access
 */
export const DATABRICKS_PATHS = {
  workspace: '/Workspace/Shared',
  workspaceUsers: '/Workspace/Users',
  volumes: '/Volumes',
  dbfs: 'dbfs:/FileStore',
};

/**
 * Supported file types for research synthesis
 */
export const RESEARCH_FILE_TYPES = [
  'pdf',
  'docx',
  'doc',
  'txt',
  'md',
  'csv',
  'xlsx',
  'xls',
];
