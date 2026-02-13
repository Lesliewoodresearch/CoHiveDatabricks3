/**
 * DatabricksFileBrowser Component
 * 
 * SAFE FOR FIGMA-MAKE REGENERATION
 * This file contains only UI/presentation logic.
 * All Databricks integration logic is in hooks (protected from regeneration).
 * 
 * Integration points:
 * - useDatabricksFiles hook (in src/hooks/useDatabricksFiles.ts)
 * - useDatabricksAuth hook (in src/hooks/useDatabricksAuth.ts)
 * 
 * When updating in Figma:
 * - Feel free to modify layout, styling, components
 * - DO NOT remove the two hook imports above
 * - DO NOT modify the callback functions that use hook methods
 */

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { 
  FolderIcon, 
  FileIcon, 
  ChevronRight, 
  Download, 
  Search,
  RefreshCw,
  Database,
  HardDrive,
  FolderOpen,
  Loader2,
  AlertCircle,
  LogIn,
  Settings,
  CheckSquare,
  Square
} from 'lucide-react';
import { DatabricksOAuthLogin } from './DatabricksOAuthLogin';
import { colors, spacing } from '../styles/cohive-theme';

// ============================================================================
// PROTECTED IMPORTS - DO NOT REMOVE
// ============================================================================
import { useDatabricksFiles } from '../hooks/useDatabricksFiles';
import { useDatabricksAuth } from '../hooks/useDatabricksAuth';
// ============================================================================

interface DatabricksFileBrowserProps {
  open: boolean;
  onClose: () => void;
  onFilesSelected: (files: Array<{ name: string; content: string; source: string }>, autoApprove: boolean) => void;
}

export function DatabricksFileBrowser({ open, onClose, onFilesSelected }: DatabricksFileBrowserProps) {
  // ============================================================================
  // PROTECTED HOOKS - DO NOT REMOVE
  // ============================================================================
  const {
    currentPath,
    files,
    selectedFiles,
    loading,
    importing,
    error,
    changePath,
    refresh,
    toggleFileSelection,
    selectAll,
    clearSelection,
    selectedCount,
    isSelected,
    importSelectedFiles,
    filterFiles,
    paths,
  } = useDatabricksFiles({ autoLoad: open });

  const {
    isAuthenticated,
    workspaceHost,
    isHealthy,
    logout,
  } = useDatabricksAuth();
  // ============================================================================

  // Local UI state (safe to modify)
  const [searchTerm, setSearchTerm] = useState('');
  const [autoApprove, setAutoApprove] = useState(true);
  const [showLoginDialog, setShowLoginDialog] = useState(false);

  // UI-only handlers (safe to modify styling/behavior, but keep the core logic calls)
  const handleImport = async () => {
    try {
      const importedFiles = await importSelectedFiles();
      onFilesSelected(importedFiles, autoApprove);
      onClose();
    } catch (err) {
      console.error('Import failed:', err);
    }
  };

  const handlePathChange = (newPath: string) => {
    changePath(newPath);
  };

  const handleRefresh = () => {
    refresh();
  };

  const handleLoginClick = () => {
    setShowLoginDialog(true);
  };

  const handleLogoutClick = () => {
    logout();
    setShowLoginDialog(true);
  };

  // Utility functions (safe to modify)
  const filteredFiles = filterFiles(searchTerm);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getLocationIcon = (type: string) => {
    switch (type) {
      case 'workspace':
        return <FolderOpen className="h-4 w-4" />;
      case 'volume':
        return <Database className="h-4 w-4" />;
      case 'dbfs':
        return <HardDrive className="h-4 w-4" />;
      default:
        return <FolderIcon className="h-4 w-4" />;
    }
  };

  // ============================================================================
  // UI RENDER - SAFE TO MODIFY FREELY
  // ============================================================================
  
  return (
    <>
      {/* Login Dialog */}
      <DatabricksOAuthLogin
        open={showLoginDialog}
        onClose={() => {
          setShowLoginDialog(false);
          if (!isAuthenticated) {
            onClose();
          }
        }}
      />

      {/* Main Browser Dialog */}
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col" style={{ backgroundColor: colors.background.primary }}>
          
          {/* Header */}
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3" style={{ color: colors.text.primary }}>
              <Database className="h-6 w-6" style={{ color: colors.hex.purple.light }} />
              Import from Databricks
            </DialogTitle>
            <DialogDescription style={{ color: colors.text.secondary }}>
              Select research files from your Databricks workspace, volumes, or DBFS
            </DialogDescription>
          </DialogHeader>

          {/* Location Tabs */}
          <div className="flex gap-2 mb-4">
            <Button
              variant={currentPath.startsWith('/Workspace') ? 'default' : 'outline'}
              size="sm"
              onClick={() => handlePathChange(paths.workspace)}
              className="gap-2"
              style={currentPath.startsWith('/Workspace') ? { backgroundColor: colors.hex.purple.light } : {}}
            >
              <FolderOpen className="h-4 w-4" />
              Workspace
            </Button>
            <Button
              variant={currentPath.startsWith('/Volumes') ? 'default' : 'outline'}
              size="sm"
              onClick={() => handlePathChange(paths.volumes)}
              className="gap-2"
              style={currentPath.startsWith('/Volumes') ? { backgroundColor: colors.hex.purple.light } : {}}
            >
              <Database className="h-4 w-4" />
              Volumes
            </Button>
            <Button
              variant={currentPath.startsWith('dbfs:') ? 'default' : 'outline'}
              size="sm"
              onClick={() => handlePathChange(paths.dbfs)}
              className="gap-2"
              style={currentPath.startsWith('dbfs:') ? { backgroundColor: colors.hex.purple.light } : {}}
            >
              <HardDrive className="h-4 w-4" />
              DBFS
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
              className="ml-auto gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Path & Search */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm" style={{ color: colors.text.secondary }}>
              <FolderIcon className="h-4 w-4" />
              <span className="font-mono">{currentPath}</span>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: colors.text.secondary }} />
              <Input
                placeholder="Search files..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: '#fee', color: '#c33' }}>
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <div className="flex-1">
                <span className="text-sm">{error}</span>
              </div>
              {!isAuthenticated && (
                <Button
                  size="sm"
                  onClick={handleLoginClick}
                  className="gap-2"
                  style={{ backgroundColor: colors.hex.purple.light }}
                >
                  <LogIn className="h-4 w-4" />
                  Sign In
                </Button>
              )}
            </div>
          )}

          {/* Selection Actions */}
          {files.length > 0 && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={selectAll}
                className="gap-2"
              >
                <CheckSquare className="h-4 w-4" />
                Select All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearSelection}
                disabled={selectedCount === 0}
                className="gap-2"
              >
                <Square className="h-4 w-4" />
                Clear Selection
              </Button>
            </div>
          )}

          {/* File List */}
          <ScrollArea className="flex-1 border rounded-lg" style={{ borderColor: colors.border.light }}>
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" style={{ color: colors.hex.purple.light }} />
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 gap-3">
                <FileIcon className="h-12 w-12" style={{ color: colors.text.tertiary }} />
                <p className="text-sm" style={{ color: colors.text.secondary }}>
                  {searchTerm ? 'No files match your search' : 'No files found in this location'}
                </p>
              </div>
            ) : (
              <div className="p-4 space-y-2">
                {filteredFiles.map((file) => {
                  const selected = isSelected(file.path);
                  return (
                    <div
                      key={file.path}
                      onClick={() => toggleFileSelection(file.path)}
                      className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md"
                      style={{
                        borderColor: selected ? colors.hex.purple.light : colors.border.light,
                        backgroundColor: selected ? colors.background.tertiary : colors.background.secondary
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleFileSelection(file.path)}
                        className="h-4 w-4 rounded"
                        style={{ accentColor: colors.hex.purple.light }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <FileIcon className="h-5 w-5 flex-shrink-0" style={{ color: colors.hex.purple.light }} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate" style={{ color: colors.text.primary }}>
                            {file.name}
                          </p>
                          <p className="text-xs truncate" style={{ color: colors.text.secondary }}>
                            {file.path}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0">
                        <Badge variant="outline" className="gap-1">
                          {getLocationIcon(file.type)}
                          {file.type}
                        </Badge>
                        <span className="text-xs" style={{ color: colors.text.secondary }}>
                          {formatFileSize(file.size)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: colors.border.light }}>
            <div className="flex items-center gap-4">
              <div className="text-sm" style={{ color: colors.text.secondary }}>
                {selectedCount > 0 ? (
                  <span className="font-medium" style={{ color: colors.hex.purple.light }}>
                    {selectedCount} file{selectedCount !== 1 ? 's' : ''} selected
                  </span>
                ) : (
                  <span>Select files to import</span>
                )}
              </div>
              
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoApprove}
                  onChange={(e) => setAutoApprove(e.target.checked)}
                  className="h-4 w-4 rounded"
                  style={{ accentColor: colors.hex.purple.light }}
                />
                <span className="text-sm" style={{ color: colors.text.primary }}>
                  Auto-approve imported files
                </span>
              </label>
            </div>
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleLoginClick}
                className="gap-2"
              >
                <Settings className="h-4 w-4" />
                Settings
              </Button>
              <Button variant="outline" onClick={onClose} disabled={importing}>
                Cancel
              </Button>
              <Button
                onClick={handleImport}
                disabled={selectedCount === 0 || importing}
                className="gap-2"
                style={{ backgroundColor: colors.hex.purple.light }}
              >
                {importing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Import {selectedCount > 0 ? `(${selectedCount})` : ''}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
