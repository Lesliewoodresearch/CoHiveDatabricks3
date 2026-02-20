import { useState } from 'react';
import { Download, Trash2, ChevronDown } from 'lucide-react';

interface ProjectFile {
  brand: string;
  projectType: string;
  fileName: string;
  timestamp: number;
}

interface ReviewViewProps {
  projectFiles: ProjectFile[];
  onDeleteFiles: (fileNames: string[]) => void;
}

type SortOption = 'date' | 'brand' | 'projectType' | 'brand-projectType';

export function ReviewView({ projectFiles, onDeleteFiles }: ReviewViewProps) {
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [showSortMenu, setShowSortMenu] = useState(false);

  // Sort files based on selected option
  const getSortedFiles = () => {
    const filesCopy = [...projectFiles];
    
    switch (sortBy) {
      case 'date':
        return filesCopy.sort((a, b) => b.timestamp - a.timestamp);
      case 'brand':
        return filesCopy.sort((a, b) => a.brand.localeCompare(b.brand));
      case 'projectType':
        return filesCopy.sort((a, b) => a.projectType.localeCompare(b.projectType));
      case 'brand-projectType':
        return filesCopy.sort((a, b) => {
          const brandCompare = a.brand.localeCompare(b.brand);
          if (brandCompare !== 0) return brandCompare;
          return a.projectType.localeCompare(b.projectType);
        });
      default:
        return filesCopy;
    }
  };

  const sortedFiles = getSortedFiles();

  // Toggle individual file selection
  const toggleFileSelection = (fileName: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(fileName)) {
      newSelected.delete(fileName);
    } else {
      newSelected.add(fileName);
    }
    setSelectedFiles(newSelected);
  };

  // Toggle select all
  const toggleSelectAll = () => {
    if (selectedFiles.size === sortedFiles.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(sortedFiles.map(f => f.fileName)));
    }
  };

  // Download selected files
  const handleDownload = () => {
    const filesToDownload = sortedFiles.filter(f => selectedFiles.has(f.fileName));
    
    const dataToExport = {
      exportDate: new Date().toISOString(),
      files: filesToDownload
    };

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cohive-files-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Delete selected files
  const handleDelete = () => {
    if (selectedFiles.size === 0) return;
    
    if (confirm(`Are you sure you want to delete ${selectedFiles.size} file(s)?`)) {
      onDeleteFiles(Array.from(selectedFiles));
      setSelectedFiles(new Set());
    }
  };

  const getSortLabel = () => {
    switch (sortBy) {
      case 'date': return 'Date';
      case 'brand': return 'Brand';
      case 'projectType': return 'Project Type';
      case 'brand-projectType': return 'Brand/Project Type';
      default: return 'Sort';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with Sort and Action Buttons */}
      <div className="flex items-center justify-between">
        <h3 className="text-gray-900">
          My Files ({sortedFiles.length})
        </h3>
        
        <div className="flex items-center gap-3">
          {/* Action Buttons - Only show when files are selected */}
          {selectedFiles.size > 0 && (
            <>
              <button
                onClick={handleDownload}
                className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2 text-sm"
                title="Download selected files"
              >
                <Download className="w-4 h-4" />
                Download ({selectedFiles.size})
              </button>
              <button
                onClick={handleDelete}
                className="px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-2 text-sm"
                title="Delete selected files"
              >
                <Trash2 className="w-4 h-4" />
                Delete ({selectedFiles.size})
              </button>
            </>
          )}
          
          {/* Sort Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowSortMenu(!showSortMenu)}
              className="px-3 py-1.5 bg-gray-200 text-gray-900 rounded hover:bg-gray-300 flex items-center gap-2 text-sm"
            >
              Sort by: {getSortLabel()}
              <ChevronDown className="w-4 h-4" />
            </button>
            
            {showSortMenu && (
              <>
                {/* Backdrop to close menu when clicking outside */}
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowSortMenu(false)}
                />
                
                <div className="absolute right-0 top-full mt-1 bg-white border-2 border-gray-300 rounded-lg shadow-lg z-50 min-w-[180px]">
                  <button
                    onClick={() => {
                      setSortBy('date');
                      setShowSortMenu(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 ${
                      sortBy === 'date' ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                    }`}
                  >
                    Date
                  </button>
                  <button
                    onClick={() => {
                      setSortBy('brand');
                      setShowSortMenu(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 ${
                      sortBy === 'brand' ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                    }`}
                  >
                    Brand
                  </button>
                  <button
                    onClick={() => {
                      setSortBy('projectType');
                      setShowSortMenu(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 ${
                      sortBy === 'projectType' ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                    }`}
                  >
                    Project Type
                  </button>
                  <button
                    onClick={() => {
                      setSortBy('brand-projectType');
                      setShowSortMenu(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 ${
                      sortBy === 'brand-projectType' ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                    }`}
                  >
                    Brand/Project Type
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Files Table */}
      {sortedFiles.length === 0 ? (
        <div className="p-8 bg-gray-50 rounded-lg text-center text-gray-600">
          No files saved yet. Create and save files from the Enter hex to see them here.
        </div>
      ) : (
        <div className="bg-white border-2 border-gray-300 rounded-lg overflow-hidden">
          {/* Table Header */}
          <div className="bg-gray-100 border-b-2 border-gray-300 px-4 py-2 flex items-center gap-4 text-sm text-gray-900">
            <div className="w-8 flex items-center justify-center">
              <input
                type="checkbox"
                checked={selectedFiles.size === sortedFiles.length && sortedFiles.length > 0}
                onChange={toggleSelectAll}
                className="w-4 h-4 cursor-pointer"
                title="Select all"
              />
            </div>
            <div className="flex-1 min-w-0">File Name</div>
            <div className="w-32">Brand</div>
            <div className="w-32">Project Type</div>
            <div className="w-28">Saved Date</div>
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-gray-200">
            {sortedFiles.map((file) => (
              <div
                key={file.fileName}
                className={`px-4 py-2 flex items-center gap-4 text-sm hover:bg-gray-50 ${
                  selectedFiles.has(file.fileName) ? 'bg-blue-50' : ''
                }`}
              >
                <div className="w-8 flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={selectedFiles.has(file.fileName)}
                    onChange={() => toggleFileSelection(file.fileName)}
                    className="w-4 h-4 cursor-pointer"
                  />
                </div>
                <div className="flex-1 min-w-0 text-gray-900 truncate" title={file.fileName}>
                  {file.fileName}
                </div>
                <div className="w-32 text-gray-700 truncate" title={file.brand}>
                  {file.brand}
                </div>
                <div className="w-32 text-gray-700 truncate" title={file.projectType}>
                  {file.projectType}
                </div>
                <div className="w-28 text-gray-600">
                  {new Date(file.timestamp).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selection Info */}
      {selectedFiles.size > 0 && (
        <div className="text-sm text-gray-600">
          {selectedFiles.size} file{selectedFiles.size !== 1 ? 's' : ''} selected
        </div>
      )}
    </div>
  );
}
