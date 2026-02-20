# Knowledge Base Metadata Tracking

## Overview

The CoHive Knowledge Base file system includes comprehensive metadata tracking for citation counts, gem inclusions, and approval workflows. This document explains how to use these features.

---

## Metadata Fields

### Citation Tracking

**`citationCount`** (number)
- Tracks how many times a file has been cited/referenced in analyses
- Automatically incremented when a file is used as a source
- Helps identify most valuable knowledge base files
- Use case: Understanding which files provide the most insights

**`gemInclusionCount`** (number)
- Tracks how many times cited elements from this file were included in saved gems
- Incremented when a user saves a gem that includes citations from this file
- Measures real-world impact and utility of file content
- Use case: Identifying highest-quality, most actionable content

### Approval Metadata

**`isApproved`** (boolean)
- Whether the file has been approved for use in the knowledge base
- Required for files to appear in certain workflows
- Ensures quality control

**`approvedBy`** (string)
- Username or email of the person who approved the file
- Provides accountability and traceability
- Example: `"sarah.johnson@company.com"`

**`approvedDate`** (timestamp)
- Unix timestamp of when the file was approved
- Helps track approval history and currency of approval

**`approvalNotes`** (string, optional)
- Optional notes about why the file was approved
- Can include quality comments, usage guidance, or caveats
- Example: `"Comprehensive brand strategy, high quality insights"`

---

## API Functions

### Increment Citation Count

Called automatically when a file is cited in an analysis:

```typescript
import { incrementCitationCount } from './utils/databricksAPI';

// When a file is used as a source
await incrementCitationCount(fileId);
```

**When to call:**
- When a hex execution references a knowledge base file
- When synthesis includes content from a file
- When recommendations are based on a specific file

**Implementation example:**
```typescript
// In hex execution logic
const selectedFiles = ['file1', 'file2', 'file3'];

for (const fileId of selectedFiles) {
  await incrementCitationCount(fileId);
}

// Then proceed with analysis
const result = await executeDatabricksAnalysis(/* ... */);
```

---

### Increment Gem Inclusion Count

Called when a saved gem includes citations from this file:

```typescript
import { incrementGemInclusionCount } from './utils/databricksAPI';

// When user saves a gem that cites this file
await incrementGemInclusionCount(fileId);
```

**When to call:**
- When user clicks "Save Iteration" in Action hex
- When user saves findings that include file citations
- When synthesis outputs reference specific files

**Implementation example:**
```typescript
// In gem save logic
const citedFiles = extractCitationsFromGem(gemContent);

for (const fileId of citedFiles) {
  await incrementGemInclusionCount(fileId);
}

// Then save the gem
await saveGemToDatabase(gemData);
```

---

### Approve a File

Approves a file with approver metadata:

```typescript
import { approveKnowledgeBaseFile } from './utils/databricksAPI';

// Approve with required approver name
await approveKnowledgeBaseFile(
  fileId,
  'sarah.johnson@company.com',
  'Comprehensive brand strategy, high quality insights' // Optional notes
);
```

**Parameters:**
- `fileId` (string): ID of the file to approve
- `approverName` (string): Email or username of approver
- `approvalNotes` (string, optional): Notes about the approval

**Use cases:**
- Researcher approves new synthesis file
- Manager approves wisdom contributions
- Quality review process for uploaded files

---

### Unapprove a File

Removes approval status:

```typescript
import { unapproveKnowledgeBaseFile } from './utils/databricksAPI';

// Remove approval
await unapproveKnowledgeBaseFile(fileId);
```

**When to use:**
- File needs revision
- Quality issues discovered
- Content becomes outdated

---

## UI Integration Examples

### Displaying Citation Metrics

```typescript
// In file list component
{files.map(file => (
  <div key={file.id} className="file-card">
    <div className="file-name">{file.fileName}</div>
    <div className="file-metrics">
      <span>📈 Citations: {file.citationCount || 0}</span>
      <span>💎 Gem Inclusions: {file.gemInclusionCount || 0}</span>
    </div>
    {file.approvedBy && (
      <div className="approval-info">
        ✅ Approved by {file.approvedBy}
        {file.approvalNotes && (
          <div className="approval-notes">{file.approvalNotes}</div>
        )}
      </div>
    )}
  </div>
))}
```

### Approval Button

```typescript
// Approval UI component
const [approverName, setApproverName] = useState('');
const [approvalNotes, setApprovalNotes] = useState('');

const handleApprove = async () => {
  if (!approverName) {
    alert('Please enter your name/email');
    return;
  }
  
  const result = await approveKnowledgeBaseFile(
    file.id,
    approverName,
    approvalNotes
  );
  
  if (result.success) {
    alert('✅ File approved!');
    // Refresh file list
    refreshFiles();
  }
};

<div className="approval-form">
  <input
    type="text"
    placeholder="Your email"
    value={approverName}
    onChange={(e) => setApproverName(e.target.value)}
  />
  <textarea
    placeholder="Approval notes (optional)"
    value={approvalNotes}
    onChange={(e) => setApprovalNotes(e.target.value)}
  />
  <button onClick={handleApprove}>
    Approve File
  </button>
</div>
```

### Sorting by Metrics

```typescript
// Sort files by citation count
const sortedByCitations = [...files].sort((a, b) => 
  (b.citationCount || 0) - (a.citationCount || 0)
);

// Sort by gem inclusions
const sortedByGems = [...files].sort((a, b) => 
  (b.gemInclusionCount || 0) - (a.gemInclusionCount || 0)
);

// Filter only approved files
const approvedFiles = files.filter(f => f.isApproved);
```

---

## Workflow Integration

### 1. File Upload to Knowledge Base

```typescript
// When uploading a new file
const newFile: KnowledgeBaseFile = {
  id: generateId(),
  brand: 'Nike',
  projectType: 'Creative Messaging',
  fileName: 'New_Research_File.pdf',
  isApproved: false, // Start as unapproved
  uploadDate: Date.now(),
  fileType: 'Synthesis',
  content: base64Content,
  citationCount: 0, // Initialize to 0
  gemInclusionCount: 0, // Initialize to 0
  // Approval fields remain undefined until approved
};

await saveToKnowledgeBase(newFile);
```

### 2. Hex Execution with File Citations

```typescript
// In hex execution logic (e.g., Buyers hex)
const executeHexAnalysis = async (selectedFiles: string[]) => {
  // Increment citation counts for all selected files
  for (const fileId of selectedFiles) {
    await incrementCitationCount(fileId);
    console.log(`📈 Citation count incremented for ${fileId}`);
  }
  
  // Execute analysis with Databricks
  const result = await databricksExecute({
    files: selectedFiles,
    // ... other params
  });
  
  return result;
};
```

### 3. Saving Gems with File References

```typescript
// In Action hex when saving findings
const saveFindings = async (findings: string, citedFileIds: string[]) => {
  // Increment gem inclusion count for all cited files
  for (const fileId of citedFileIds) {
    await incrementGemInclusionCount(fileId);
    console.log(`💎 Gem inclusion count incremented for ${fileId}`);
  }
  
  // Save the findings
  await saveToUserFolder({
    fileName: 'Findings_Summary.json',
    content: findings,
    citedFiles: citedFileIds,
    // ... other data
  });
  
  alert('✅ Findings saved with citation tracking!');
};
```

### 4. Knowledge Base Approval Workflow

```typescript
// Researcher mode: Approve uploaded synthesis files
const approvalWorkflow = async (fileId: string, researcherEmail: string) => {
  // Get file details
  const files = await fetchKnowledgeBaseFiles();
  const file = files.find(f => f.id === fileId);
  
  if (!file) {
    alert('File not found');
    return;
  }
  
  // Show approval dialog
  const notes = prompt('Enter approval notes (optional):');
  
  // Approve the file
  const result = await approveKnowledgeBaseFile(
    fileId,
    researcherEmail,
    notes || undefined
  );
  
  if (result.success) {
    alert(`✅ "${file.fileName}" approved!`);
  }
};
```

---

## Analytics and Reporting

### Most Cited Files

```typescript
const getMostCitedFiles = async (limit: number = 10) => {
  const files = await fetchKnowledgeBaseFiles({ isApproved: true });
  
  return files
    .sort((a, b) => (b.citationCount || 0) - (a.citationCount || 0))
    .slice(0, limit);
};

// Usage
const topFiles = await getMostCitedFiles(10);
console.log('Top 10 most cited files:', topFiles);
```

### Highest Impact Files (Gem Inclusions)

```typescript
const getHighestImpactFiles = async (limit: number = 10) => {
  const files = await fetchKnowledgeBaseFiles({ isApproved: true });
  
  return files
    .filter(f => (f.gemInclusionCount || 0) > 0)
    .sort((a, b) => (b.gemInclusionCount || 0) - (a.gemInclusionCount || 0))
    .slice(0, limit);
};

// Usage
const impactFiles = await getHighestImpactFiles(10);
console.log('Files with highest gem inclusions:', impactFiles);
```

### Citation to Gem Conversion Rate

```typescript
const calculateConversionRate = (file: KnowledgeBaseFile): number => {
  if (!file.citationCount || file.citationCount === 0) return 0;
  return ((file.gemInclusionCount || 0) / file.citationCount) * 100;
};

// Find files with best conversion
const files = await fetchKnowledgeBaseFiles({ isApproved: true });
const withConversion = files.map(f => ({
  ...f,
  conversionRate: calculateConversionRate(f)
}));

const bestConverting = withConversion
  .filter(f => f.citationCount && f.citationCount > 5) // Min 5 citations
  .sort((a, b) => b.conversionRate - a.conversionRate)
  .slice(0, 10);

console.log('Files with best citation-to-gem conversion:', bestConverting);
```

### Approval Status Report

```typescript
const getApprovalReport = async () => {
  const allFiles = await fetchKnowledgeBaseFiles();
  
  const report = {
    total: allFiles.length,
    approved: allFiles.filter(f => f.isApproved).length,
    pending: allFiles.filter(f => !f.isApproved).length,
    byApprover: {} as Record<string, number>,
    byFileType: {} as Record<string, { approved: number; total: number }>
  };
  
  // Count by approver
  allFiles.forEach(f => {
    if (f.approvedBy) {
      report.byApprover[f.approvedBy] = (report.byApprover[f.approvedBy] || 0) + 1;
    }
  });
  
  // Count by file type
  allFiles.forEach(f => {
    if (!report.byFileType[f.fileType]) {
      report.byFileType[f.fileType] = { approved: 0, total: 0 };
    }
    report.byFileType[f.fileType].total++;
    if (f.isApproved) {
      report.byFileType[f.fileType].approved++;
    }
  });
  
  return report;
};
```

---

## Best Practices

### 1. Initialize Counts on Upload
Always set `citationCount` and `gemInclusionCount` to 0 when creating new files.

### 2. Increment Asynchronously
Citation and gem increment calls don't need to block the UI:
```typescript
// Fire and forget (optional)
incrementCitationCount(fileId).catch(console.error);

// Or await if you need confirmation
await incrementCitationCount(fileId);
```

### 3. Batch Increment Operations
When multiple files are cited, increment in parallel:
```typescript
await Promise.all(
  selectedFiles.map(fileId => incrementCitationCount(fileId))
);
```

### 4. Track Citation Sources
Consider tracking which hex/execution cited each file for deeper analytics.

### 5. Approval Notifications
Send notifications to relevant teams when files are approved:
```typescript
const result = await approveKnowledgeBaseFile(fileId, approverName, notes);
if (result.success) {
  await sendApprovalNotification(fileId, approverName);
}
```

### 6. Regular Audits
Periodically review files with high citations but low gem inclusions - they may need quality improvements.

### 7. Unapproval Workflow
When unapproving files, consider notifying the original uploader:
```typescript
const result = await unapproveKnowledgeBaseFile(fileId);
if (result.success) {
  await notifyUploader(fileId, 'File requires revision');
}
```

---

## Database Schema (Production)

When implementing in production Databricks, the schema should include:

```sql
CREATE TABLE knowledge_base_files (
  id STRING PRIMARY KEY,
  brand STRING,
  project_type STRING,
  file_name STRING,
  is_approved BOOLEAN DEFAULT FALSE,
  upload_date TIMESTAMP,
  file_type STRING,
  content STRING, -- Base64 or reference
  source STRING, -- DBFS path
  insight_type STRING,
  input_method STRING,
  
  -- Citation tracking
  citation_count INT DEFAULT 0,
  gem_inclusion_count INT DEFAULT 0,
  
  -- Approval metadata
  approved_by STRING,
  approved_date TIMESTAMP,
  approval_notes STRING,
  
  -- Indexes for performance
  INDEX idx_brand (brand),
  INDEX idx_project_type (project_type),
  INDEX idx_file_type (file_type),
  INDEX idx_is_approved (is_approved),
  INDEX idx_citation_count (citation_count DESC),
  INDEX idx_gem_inclusion_count (gem_inclusion_count DESC)
);
```

---

## API Endpoints (Production)

### Increment Citation
```
POST /api/databricks/knowledge-base/{fileId}/increment-citation
```

### Increment Gem Inclusion
```
POST /api/databricks/knowledge-base/{fileId}/increment-gem-inclusion
```

### Approve File
```
POST /api/databricks/knowledge-base/{fileId}/approve
Body: { approverName, approvalNotes }
```

### Unapprove File
```
POST /api/databricks/knowledge-base/{fileId}/unapprove
```

### Get File with Metadata
```
GET /api/databricks/knowledge-base/{fileId}
Response includes all metadata fields
```

---

## Testing

### Development Mode
The system includes mock implementations that simulate success for all operations. Set `DEVELOPMENT_MODE = true` in `/utils/databricksAPI.ts`.

### Example Test Data
Mock files include realistic citation counts, gem inclusions, and approval metadata for testing UI components.

---

**Last Updated:** February 8, 2025  
**Version:** 1.0  
**Maintained By:** CoHive Development Team
