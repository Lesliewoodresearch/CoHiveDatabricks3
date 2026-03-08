# Knowledge Base File Access Policy

## Overview

CoHive implements a simple two-tier access policy for Knowledge Base files that balances transparency with quality control.

---

## Access Levels

### 🔍 **VIEW Access (All Users)**

**Who:** Everyone (all roles)

**What:** Can view and read ALL files in the Knowledge Base

**Includes:**
- ✅ Approved files
- ✅ Pending approval files  
- ✅ All file types (Research, Wisdom, Synthesis, Findings)
- ✅ All scopes (Brand, Category, General)

**Purpose:** Promotes knowledge sharing and transparency across the organization

---

### ⚡ **USE Access (Approved Files Only)**

**Who:** Everyone (all roles)

**What:** Can ONLY use approved files in workflow hexes

**Rule:** Files must be approved before they can be selected/used in any hex

**Why:** Ensures all users work with vetted, quality-controlled content

---

### ✅ **APPROVE Access (Research Leaders Only)**

**Who:** Research Leaders only (role with `canApproveResearch: true`)

**What:** Can approve pending files in the Knowledge Base

**Workflow:**
1. View pending file in Knowledge Base
2. Click "Approve" button
3. File becomes available for USE by all users in hexes

**Why:** Maintains content quality standards while enabling rapid approval

---

## Access Matrix

```
┌────────────────────┬─────────────┬──────────────┬───────────────────┐
│                    │   VIEW      │   USE        │    APPROVE        │
│   User Role        │   All Files │   Approved   │    Files          │
├────────────────────┼─────────────┼──────────────┼───────────────────┤
│  Research Leader   │     ✅      │      ✅      │       ✅          │
│  Research Analyst  │     ✅      │      ✅      │       ❌          │
│  Non-Researcher    │     ✅      │      ✅      │       ❌          │
└────────────────────┴─────────────┴──────────────┴───────────────────┘

Note: ALL users can only USE approved files in hexes
```

---

## Visual Indicators

### Knowledge Base View

All users see:
```
📄 Example_Research.pdf
   [Research] • Nike • Creative Messaging • Jan 15, 2026
   ✅ Approved
   → All users can VIEW and USE

📄 Consumer_Insights.docx  
   [Wisdom] • General • Consumer Insights • Jan 16, 2026
   ⏳ Pending Approval
   → All users can VIEW
   → Nobody can USE (must be approved first)
```

### Selection Behavior

**Any user attempting to use unapproved file:**
```
❌ Cannot use unapproved files: Consumer_Insights.docx
   Files must be approved in the Knowledge Base before they can be used in hexes.
```

**Any user selecting approved file:**
```
✅ Success! File imported and ready to use
```

---

## User Workflows

### Non-Researcher or Research Analyst

**Viewing Files:**
1. Open Knowledge Base tab
2. ✅ See all files (approved + pending)
3. ✅ Click any file to read content
4. ✅ View file metadata

**Using Files in Hexes:**
1. Click "Import from Databricks" in a hex
2. Switch to "Knowledge Base" view
3. ✅ Select only approved files
4. Click "Import Selected"
5. ✅ Files imported successfully

**Attempting to Use Unapproved Files:**
1. Select unapproved file (with "Pending Approval" badge)
2. Click "Import Selected"
3. ❌ Error: "Cannot use unapproved files..."
4. Must deselect pending files to proceed

---

### Research Leader

**Viewing Files:** (same as above)
1. Open Knowledge Base tab
2. ✅ See all files
3. ✅ Read any file

**Approving Files:**
1. View pending file in Knowledge Base
2. ✅ See "Approve" button (only research leaders see this)
3. Click "Approve"
4. File status changes to "Approved"
5. File now available for USE by all users

**Using Files in Hexes:**
1. Can only use approved files (same as everyone else)
2. To use a pending file, must approve it first
3. Then import as approved file

---

## Benefits

### ✨ Simplicity
- Clear rule: Only approved files can be used
- Applies to everyone equally
- No role confusion

### 🔍 Transparency
- All users see all content
- No hidden files
- Builds organizational trust

### ✅ Quality Control
- All workflow content is vetted
- Research leaders control approval
- Maintains content standards

### ⚡ Efficiency
- Research leaders can approve quickly
- Approved files immediately available to all
- No bottlenecks for non-leaders

---

## Technical Implementation

### Components Modified

**1. ProcessWireframe.tsx (lines 1244-1257)**
```typescript
// ALL users can VIEW all files in Knowledge Base
console.log('📚 Loading all Knowledge Base files for viewing...');
kbFiles = await listKnowledgeBaseFiles({
  // No isApproved filter - ALL users can view all files
  sortBy: 'upload_date',
  sortOrder: 'DESC',
  limit: 500,
});
```

**2. ResearchView.tsx (lines 63-67)**
```typescript
// ALL users can VIEW all files in Knowledge Base
const displayFiles = filteredFiles;
```

**3. DatabricksFileBrowser.tsx (lines 160-179)**
```typescript
// ALL users can only use approved files in hexes
const unapprovedFiles = Array.from(selectedFiles)
  .map(fileId => knowledgeBaseFiles.find(f => f.fileId === fileId))
  .filter(file => file && !file.isApproved);

if (unapprovedFiles.length > 0) {
  setError(`Cannot use unapproved files: ${fileNames}. 
           Files must be approved in the Knowledge Base before 
           they can be used in hexes.`);
  return;
}
```

---

## Key Differences from Previous System

### Before:
- Researchers could use unapproved files
- Non-researchers could only use approved files
- Different rules for different roles = complexity

### Now:
- **Everyone** can only use approved files
- Research leaders have power to approve
- One simple rule = clarity

---

## Related Documentation

- `/guidelines/Guidelines.md` - Core development guidelines
- `/DATABRICKS_KNOWLEDGE_BASE_INTEGRATION.md` - Technical KB integration  
- `/docs/KNOWLEDGE_BASE_ACCESS_FLOW.md` - Visual flow diagrams
- `/components/ResearchView.tsx` - Knowledge Base UI component
- `/components/DatabricksFileBrowser.tsx` - File selection component

---

**Last Updated:** March 8, 2026
