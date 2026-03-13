# Knowledge Base Access Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        KNOWLEDGE BASE                               │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
│  │  Approved    │  │   Pending    │  │  Approved    │            │
│  │  File 1.pdf  │  │  File 2.docx │  │  File 3.xlsx │            │
│  └──────────────┘  └──────────────┘  └──────────────┘            │
│         ✅              ⏳                  ✅                      │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 │ VIEW (Read/Browse)
                                 ▼
                         ┌───────────────┐
                         │   ALL USERS   │
                         │  Can VIEW ALL │
                         │     Files     │
                         └───────┬───────┘
                                 │
                         USE (Select for Hexes)
                                 │
                 ┌───────────────┴───────────────┐
                 │                               │
        ┌────────▼────────┐             ┌───────▼──────────┐
        │  APPROVED FILE  │             │  PENDING FILE    │
        │                 │             │                  │
        │  ✅ ALL USERS  │             │  ❌ NO ONE       │
        │  Can USE in     │             │  Can USE         │
        │  Hexes          │             │                  │
        └─────────────────┘             │  Must be         │
                                        │  approved first  │
                                        └──────────────────┘
                                                │
                                                │
                                    ┌───────────▼───────────┐
                                    │  RESEARCH LEADER      │
                                    │  Can APPROVE          │
                                    │  (has approve button) │
                                    └───────────┬───────────┘
                                                │
                                                │ Approves file
                                                ▼
                                        ┌───────────────┐
                                        │ File becomes  │
                                        │ APPROVED      │
                                        │ → All users   │
                                        │   can now USE │
                                        └───────────────┘
```

---

## Access Matrix

```
┌────────────────────┬─────────────┬──────────────┬───────────────────┐
│                    │   VIEW      │   USE        │    APPROVE        │
│   User Type        │   All Files │   Approved   │    Files          │
├────────────────────┼─────────────┼──────────────┼───────────────────┤
│  Research Leader   │     ✅      │      ✅      │       ✅          │
│  Research Analyst  │     ✅      │      ✅      │       ❌          │
│  Non-Researcher    │     ✅      │      ✅      │       ❌          │
└────────────────────┴─────────────┴──────────────┴───────────────────┘

KEY RULE: Only approved files can be used in hexes (applies to everyone)
```

---

## File Status Indicators

```
📄 Approved File
   [Research] • Nike • Creative Messaging
   ✅ Approved • Jan 15, 2026
   → All users can VIEW and USE

📄 Pending File
   [Wisdom] • General • Consumer Insights
   ⏳ Pending Approval • Jan 16, 2026
   → All users can VIEW
   → Nobody can USE (must be approved first)
   → Only research leaders can APPROVE
```

---

## User Journey: Any User (Research Leader, Analyst, or Non-Researcher)

### Viewing Files
```
1. Open Knowledge Base Tab
   └─> See all files (approved + pending)

2. Click on ANY file to read
   └─> ✅ Content displayed (VIEW access for all)
```

### Using APPROVED Files in Hexes
```
1. Click "Import from Databricks"
   └─> See all files in dialog

2. Select APPROVED file(s)
   └─> Click "Import Selected"
       └─> ✅ Success! File imported
```

### Attempting to Use PENDING Files
```
1. Click "Import from Databricks"
   └─> See all files in dialog

2. Select PENDING file(s) (with "Pending Approval" badge)
   └─> Click "Import Selected"
       └─> ❌ Error: "Cannot use unapproved files: [filename]"
           └─> Must deselect pending files to proceed
```

---

## Research Leader Journey: Approving Files

```
1. Open Knowledge Base Tab
   └─> See pending files with "Pending Approval" badge

2. Click on pending file
   └─> File preview opens

3. Review file content
   └─> ✅ Click "Approve" button (only leaders see this)
       └─> File status changes to "Approved"
           └─> File now available for USE by ALL users
```

---

## System Flow: File Selection Validation

```
┌──────────────────┐
│  User Action:    │
│  Import Files    │
└────────┬─────────┘
         │
         ▼
┌────────────────────────────────┐
│  DatabricksFileBrowser         │
│  - Check selected files        │
│  - Validate approval status    │
└────────┬───────────────────────┘
         │
         ├─ All files approved? ──> ✅ Import all files
         │
         └─ Has pending files? ──> ❌ Error: "Cannot use unapproved files"
                                   └─> User must deselect pending files
```

---

## Approval Workflow

```
┌─────────────────────┐
│  File uploaded to   │
│  Knowledge Base     │
│  Status: Pending    │
└──────────┬──────────┘
           │
           │ All users can VIEW
           │ Nobody can USE
           │
           ▼
    ┌──────────────────┐
    │  Research Leader │
    │  reviews file    │
    └──────┬───────────┘
           │
           │ Clicks "Approve"
           │
           ▼
    ┌──────────────────┐
    │  File status:    │
    │  APPROVED ✅     │
    └──────┬───────────┘
           │
           │ ALL users can now USE
           │ in workflow hexes
           │
           ▼
    ┌──────────────────┐
    │  File available  │
    │  for import in   │
    │  all hexes       │
    └──────────────────┘
```

---

## Key Differences from Complex Systems

### Simple Rule:
```
✅ APPROVED files  → Everyone can use
❌ PENDING files   → Nobody can use
🔧 Research Leader → Can approve files
```

### Benefits:
- No role confusion
- One consistent rule
- Clear error messages
- Research leaders control quality
- Users know exactly what they can use

---

**Visual Guide Version:** 2.0  
**Last Updated:** March 8, 2026
