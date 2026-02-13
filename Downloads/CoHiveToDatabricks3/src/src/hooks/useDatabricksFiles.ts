/**
 * useDatabricksFiles Hook
 * 
 * PROTECTED FILE - DO NOT REGENERATE FROM FIGMA
 * 
 * This hook encapsulates all Databricks file operations logic,
 * keeping it separate from UI components that Figma-Make might regenerate.
 * 
 * Features:
 * - File listing from Workspace, Volumes, DBFS
 * - File reading and importing
 * - Authentication state management
 * - Error handling
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  listDatabricksFiles, 
  readDatabricksFile,
  DATABRICKS_PATHS,
  RESEARCH_FILE_TYPES,
  type DatabricksFile 
} from '../utils/databricksClient';
import { useDatabricksAuth } from './useDatabricksAuth';

interface UseDatabricksFilesOptions {
  initialPath?: string;
  fileTypes?: string[];
  autoLoad?: boolean;
}

interface ImportedFile {
  name: string;
  content: string;
  source: string;
}

export function useDatabricksFiles(options: UseDatabricksFilesOptions = {}) {
  const {
    initialPath = DATABRICKS_PATHS.workspace,
    fileTypes = RESEARCH_FILE_TYPES,
    autoLoad = false,
  } = options;

  const { isAuthenticated, checkHealth } = useDatabricksAuth();

  // State
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [files, setFiles] = useState<DatabricksFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load files from current path
   */
  const loadFiles = useCallback(async () => {
    if (!isAuthenticated) {
      setError('Not authenticated. Please sign in to Databricks.');
      setFiles([]);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const response = await listDatabricksFiles(currentPath, fileTypes);
      setFiles(response.files);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load files';
      setError(errorMessage);
      setFiles([]);
      console.error('Error loading files:', err);
    } finally {
      setLoading(false);
    }
  }, [currentPath, fileTypes, isAuthenticated]);

  /**
   * Change current path and reload files
   */
  const changePath = useCallback((newPath: string) => {
    setCurrentPath(newPath);
    setSelectedFiles(new Set()); // Clear selection when changing paths
  }, []);

  /**
   * Toggle file selection
   */
  const toggleFileSelection = useCallback((filePath: string) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(filePath)) {
        newSet.delete(filePath);
      } else {
        newSet.add(filePath);
      }
      return newSet;
    });
  }, []);

  /**
   * Select all files
   */
  const selectAll = useCallback(() => {
    setSelectedFiles(new Set(files.map(f => f.path)));
  }, [files]);

  /**
   * Clear all selections
   */
  const clearSelection = useCallback(() => {
    setSelectedFiles(new Set());
  }, []);

  /**
   * Import selected files
   */
  const importSelectedFiles = useCallback(async (): Promise<ImportedFile[]> => {
    if (selectedFiles.size === 0) {
      throw new Error('No files selected');
    }

    setImporting(true);
    setError(null);

    try {
      const importedFiles: ImportedFile[] = [];
      const failedFiles: string[] = [];

      for (const filePath of selectedFiles) {
        try {
          const fileData = await readDatabricksFile(filePath, 'text');
          importedFiles.push({
            name: fileData.name,
            content: fileData.content,
            source: `Databricks: ${filePath}`,
          });
        } catch (err) {
          console.error(`Failed to read file ${filePath}:`, err);
          failedFiles.push(filePath);
        }
      }

      if (importedFiles.length === 0) {
        throw new Error('Failed to import any files');
      }

      if (failedFiles.length > 0) {
        setError(`Warning: Failed to import ${failedFiles.length} file(s)`);
      }

      // Clear selection after successful import
      setSelectedFiles(new Set());

      return importedFiles;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to import files';
      setError(errorMessage);
      throw err;
    } finally {
      setImporting(false);
    }
  }, [selectedFiles]);

  /**
   * Import a single file by path
   */
  const importFile = useCallback(async (filePath: string): Promise<ImportedFile> => {
    setImporting(true);
    setError(null);

    try {
      const fileData = await readDatabricksFile(filePath, 'text');
      return {
        name: fileData.name,
        content: fileData.content,
        source: `Databricks: ${filePath}`,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to import file';
      setError(errorMessage);
      throw err;
    } finally {
      setImporting(false);
    }
  }, []);

  /**
   * Refresh current file list
   */
  const refresh = useCallback(() => {
    loadFiles();
  }, [loadFiles]);

  /**
   * Search/filter files
   */
  const filterFiles = useCallback((searchTerm: string): DatabricksFile[] => {
    if (!searchTerm) return files;
    
    const term = searchTerm.toLowerCase();
    return files.filter(file => 
      file.name.toLowerCase().includes(term) ||
      file.path.toLowerCase().includes(term)
    );
  }, [files]);

  /**
   * Get files by type
   */
  const getFilesByType = useCallback((type: 'workspace' | 'volume' | 'dbfs'): DatabricksFile[] => {
    return files.filter(file => file.type === type);
  }, [files]);

  // Auto-load files when path changes (if enabled and authenticated)
  useEffect(() => {
    if (autoLoad && isAuthenticated) {
      loadFiles();
    }
  }, [currentPath, autoLoad, isAuthenticated, loadFiles]);

  return {
    // State
    currentPath,
    files,
    selectedFiles,
    loading,
    importing,
    error,
    isAuthenticated,

    // Path operations
    changePath,
    refresh,

    // Selection operations
    toggleFileSelection,
    selectAll,
    clearSelection,
    selectedCount: selectedFiles.size,
    isSelected: (path: string) => selectedFiles.has(path),

    // File operations
    loadFiles,
    importSelectedFiles,
    importFile,

    // Utilities
    filterFiles,
    getFilesByType,

    // Common paths for quick access
    paths: DATABRICKS_PATHS,
  };
}
