import { useState } from 'react';
import { Upload, Database, Play, FileText, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

const DATABRICKS_URL = 'https://dbc-1b7ba151-05e9.cloud.databricks.com';
const DEPLOYMENT_NAME = 'dbc-1b7ba151-05e9';

interface FunctionStatus {
  loading: boolean;
  success: boolean | null;
  message: string;
}

export function DatabricksTest() {
  const [fileUploadStatus, setFileUploadStatus] = useState<FunctionStatus>({
    loading: false,
    success: null,
    message: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Function 1: Upload File to Databricks
  const handleFileUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a file first');
      return;
    }

    setFileUploadStatus({ loading: true, success: null, message: 'Uploading file...' });

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('databricksUrl', DATABRICKS_URL);
      formData.append('deploymentName', DEPLOYMENT_NAME);

      // This will call your Vercel API route
      const response = await fetch('/api/databricks/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setFileUploadStatus({
          loading: false,
          success: true,
          message: `File uploaded successfully: ${data.path || 'Unknown path'}`,
        });
        toast.success('File uploaded to Databricks!');
      } else {
        throw new Error(data.error || 'Upload failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setFileUploadStatus({
        loading: false,
        success: false,
        message: `Error: ${errorMessage}`,
      });
      toast.error('Failed to upload file');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setFileUploadStatus({ loading: false, success: null, message: '' });
    }
  };

  const getStatusIcon = (status: FunctionStatus) => {
    if (status.loading) return <Loader2 className="size-5 animate-spin text-blue-500" />;
    if (status.success === true) return <CheckCircle className="size-5 text-green-500" />;
    if (status.success === false) return <XCircle className="size-5 text-red-500" />;
    return null;
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="bg-white rounded-lg shadow-lg p-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 pb-6 border-b">
          <Database className="size-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Databricks Testing App</h1>
            <p className="text-slate-500 mt-1">
              Deployment: {DEPLOYMENT_NAME}
            </p>
          </div>
        </div>

        {/* Connection Info */}
        <div className="bg-slate-50 rounded-lg p-4 mb-8">
          <h2 className="font-semibold text-slate-700 mb-2">Configuration</h2>
          <div className="text-sm text-slate-600 space-y-1">
            <p><span className="font-medium">Databricks URL:</span> {DATABRICKS_URL}</p>
            <p><span className="font-medium">GitHub:</span> https://github.com/Lesliewoodresearch/testSimple</p>
            <p><span className="font-medium">Backend:</span> Vercel Serverless Functions</p>
          </div>
        </div>

        {/* Function 1: File Upload */}
        <div className="border rounded-lg p-6 mb-6 hover:border-blue-300 transition-colors">
          <div className="flex items-start gap-4">
            <div className="bg-blue-100 rounded-lg p-3">
              <Upload className="size-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Function 1: Upload File to Databricks
              </h3>
              <p className="text-slate-600 text-sm mb-4">
                Select a file from your computer and upload it to Databricks storage.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Select File
                  </label>
                  <input
                    type="file"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-slate-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-lg file:border-0
                      file:text-sm file:font-semibold
                      file:bg-blue-50 file:text-blue-700
                      hover:file:bg-blue-100
                      file:cursor-pointer cursor-pointer"
                  />
                  {selectedFile && (
                    <p className="mt-2 text-sm text-slate-600">
                      Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                    </p>
                  )}
                </div>

                <button
                  onClick={handleFileUpload}
                  disabled={!selectedFile || fileUploadStatus.loading}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                >
                  <Upload className="size-4" />
                  {fileUploadStatus.loading ? 'Uploading...' : 'Upload to Databricks'}
                </button>

                {/* Status Display */}
                {fileUploadStatus.message && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-slate-50">
                    {getStatusIcon(fileUploadStatus)}
                    <p className="text-sm text-slate-700 flex-1">{fileUploadStatus.message}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Placeholder for Additional Functions */}
        <div className="border rounded-lg p-6 mb-6 border-dashed opacity-50">
          <div className="flex items-start gap-4">
            <div className="bg-slate-100 rounded-lg p-3">
              <Play className="size-6 text-slate-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-slate-700 mb-2">
                Function 2: Coming Soon
              </h3>
              <p className="text-slate-500 text-sm">
                Additional Databricks operations will be added here.
              </p>
            </div>
          </div>
        </div>

        <div className="border rounded-lg p-6 border-dashed opacity-50">
          <div className="flex items-start gap-4">
            <div className="bg-slate-100 rounded-lg p-3">
              <FileText className="size-6 text-slate-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-slate-700 mb-2">
                Function 3: Coming Soon
              </h3>
              <p className="text-slate-500 text-sm">
                Additional Databricks operations will be added here.
              </p>
            </div>
          </div>
        </div>

        {/* Implementation Notes */}
        <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <h4 className="font-semibold text-amber-900 mb-2">⚙️ Implementation Notes</h4>
          <p className="text-sm text-amber-800 mb-2">
            Create a Vercel API route at <code className="bg-amber-100 px-1 rounded">/api/databricks/upload.ts</code>
          </p>
          <p className="text-sm text-amber-800">
            The route should handle file uploads and communicate with Databricks using your stored credentials.
          </p>
        </div>
      </div>
    </div>
  );
}
