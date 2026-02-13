/**
 * Databricks Knowledge Base API Integration
 * 
 * PRODUCTION MODE - Connects to real Databricks Unity Catalog
 * 
 * Location: src/utils/databricksAPI.ts
 */

import { getValidSession } from './databricksAuth';

export interface KnowledgeBaseFile {
  fileId: string;
  fileName: string;
  filePath: string;
  scope: 'general' | 'category' | 'brand';
  category?: string;
  brand?: string;
  projectType?: string;
  fileType: 'Synthesis' | 'Wisdom';
  isApproved: boolean;
  uploadDate: string;
  uploadedBy: string;
  approverEmail?: string;
  approvalDate?: string;
  approvalNotes?: string;
  tags: string[];
  citationCount: number;
  gemInclusionCount: number;
  fileSizeBytes: number;
  contentSummary?: string;
  insightType?: 'Brand' | 'Category' | 'General';
  inputMethod?: 'Text' | 'Voice' | 'Photo' | 'Video' | 'File';
  createdAt: string;
  updatedAt: string;
}

export interface UploadFileParams {
  file: File;
  scope: 'general' | 'category' | 'brand';
  category?: string;
  brand?: string;
  projectType?: string;
  fileType: 'Synthesis' | 'Wisdom';
  tags?: string[];
  contentSummary?: string;
  insightType?: 'Brand' | 'Category' | 'General';
  inputMethod?: 'Text' | 'Voice' | 'Photo' | 'Video' | 'File';
  userEmail: string;
  userRole: string;
}

export interface ListFilesParams {
  scope?: 'general' | 'category' | 'brand';
  category?: string;
  brand?: string;
  fileType?: 'Synthesis' | 'Wisdom';
  isApproved?: boolean;
  projectType?: string;
  uploadedBy?: string;
  searchTerm?: string;
  includeGeneral?: boolean;
  includeCategory?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: 'upload_date' | 'citation_count' | 'file_name';
  sortOrder?: 'ASC' | 'DESC';
}

/**
 * Get auth session for API calls
 */
async function getAuthData() {
  const session = await getValidSession();
  if (!session) {
    throw new Error('Not authenticated. Please sign in to Databricks.');
  }
  return {
    accessToken: session.accessToken,  // ✅ Fixed!
    workspaceHost: session.workspaceHost,
  };
}


/**
 * Upload a file to the Knowledge Base
 */
export async function uploadToKnowledgeBase(params: UploadFileParams): Promise<{ 
  success: boolean; 
  fileId?: string;
  filePath?: string;
  error?: string;
}> {
  try {
    console.log('📤 Uploading to Knowledge Base:', params.file.name);
    
    const auth = await getAuthData();

    // Convert file to base64
    const fileContent = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        resolve(base64.split(',')[1]); // Remove data:... prefix
      };
      reader.onerror = reject;
      reader.readAsDataURL(params.file);
    });

    const response = await fetch('/api/databricks/knowledge-base/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileName: params.file.name,
        fileContent,
        fileSize: params.file.size,
        scope: params.scope,
        category: params.category,
        brand: params.brand,
        projectType: params.projectType,
        fileType: params.fileType,
        tags: params.tags || [],
        contentSummary: params.contentSummary,
        insightType: params.insightType,
        inputMethod: params.inputMethod,
        userEmail: params.userEmail,
        userRole: params.userRole,
        ...auth,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Upload failed: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ Upload successful:', result.fileId);
    
    return { 
      success: true, 
      fileId: result.fileId,
      filePath: result.filePath,
    };
    
  } catch (error) {
    console.error('❌ Upload error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Upload failed' 
    };
  }
}

/**
 * List files from the Knowledge Base with filters
 */
export async function listKnowledgeBaseFiles(
  params: ListFilesParams = {}
): Promise<KnowledgeBaseFile[]> {
  try {
    console.log('📥 Fetching Knowledge Base files with filters:', params);
    
   const auth = await getAuthData();
    
    // Build query string
    const queryParams = new URLSearchParams();
    
    if (params.scope) queryParams.append('scope', params.scope);
    if (params.category) queryParams.append('category', params.category);
    if (params.brand) queryParams.append('brand', params.brand);
    if (params.fileType) queryParams.append('fileType', params.fileType);
    if (params.isApproved !== undefined) queryParams.append('isApproved', String(params.isApproved));
    if (params.projectType) queryParams.append('projectType', params.projectType);
    if (params.uploadedBy) queryParams.append('uploadedBy', params.uploadedBy);
    if (params.searchTerm) queryParams.append('searchTerm', params.searchTerm);
    if (params.includeGeneral) queryParams.append('includeGeneral', 'true');
    if (params.includeCategory) queryParams.append('includeCategory', 'true');
    if (params.limit) queryParams.append('limit', String(params.limit));
    if (params.offset) queryParams.append('offset', String(params.offset));
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);
    
    queryParams.append('accessToken', auth.accessToken);
    queryParams.append('workspaceHost', auth.workspaceHost);

    const response = await fetch(
      `/api/databricks/knowledge-base/list?${queryParams}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Query failed: ${response.statusText}`);
    }

    const result = await response.json();
    console.log(`✅ Found ${result.files.length} files`);
    
    return result.files;
    
  } catch (error) {
    console.error('❌ List error:', error);
    return [];
  }
}

/**
 * Approve a file in the Knowledge Base
 */
export async function approveKnowledgeBaseFile(
  fileId: string,
  userEmail: string,
  userRole: string,
  approvalNotes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('✅ Approving file:', fileId);
    
   const auth = await getAuthData();
    
    const response = await fetch('/api/databricks/knowledge-base/approve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileId,
        approvalNotes,
        userEmail,
        userRole,
        ...auth,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Approval failed: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ File approved:', result.fileName);
    
    return { success: true };
    
  } catch (error) {
    console.error('❌ Approval error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Approval failed' 
    };
  }
}

/**
 * Update metadata for a file
 */
export async function updateKnowledgeBaseMetadata(
  fileId: string,
  updates: {
    tags?: string[];
    contentSummary?: string;
    projectType?: string;
    approvalNotes?: string;
    citationCount?: number;
    gemInclusionCount?: number;
  },
  userEmail: string,
  userRole: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('📝 Updating metadata for:', fileId);
    
   const auth = await getAuthData();
    
    const response = await fetch('/api/databricks/knowledge-base/update', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileId,
        ...updates,
        userEmail,
        userRole,
        ...auth,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Update failed: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ Metadata updated:', result.fileName);
    
    return { success: true };
    
  } catch (error) {
    console.error('❌ Update error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Update failed' 
    };
  }
}

/**
 * Delete a file from the Knowledge Base
 */
export async function deleteKnowledgeBaseFile(
  fileId: string,
  userEmail: string,
  userRole: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🗑️ Deleting file:', fileId);
    
    const auth = await getAuthData();
    
    const response = await fetch('/api/databricks/knowledge-base/delete', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileId,
        userEmail,
        userRole,
        ...auth,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Deletion failed: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ File deleted:', result.fileName);
    
    return { success: true };
    
  } catch (error) {
    console.error('❌ Delete error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Deletion failed' 
    };
  }
}

/**
 * Download a file to the user's computer
 */
export function downloadFile(fileName: string, content: string, mimeType: string = 'application/octet-stream') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  console.log('✅ File downloaded:', fileName);
}

/**
 * Valid categories for the Knowledge Base
 */
export const KNOWLEDGE_BASE_CATEGORIES = [
  'Beer',
  'Cider',
  'RTD',
  'Footwear',
] as const;

export type KnowledgeBaseCategory = typeof KNOWLEDGE_BASE_CATEGORIES[number];
