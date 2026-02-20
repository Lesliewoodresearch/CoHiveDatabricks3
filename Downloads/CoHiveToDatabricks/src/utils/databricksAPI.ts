/**
 * Databricks API Integration for CoHive Knowledge Base
 * 
 * All Knowledge Base files are stored in Databricks, not localStorage.
 * This file provides mock implementations that should be replaced with
 * actual Databricks API calls in production.
 */

// Development mode: Set to false when Databricks API endpoints are deployed
const DEVELOPMENT_MODE = true;

export interface KnowledgeBaseFile {
  id: string;
  brand: string;
  projectType: string;
  fileName: string;
  isApproved: boolean;
  uploadDate: number;
  fileType: string; // 'Wisdom', 'Synthesis', 'Persona', etc.
  content?: string; // Base64 encoded file content
  source?: string; // Databricks file path
  insightType?: string; // For Wisdom files: 'Brand', 'Category', 'General'
  inputMethod?: string; // For Wisdom files: 'Text', 'Voice', 'Photo', 'Video', 'File'
  
  // Citation tracking metadata
  citationCount?: number; // Number of times this file has been cited
  gemInclusionCount?: number; // Number of times cited elements were included in saved gems
  
  // Approval metadata
  approvedBy?: string; // Username/email of person who approved
  approvedDate?: number; // Timestamp when approved
  approvalNotes?: string; // Optional notes about the approval
}

export interface UserFile {
  id: string;
  brand: string;
  projectType: string;
  fileName: string;
  timestamp: number;
  fileType: string; // 'Iteration', 'Summary'
  content?: string; // File content (JSON or text)
  hexExecutions?: any; // Hex execution data
}

/**
 * Save a file to the user's folder in Databricks
 */
export async function saveToUserFolder(file: UserFile): Promise<{ success: boolean; error?: string }> {
  // DEVELOPMENT MODE: Skip API call and simulate success
  if (DEVELOPMENT_MODE) {
    console.log('💾 [MOCK] Saving to Databricks User Folder:', {
      fileName: file.fileName,
      fileType: file.fileType,
      brand: file.brand,
      projectType: file.projectType
    });
    console.log('✅ [MOCK] Successfully saved to Databricks User Folder');
    return { success: true };
  }

  // PRODUCTION: Actual Databricks API call
  try {
    console.log('📤 Saving to Databricks User Folder:', file);
    
    const response = await fetch('/api/databricks/user-files/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(file)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to save to User Folder: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('✅ Saved to Databricks User Folder:', result);
    
    return { success: true };
  } catch (error) {
    console.error('❌ Error saving to User Folder:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Download a file to the user's computer
 */
export function downloadFile(fileName: string, content: string, mimeType: string = 'application/json') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  console.log('✅ File downloaded to computer:', fileName);
}

/**
 * Save a file to the Knowledge Base in Databricks
 */
export async function saveToKnowledgeBase(file: KnowledgeBaseFile): Promise<{ success: boolean; error?: string }> {
  // DEVELOPMENT MODE: Skip API call and simulate success
  if (DEVELOPMENT_MODE) {
    console.log('💾 [MOCK] Saving to Databricks Knowledge Base:', {
      fileName: file.fileName,
      fileType: file.fileType,
      brand: file.brand,
      insightType: file.insightType,
      inputMethod: file.inputMethod
    });
    console.log('✅ [MOCK] Successfully saved to Databricks Knowledge Base');
    return { success: true };
  }

  // PRODUCTION: Actual Databricks API call
  try {
    console.log('📤 Saving to Databricks Knowledge Base:', file);
    
    const response = await fetch('/api/databricks/knowledge-base/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(file)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to save to Knowledge Base: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('✅ Saved to Databricks Knowledge Base:', result);
    
    return { success: true };
  } catch (error) {
    console.error('❌ Error saving to Knowledge Base:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Fetch all Knowledge Base files from Databricks
 */
export async function fetchKnowledgeBaseFiles(filters?: {
  brand?: string;
  projectType?: string;
  fileType?: string;
  isApproved?: boolean;
}): Promise<KnowledgeBaseFile[]> {
  // DEVELOPMENT MODE: Return mock data immediately
  if (DEVELOPMENT_MODE) {
    console.log('💾 [MOCK] Fetching from Databricks Knowledge Base with filters:', filters);
    const mockFiles = getMockKnowledgeBaseFiles(filters);
    console.log(`✅ [MOCK] Returning ${mockFiles.length} Knowledge Base files`);
    return mockFiles;
  }

  // PRODUCTION: Actual Databricks API call
  try {
    console.log('📥 Fetching from Databricks Knowledge Base with filters:', filters);
    
    const queryParams = new URLSearchParams();
    if (filters?.brand) queryParams.append('brand', filters.brand);
    if (filters?.projectType) queryParams.append('projectType', filters.projectType);
    if (filters?.fileType) queryParams.append('fileType', filters.fileType);
    if (filters?.isApproved !== undefined) queryParams.append('isApproved', String(filters.isApproved));
    
    const response = await fetch(`/api/databricks/knowledge-base/list?${queryParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch Knowledge Base files: ${response.statusText}`);
    }
    
    const files = await response.json();
    console.log('✅ Fetched from Databricks Knowledge Base:', files);
    
    return files;
  } catch (error) {
    console.error('❌ Error fetching Knowledge Base files:', error);
    return [];
  }
}

/**
 * Update a Knowledge Base file in Databricks
 */
export async function updateKnowledgeBaseFile(
  fileId: string,
  updates: Partial<KnowledgeBaseFile>
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('📤 Updating Knowledge Base file in Databricks:', fileId, updates);
    
    // PRODUCTION: Replace with actual Databricks API call
    const response = await fetch(`/api/databricks/knowledge-base/${fileId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update Knowledge Base file: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('✅ Updated Knowledge Base file:', result);
    
    return { success: true };
  } catch (error) {
    console.error('❌ Error updating Knowledge Base file:', error);
    
    // MOCK: For development, simulate success
    console.warn('⚠️ MOCK MODE: Simulating successful Databricks update');
    return { success: true };
  }
}

/**
 * Delete a Knowledge Base file from Databricks
 */
export async function deleteKnowledgeBaseFile(fileId: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🗑️ Deleting Knowledge Base file from Databricks:', fileId);
    
    // PRODUCTION: Replace with actual Databricks API call
    const response = await fetch(`/api/databricks/knowledge-base/${fileId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete Knowledge Base file: ${response.statusMessage}`);
    }
    
    console.log('✅ Deleted Knowledge Base file');
    
    return { success: true };
  } catch (error) {
    console.error('❌ Error deleting Knowledge Base file:', error);
    
    // MOCK: For development, simulate success
    console.warn('⚠️ MOCK MODE: Simulating successful Databricks delete');
    return { success: true };
  }
}

/**
 * MOCK DATA: Development-only mock Knowledge Base files
 * In production, this will not be used - all data comes from Databricks
 */
function getMockKnowledgeBaseFiles(filters?: {
  brand?: string;
  projectType?: string;
  fileType?: string;
  isApproved?: boolean;
}): KnowledgeBaseFile[] {
  const mockFiles: KnowledgeBaseFile[] = [
    // Nike files
    {
      id: 'kb1',
      brand: 'Nike',
      projectType: 'Creative Messaging',
      fileName: 'Nike_Brand_Strategy_2024.pdf',
      isApproved: true,
      uploadDate: Date.now() - 86400000 * 30,
      fileType: 'Synthesis',
      source: 'dbfs:/knowledge-base/nike/Nike_Brand_Strategy_2024.pdf',
      citationCount: 12,
      gemInclusionCount: 5,
      approvedBy: 'sarah.johnson@company.com',
      approvedDate: Date.now() - 86400000 * 28,
      approvalNotes: 'Comprehensive brand strategy, high quality insights'
    },
    {
      id: 'kb2',
      brand: 'Nike',
      projectType: 'Product Launch',
      fileName: 'Nike_Consumer_Insights_Gen_Z.pdf',
      isApproved: true,
      uploadDate: Date.now() - 86400000 * 20,
      fileType: 'Synthesis',
      source: 'dbfs:/knowledge-base/nike/Nike_Consumer_Insights_Gen_Z.pdf',
      citationCount: 8,
      gemInclusionCount: 3,
      approvedBy: 'michael.chen@company.com',
      approvedDate: Date.now() - 86400000 * 18,
      approvalNotes: 'Excellent Gen Z consumer research'
    },
    {
      id: 'kb3',
      brand: 'Nike',
      projectType: 'Creative Messaging',
      fileName: 'Nike_Competitive_Analysis_Adidas.pdf',
      isApproved: true,
      uploadDate: Date.now() - 86400000 * 15,
      fileType: 'Synthesis',
      source: 'dbfs:/knowledge-base/nike/Nike_Competitive_Analysis_Adidas.pdf',
      citationCount: 15,
      gemInclusionCount: 7,
      approvedBy: 'sarah.johnson@company.com',
      approvedDate: Date.now() - 86400000 * 14,
      approvalNotes: 'Detailed competitive intelligence'
    },
    // Adidas files
    {
      id: 'kb4',
      brand: 'Adidas',
      projectType: 'Creative Messaging',
      fileName: 'Adidas_Market_Positioning_2024.pdf',
      isApproved: true,
      uploadDate: Date.now() - 86400000 * 25,
      fileType: 'Synthesis',
      source: 'dbfs:/knowledge-base/adidas/Adidas_Market_Positioning_2024.pdf',
      citationCount: 6,
      gemInclusionCount: 2,
      approvedBy: 'emma.williams@company.com',
      approvedDate: Date.now() - 86400000 * 23,
      approvalNotes: 'Strong positioning analysis'
    },
    {
      id: 'kb5',
      brand: 'Adidas',
      projectType: 'Packaging',
      fileName: 'Adidas_Sustainability_Research.pdf',
      isApproved: true,
      uploadDate: Date.now() - 86400000 * 18,
      fileType: 'Synthesis',
      source: 'dbfs:/knowledge-base/adidas/Adidas_Sustainability_Research.pdf',
      citationCount: 10,
      gemInclusionCount: 4,
      approvedBy: 'michael.chen@company.com',
      approvedDate: Date.now() - 86400000 * 17,
      approvalNotes: 'Important sustainability insights for packaging'
    },
    // Wisdom files
    {
      id: 'wis1',
      brand: 'Nike',
      projectType: 'General',
      fileName: 'Wisdom_Brand_Athletic_Footwear_Trends.txt',
      isApproved: true,
      uploadDate: Date.now() - 86400000 * 5,
      fileType: 'Wisdom',
      insightType: 'Brand',
      inputMethod: 'Text',
      source: 'dbfs:/knowledge-base/wisdom/Wisdom_Brand_Athletic_Footwear_Trends.txt',
      citationCount: 4,
      gemInclusionCount: 1,
      approvedBy: 'sarah.johnson@company.com',
      approvedDate: Date.now() - 86400000 * 4,
      approvalNotes: 'Valuable trend insights'
    },
    {
      id: 'wis2',
      brand: 'General',
      projectType: 'General',
      fileName: 'Wisdom_Category_Sports_Marketing_Voice.webm',
      isApproved: true,
      uploadDate: Date.now() - 86400000 * 3,
      fileType: 'Wisdom',
      insightType: 'Category',
      inputMethod: 'Voice',
      source: 'dbfs:/knowledge-base/wisdom/Wisdom_Category_Sports_Marketing_Voice.webm',
      citationCount: 2,
      gemInclusionCount: 1,
      approvedBy: 'emma.williams@company.com',
      approvedDate: Date.now() - 86400000 * 2,
      approvalNotes: 'Good sports marketing perspective'
    },
    {
      id: 'wis3',
      brand: 'Adidas',
      projectType: 'General',
      fileName: 'Wisdom_General_File_market_research.pdf',
      isApproved: true,
      uploadDate: Date.now() - 86400000 * 2,
      fileType: 'Wisdom',
      insightType: 'General',
      inputMethod: 'File',
      source: 'dbfs:/knowledge-base/wisdom/Wisdom_General_File_market_research.pdf',
      citationCount: 3,
      gemInclusionCount: 1,
      approvedBy: 'michael.chen@company.com',
      approvedDate: Date.now() - 86400000 * 1,
      approvalNotes: 'Solid market research data'
    }
  ];

  // Apply filters
  let filtered = mockFiles;
  
  if (filters?.brand) {
    filtered = filtered.filter(f => f.brand === filters.brand || f.brand === 'General');
  }
  
  if (filters?.projectType) {
    filtered = filtered.filter(f => f.projectType === filters.projectType || f.projectType === 'General');
  }
  
  if (filters?.fileType) {
    filtered = filtered.filter(f => f.fileType === filters.fileType);
  }
  
  if (filters?.isApproved !== undefined) {
    filtered = filtered.filter(f => f.isApproved === filters.isApproved);
  }
  
  return filtered;
}

/**
 * Get Knowledge Base statistics from Databricks
 */
export async function getKnowledgeBaseStats(): Promise<{
  totalFiles: number;
  approvedFiles: number;
  wisdomFiles: number;
  synthesisFiles: number;
  personaFiles: number;
}> {
  try {
    console.log('📊 Fetching Knowledge Base statistics from Databricks');
    
    // PRODUCTION: Replace with actual Databricks API call
    const response = await fetch('/api/databricks/knowledge-base/stats', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch statistics: ${response.statusText}`);
    }
    
    const stats = await response.json();
    console.log('✅ Knowledge Base statistics:', stats);
    
    return stats;
  } catch (error) {
    console.error('❌ Error fetching Knowledge Base statistics:', error);
    
    // MOCK: For development, return mock stats
    console.warn('⚠️ MOCK MODE: Returning mock statistics');
    const mockFiles = getMockKnowledgeBaseFiles();
    return {
      totalFiles: mockFiles.length,
      approvedFiles: mockFiles.filter(f => f.isApproved).length,
      wisdomFiles: mockFiles.filter(f => f.fileType === 'Wisdom').length,
      synthesisFiles: mockFiles.filter(f => f.fileType === 'Synthesis').length,
      personaFiles: mockFiles.filter(f => f.fileType === 'Persona').length,
    };
  }
}

/**
 * Increment citation count for a Knowledge Base file
 * Called when a file is cited/referenced in analysis
 */
export async function incrementCitationCount(fileId: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('📈 Incrementing citation count for file:', fileId);
    
    // PRODUCTION: Replace with actual Databricks API call
    const response = await fetch(`/api/databricks/knowledge-base/${fileId}/increment-citation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to increment citation count: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('✅ Citation count incremented:', result);
    
    return { success: true };
  } catch (error) {
    console.error('❌ Error incrementing citation count:', error);
    
    // MOCK: For development, simulate success
    console.warn('⚠️ MOCK MODE: Simulating citation count increment');
    return { success: true };
  }
}

/**
 * Increment gem inclusion count for a Knowledge Base file
 * Called when cited elements from this file are included in a saved gem
 */
export async function incrementGemInclusionCount(fileId: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('💎 Incrementing gem inclusion count for file:', fileId);
    
    // PRODUCTION: Replace with actual Databricks API call
    const response = await fetch(`/api/databricks/knowledge-base/${fileId}/increment-gem-inclusion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to increment gem inclusion count: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('✅ Gem inclusion count incremented:', result);
    
    return { success: true };
  } catch (error) {
    console.error('❌ Error incrementing gem inclusion count:', error);
    
    // MOCK: For development, simulate success
    console.warn('⚠️ MOCK MODE: Simulating gem inclusion count increment');
    return { success: true };
  }
}

/**
 * Approve a Knowledge Base file
 * Marks file as approved with approver metadata
 */
export async function approveKnowledgeBaseFile(
  fileId: string,
  approverName: string,
  approvalNotes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('✅ Approving Knowledge Base file:', fileId, 'by:', approverName);
    
    const approvalData = {
      isApproved: true,
      approvedBy: approverName,
      approvedDate: Date.now(),
      approvalNotes: approvalNotes || ''
    };
    
    // PRODUCTION: Replace with actual Databricks API call
    const response = await fetch(`/api/databricks/knowledge-base/${fileId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(approvalData)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to approve file: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('✅ File approved:', result);
    
    return { success: true };
  } catch (error) {
    console.error('❌ Error approving file:', error);
    
    // MOCK: For development, simulate success
    console.warn('⚠️ MOCK MODE: Simulating file approval');
    return { success: true };
  }
}

/**
 * Unapprove a Knowledge Base file
 * Removes approval status and metadata
 */
export async function unapproveKnowledgeBaseFile(fileId: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('❌ Unapproving Knowledge Base file:', fileId);
    
    const unapprovalData = {
      isApproved: false,
      approvedBy: undefined,
      approvedDate: undefined,
      approvalNotes: undefined
    };
    
    // PRODUCTION: Replace with actual Databricks API call
    const response = await fetch(`/api/databricks/knowledge-base/${fileId}/unapprove`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(unapprovalData)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to unapprove file: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('✅ File unapproved:', result);
    
    return { success: true };
  } catch (error) {
    console.error('❌ Error unapproving file:', error);
    
    // MOCK: For development, simulate success
    console.warn('⚠️ MOCK MODE: Simulating file unapproval');
    return { success: true };
  }
}