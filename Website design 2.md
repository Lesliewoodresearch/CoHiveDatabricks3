# CoHive — System Flowcharts

All significant user flows and data flows in the CoHive application.

---

## 1. App Startup & Auth Gate

```mermaid
flowchart TD
    A([User visits app]) --> B{localStorage\ncohive_logged_in?}
    B -- No --> C[Show Login screen]
    B -- Yes --> D{isAuthenticated?\ncheck session + expiry}
    D -- Session valid --> E[Load ProcessWireframe]
    D -- Expired / missing --> F[clearSession]
    F --> C
    C --> G[User enters workspace host\nclicks Sign In]
    G --> H[Initiate OAuth flow]
    H --> I[/oauth/callback route]
    I --> J{Token exchange\nsuccessful?}
    J -- Yes --> K[Set cohive_logged_in = true\nStore DatabricksSession]
    K --> E
    J -- No --> L[Show error message]
    L --> C
    E --> M[2-minute interval\nsession expiry check]
    M --> D
```

---

## 2. Databricks OAuth Round-Trip

```mermaid
flowchart TD
    A([User clicks Sign In]) --> B[Store random state\nin localStorage]
    B --> C[Build authorization URL\nworkspaceHost/oidc/v1/authorize\nclient_id + redirect_uri + scope]
    C --> D[Browser navigates to\nDatabricks OAuth page]
    D --> E{User grants\npermission?}
    E -- Denied --> F[OAuth error page]
    E -- Granted --> G[Databricks redirects to\n/oauth/callback?code=X&state=Y]
    G --> H[OAuthCallback component\nextracts code + state]
    H --> I{State matches\nlocalStorage?}
    I -- No --> J[CSRF error — abort]
    I -- Yes --> K[POST /api/databricks/auth\ncode + workspaceHost]
    K --> L[Backend: POST to\nworkspaceHost/oidc/v1/token\nwith client_secret server-side]
    L --> M{Token\nexchange OK?}
    M -- Fail --> N[Return 401 — show error]
    M -- Success --> O[Return access_token\nrefresh_token + expires_in]
    O --> P[Build DatabricksSession\nexpiresAt = now + expires_in]
    P --> Q[Save to localStorage\ncohive_databricks_session]
    Q --> R[Clear state from localStorage]
    R --> S[Redirect to /\ncohive_logged_in = true]
```

---

## 3. Enter Hex Setup

```mermaid
flowchart TD
    A([User opens Enter hex]) --> B[Step 1: Select brand\nfrom shared config dropdown]
    B --> C[Step 2: Select project type\nSystem built-in or user-custom]
    C --> D{War Games\nproject type?}
    D -- Yes --> H
    D -- No --> E[Step 3: Edit auto-generated filename\nBrand_ProjectType_YYYY-MM-DD]
    E --> F[Step 4a: Choose ideas source\nGet Inspired or Load Current Ideas]
    F --> G{Load Current\nIdeas selected?}
    G -- Yes --> I[Step 4b: Upload ideas file\nPDF, DOCX stored as base64]
    G -- No --> H
    I --> H[Step 5: Select KB research files\nfrom approved file list]
    H --> J[Select Example files optionally\ncross-brand format references]
    J --> K{All required\nfields complete?}
    K -- No --> L[Other hexes remain locked]
    K -- Yes --> M[All hexes unlock]
    M --> N[requestMode derived:\nGet Inspired → get-inspired\nLoad Ideas → load-ideas]
    N --> O[selectedResearchFiles + ideaElements\navailable to all hex executions]

    style D fill:#fef3c7
    style G fill:#fef3c7
    style K fill:#fef3c7
```

---

## 4. Persona Hex Flow (Luminaries / Consumers / Colleagues / Cultural)

```mermaid
flowchart TD
    A([User opens persona hex]) --> B[Step 1 of 2: Persona picker tree\nLevel 1 category → Level 2 group → Level 3 role]
    B --> C[User checks individual personas\nor uses Select All shortcuts]
    C --> D{Custom personas\navailable for this hex?}
    D -- Yes --> E[Show Custom Personas section\nCustom badge, same picker UI]
    D -- No --> F
    E --> F[Step 2 of 2: Choose assessment type]
    F --> G{Single persona\nselected?}
    G -- Yes --> H[Unified disabled\nchoose Assess or Recommend]
    G -- No --> I[Assess / Recommend / Unified\nall available]
    H --> J
    I --> J[Prior executions exist\nin this or other persona hex?]
    J -- Yes --> K[Prior Persona modal:\nInclude full prior context\nInclude summary only\nStart fresh]
    J -- No --> L
    K --> L[handleExecute called\nselectedPersonas + assessmentType + assessment]
    L --> M[Assessment modal opens\nwith full context: brand, projectType,\nkbFiles, requestMode, ideaElements,\nmodelEndpoint, hexExecutions]
    M --> N[User sets KB mode + scope\nStarts assessment]
    N --> O[POST /api/databricks/assessment/run]
    O --> P[SSE stream opens\nRounds arrive in real-time]
    P --> Q[Results displayed in modal\nUser can save Gems / Checks / Coal]

    style D fill:#fef3c7
    style G fill:#fef3c7
    style J fill:#fef3c7
```

---

## 5. Grade Hex Flow

```mermaid
flowchart TD
    A([User opens Grade hex]) --> B[Step 1: Ideas extracted automatically\nfrom all prior hex discussions]
    B --> C[Ideas displayed as checkboxes\nall checked by default]
    C --> D[User unchecks to exclude\nor types to add manually]
    D --> E{At least 1 idea\nselected?}
    E -- No --> D
    E -- Yes --> F[Step 2: Segment picker\nLifestyle / Demographic / Psychographic hierarchy]
    F --> G[User selects target segments\npopulation % shown per segment]
    G --> H{At least 1 segment\nselected?}
    H -- No --> G
    H -- Yes --> I[Step 3: Choose scoring scale\n1-5 written / 1-5 scores only\n1-10 written / 1-10 scores only\nWritten only]
    I --> J[Zappi Questions toggle\ndefault OFF]
    J --> K{Include Zappi\nQuestions?}
    K -- Yes --> L[7 concept-testing questions per\nidea × segment: Brand Fit, Standout,\nEmotion, Relevance, Understanding,\nPurchase Intent, Brand Appeal\nAll 1-5 same direction]
    K -- No --> M
    L --> M[Run Scoring clicked\ngradeAssessment encoded:\nGRADE_SCALE + GRADE_IDEAS\n+ optional ZAPPI_QUESTIONS:true]
    M --> N[POST /api/databricks/assessment/run\nassessmentTypes = grade\nselectedPersonas = segment IDs]
    N --> O[run.js parses markers\nbuilds scoring + optional Zappi prompt]
    O --> P[Each segment scores each idea\nfrom segment persona perspective]
    P --> Q[Score grid returned\nideas × segments with populations]
    Q --> R{Written assessments\nrequested?}
    R -- Yes --> S[One paragraph per idea × segment pair]
    R -- No --> T
    S --> T[Zappi responses section\nif toggle was ON]
    T --> U[Results appended to iteration file\nGrade: Score Grid + Grade: Written Assessments]

    style E fill:#fef3c7
    style H fill:#fef3c7
    style K fill:#fef3c7
    style R fill:#fef3c7
```

---

## 6. Assessment Pipeline (run.js)

```mermaid
flowchart TD
    A([POST /api/databricks/assessment/run]) --> B[Parse markers from userSolution:\nPRIOR_PERSONAS, PRIOR_SUMMARY,\nWAR_GAMES_COMPETITOR, ZAPPI_QUESTIONS]
    B --> C[Resolve credentials:\nenv vars preferred over OAuth token]
    C --> D[Fetch KB file content\nfrom Databricks volumes\ncapped at 80KB per file]
    D --> E[Fetch prior gems\nfor this brand + hex\nfrom gems table]
    E --> F[Build combinedSignals block\nKB gems + iteration signals\n+ prior persona context\n+ user directions]
    F --> G[Build iterationContextBlock\nfrom prior hex results this session]
    G --> H[Resolve projectTypePrompt\nuser-defined → system defaults → generic]
    H --> I[Load persona data\ncustom- prefix → customPersonaData\nbuilt-in → getPersonaContent]
    I --> J[Shuffle persona order\nto prevent anchoring]
    J --> K[Setup SSE headers\nbegin streaming]

    K --> L[Round 0: Moderator Opening\nsession objective, rules,\n3 sharp questions]
    L --> M[Stream round 0 to frontend]

    M --> N[Round 1: Parallel persona fire\nPromise.all across all personas]
    N --> O[Each persona: identity block\n+ KB context + task description\n+ mode block + rules]
    O --> P[Stream round 1 to frontend]

    P --> Q{numDebateRounds > 0\nAND more than 1 persona\nAND not War Games?}
    Q -- Yes --> R[Moderator Recap\n1 sentence per persona\ntensions + unchallenged claims]
    R --> S[Debate round: re-shuffled order\neach persona sees full prior transcript\nchallenge others by name]
    S --> T[Stream debate round to frontend]
    T --> U{More debate\nrounds?}
    U -- Yes --> R
    U -- No --> V
    Q -- No --> V

    V[Fact-Checker round\naudit all citations vs kbFileNames\nflag hallucinations]
    V --> W[Stream fact-checker to frontend]

    W --> X[Moderator Synthesis\nall-transcript closing\ndecisive recommendation]
    X --> Y[Stream synthesis to frontend]

    Y --> Z[Neutral Summarizer\nnever sees system prompt or KB\naccurate concise summary]
    Z --> AA[Extract cited filenames\nincrement citation_count in DB]
    AA --> AB[logAssessment to activity_log]
    AB --> AC[Stream complete event\nwith citedFiles + summary + durationMs]

    style Q fill:#fef3c7
    style U fill:#fef3c7
```

---

## 7. Knowledge Base: Upload & Process Flow

```mermaid
flowchart TD
    A([User in KB Synthesis mode]) --> B[Click Upload\nfile picker opens]
    B --> C[User selects file\nup to 37MB\nPDF, DOCX, audio, image, etc.]
    C --> D[Frontend reads file\nconverts to base64]
    D --> E[POST /api/databricks/knowledge-base/upload\nfileName + base64 + fileType + scope]
    E --> F[Backend: insert file_metadata row\nisApproved=false\ncleaningStatus=uncleaned]
    F --> G[Upload file to Databricks volumes\n/Volumes/knowledge_base/schema/files/]
    G --> H[Return fileId to frontend]
    H --> I[File appears in\nPending Processing list]

    I --> J[Researcher clicks Process]
    J --> K[POST /api/databricks/knowledge-base/process\nwith fileId]
    K --> L[Download file from volumes]
    L --> M{File type?}

    M -- txt / md / csv --> N[Read as UTF-8]
    M -- PDF --> O[Extract via pdf-parse]
    M -- DOCX / DOC --> P[Extract via mammoth]
    M -- XLSX / XLS --> Q[Extract via xlsx library]
    M -- Image --> R[Vision model describes image]
    M -- Audio webm/mp3/wav --> S[POST to OpenAI Whisper-1\nvia OPENAI_API_KEY\nReturn transcript with Recorded: date prefix]
    M -- Other --> T[Attempt UTF-8 read]

    N --> U
    O --> U
    P --> U
    Q --> U
    R --> U
    S --> U
    T --> U

    U[Text capped at 200KB] --> V[AI generates: summary, tags,\nsuggestedBrand, suggestedProjectTypes]
    V --> W[Upload _txt version to volumes\nfileId = original + _txt]
    W --> X[Insert _txt file_metadata row]
    X --> Y[Update original: cleaningStatus = processed]
    Y --> Z[File appears in Pending Approval]

    Z --> AA{Research Leader\napproves?}
    AA -- Yes --> AB[isApproved = true\napprovalDate = now]
    AB --> AC[File available in hex pickers\nfor all users]
    AA -- No --> AD[File stays unapproved\nnot visible in hexes]

    style M fill:#fef3c7
    style AA fill:#fef3c7
```

---

## 8. Custom Personas: Create / Edit / Delete

```mermaid
flowchart TD
    A([Researcher in KB Personas mode]) --> B[Click New Persona\nor click Edit on existing]
    B --> C[Persona form modal opens\n8 fields: Name required\nBackground, Tone, Style optional\nWhat they champion optional\nWhat they reject optional\nQuestions they always ask optional\nScoring lens optional\nHex assignment optional]
    C --> D{Saving new\nor updating?}
    D -- New --> E[POST /api/databricks/personas/save\nno personaId]
    D -- Updating --> F[POST /api/databricks/personas/save\nwith existing personaId]
    E --> G[Backend: ensurePersonasTable\nCREATE TABLE IF NOT EXISTS]
    F --> G
    G --> H{New?}
    H -- Yes --> I[Generate UUID\nprepend custom- prefix]
    H -- No --> J[Use passed personaId]
    I --> K[INSERT row: persona_id, name,\nhex_ids, content_json, created_by]
    J --> L[UPDATE row: name, hex_ids,\ncontent_json, updated_at]
    K --> M[Return personaId]
    L --> M
    M --> N[customPersonas state updated\nin ProcessWireframe]

    N --> O[Custom persona visible in\nhex pickers filtered by hexIds]
    O --> P{User selects\ncustom persona in hex?}
    P -- Yes --> Q[persona ID custom-uuid\nincluded in selectedPersonas]
    Q --> R[On Execute: full contentJson\npassed as customPersonaData\nin assessment request body]
    R --> S[run.js: id.startsWith custom-\nuse customPersonaData not getPersonaContent]
    S --> T[Persona assessed identically\nto built-in personas]

    P -- Researcher deletes --> U[POST /api/databricks/personas/delete\nsoft-delete: is_active = FALSE]
    U --> V[Persona removed from\ncustomPersonas state\ndisappears from pickers]

    style D fill:#fef3c7
    style H fill:#fef3c7
    style P fill:#fef3c7
```

---

## 9. Findings Hex: Save & Summarize

```mermaid
flowchart TD
    A([User opens Findings hex]) --> B{Choose action}
    B -- Save Iteration --> C{At least one hex\nexecuted this session?}
    C -- No --> D[Show error: run at least one hex]
    C -- Yes --> E[generateIterationFileName\nhandles versioning:\nfirst = no suffix\nreturn same day = V2 V3\nreturn new day = Va1 Vb1]
    E --> F[Collect all iteration content:\nhex results, gems, checks,\ncoal, directions as markdown]
    F --> G[POST /api/databricks/findings/save\nfileName + brand + projectType + content]
    G --> H[Backend saves to Databricks\nworkspace /findings/ folder]
    H --> I[Insert row in findings_iterations table]
    I --> J[Store sessionVersions in localStorage]
    J --> K[Clear iterationGems / Checks / Coal\nready for next iteration]

    B -- Summarize --> L[User selects saved iteration files]
    L --> M[Choose output options:\nExecutive Summary\nIdea list\nGems + Coal\ncombined report]
    M --> N[POST /api/databricks/findings/summarize\nfilenames + output options]
    N --> O[AI model reads selected files\ngenerates unified markdown summary]
    O --> P{User action}
    P -- Read --> Q[Open MarkdownViewer modal]
    P -- Save --> R[POST summary back to workspace]
    P -- Download --> S[Browser downloads .md file]

    style B fill:#fef3c7
    style C fill:#fef3c7
    style P fill:#fef3c7
```

---

## 10. Wisdom Hex: All Input Methods

```mermaid
flowchart TD
    A([User opens Wisdom hex]) --> B[Choose input method]

    B --> C[Text]
    B --> D[Voice]
    B --> E[Photo]
    B --> F[Video]
    B --> G[File]
    B --> H[Interview]

    C --> C1[Type insight in textarea\noptional voice-to-text mic icon]
    C1 --> C2[Click Save\nconvert text to .txt file]
    C2 --> Z

    D --> D1[Click Start Recording\nbrowser requests microphone]
    D1 --> D2{Permission\ngranted?}
    D2 -- No --> D3[Show mic error]
    D2 -- Yes --> D4[MediaRecorder captures WebM audio]
    D4 --> D5[User speaks → Stop Recording]
    D5 --> D6[Audio blob saved as .webm file]
    D6 --> Z

    E --> E1{Capture or\nUpload?}
    E1 -- Capture --> E2[requestCameraAccess\ncapture JPEG frame from video]
    E1 -- Upload --> E3[File picker JPEG / PNG]
    E2 --> Z
    E3 --> Z

    F --> F1[MediaRecorder captures video\nWebM container]
    F1 --> F2[Stop → video file saved]
    F2 --> Z

    G --> G1[File picker\nany format up to 37MB]
    G1 --> Z

    H --> H1[AIConversation created\nflexible interview system prompt]
    H1 --> H2[User types topic\nAI asks opening question]
    H2 --> H3[Multi-turn Q&A\nAI prompts for depth]
    H3 --> H4{User ends\ninterview?}
    H4 -- No --> H3
    H4 -- Yes --> H5[AI generates structured summary]
    H5 --> H6[User edits summary if desired]
    H6 --> H7[Save summary as file]
    H7 --> Z

    Z[uploadToKnowledgeBase\nfileType=Wisdom\nscope=brand/category/general]
    Z --> AA[File pending processing\nResearch Leader must\nProcess then Approve]

    style D2 fill:#fef3c7
    style E1 fill:#fef3c7
    style H4 fill:#fef3c7
```

---

## 11. AI Help Widget Flow

```mermaid
flowchart TD
    A([Any authenticated page]) --> B[AIHelpWidget mounted\nwith context props:\nhexId, hexLabel, userRole\ncurrentStep, selectedFiles\nresearchMode, wisdomInputMethod]
    B --> C[Context banner built\ne.g. Nike · Creative Messaging · Step 2/3]
    C --> D[Welcome message shown\nhint to type help]

    D --> E{User input}

    E -- types help --> F[Identify current hex\nlook up HELP_MANUAL entry]
    F --> G[Show guess chip:\nYes walk me through it\nNo something else]
    G --> H{User chip}
    H -- Yes --> I[Show numbered step-by-step guide\nfor current hex]
    H -- No --> J[Show all hex chips\nuser picks which flow to learn]
    J --> I

    E -- types question --> K[Append to conversationHistory\ncall executeAIPrompt]
    K --> L[systemPrompt: current page state\n+ full HELP_MANUAL\n+ Hex documentation\ncontext-aware]
    L --> M[AI responds with\ncontextual guidance]
    M --> N[Response added to messages\nconversationHistory updated]
    N --> E

    E -- switches hex --> O[Nudge message:\nI see you switched to X]
    O --> E

    E -- switches KB mode --> P[Nudge message:\nSwitched to Personas mode]
    P --> E

    style H fill:#fef3c7
```

---

## 12. Iteration Signals: Gems / Checks / Coal

```mermaid
flowchart TD
    A([Assessment modal open\nresults streaming in]) --> B[User highlights text\nin any round result]
    B --> C{Signal type}

    C -- Gem: really like this --> D[Save gem modal:\nconfirm text + optional note]
    D --> E[saveGem called\nPOST /api/databricks/gems/save\nbrand + projectType + hexId + gemText]
    E --> F[Gem stored in Databricks gems table]
    F --> G[iterationGems state updated\nin AssessmentModal → bubbled to ProcessWireframe]

    C -- Check: interested --> H[Check saved to iterationChecks state]
    C -- Coal: avoid this --> I[Coal saved to iterationCoal state]

    G --> J
    H --> J
    I --> J

    J[GemCheckCoalReviewPanel\nshown post-assessment\nUser confirms and ranks signals]
    J --> K[Confirmed signals stored\nin ranked order]

    K --> L[Next hex execution triggered]
    L --> M[buildIterationSignalsBlock:\nGems ranked by importance\nChecks worth exploring\nCoal to actively avoid]
    M --> N[Injected into every persona prompt\nand Moderator opening]
    N --> O[Personas calibrate their\nresponses toward gems\naway from coal]

    O --> P{Iteration saved\nor next iteration?}
    P -- Save iteration --> Q[Signals appended to\niteration markdown file]
    Q --> R[iterationGems / Checks / Coal\ncleared from state]
    P -- Next hex in same iteration --> L

    style C fill:#fef3c7
    style P fill:#fef3c7
```

---

## 13. War Games Special Flow

```mermaid
flowchart TD
    A([User selects War Games\nin Enter hex]) --> B[Ideas Source + Ideas File\nhidden — War Games always generative]
    B --> C[Only KB Research Files\nselected in Enter hex]
    C --> D[Enter complete → all hexes unlock]

    D --> E[User opens Competitors hex]
    E --> F[Step 1: Type competitor brand name\ne.g. Coca-Cola]
    F --> G{War Games mode\nauto-detected}
    G --> H[Analysis Type dropdown hidden\nprompt: Describe scenario or strategic question]
    H --> I[User types scenario optional\ne.g. Competitor launching RTD in our core SKU]
    I --> J[Click Execute\nWAR_GAMES_COMPETITOR: name\ninjected into assessment field]

    J --> K[POST /api/databricks/assessment/run\nprojectType = War Games\nassessmentType = unified\nselectedPersonas = empty]
    K --> L[run.js detects War Games\nskips persona debate framework]
    L --> M[projectTypePrompt: 5-step\nWar Games framework\n1. Brand Offensive + Defensive moves\n2. Competitor Reactions to Step 1\n3. Competitor Independent moves\n4. Brand Responses to Step 3\n5. Summary Priority Likelihood]
    M --> N[warGamesCompetitorBlock prepended:\nexact brand and competitor names\nused throughout all 5 steps]
    N --> O[Moderator frames session\nwith competitive framing]
    O --> P[Single unified AI call\nor minimal rounds — no persona debate]
    P --> Q[5-step analysis returned]
    Q --> R[Moderator synthesis:\ndecisive competitive strategy]
    R --> S[Results streamed to AssessmentModal]

    S --> T[User can run again\nwith different competitor]
    T --> U[Each execution saved\nin hexExecutions competitors]
    U --> V[Prior executions shown\nin Competitors history]

    style G fill:#fef3c7
```

---

## 14. Full System Overview

```mermaid
flowchart TD
    subgraph Browser ["Browser (React SPA)"]
        A[App.tsx\nAuth gate] --> B[ProcessWireframe\nMain orchestrator]
        B --> C[Enter Hex\nBrand, ProjectType,\nKB files, Ideas mode]
        B --> D[Persona Hexes\nLuminaries / Consumers\nColleagues / Cultural]
        B --> E[Grade Hex\nScore ideas × segments\nZappi Questions]
        B --> F[Competitors Hex\nWar Games analysis]
        B --> G[Research KB\nUpload, Process, Approve\nCustom Personas]
        B --> H[Wisdom Hex\nText, Voice, Photo,\nVideo, File, Interview]
        B --> I[Findings Hex\nSave iteration, Summarize]
        B --> J[AIHelpWidget\nContextual help\non every page]
        D --> K[CentralHexView\n3-step workflow]
        E --> K
        K --> L[AssessmentModal\nSSE streaming results\nGem / Check / Coal]
    end

    subgraph API ["Vercel Serverless Functions (api/)"]
        M[auth.js\nOAuth token exchange]
        N[assessment/run.js\nFull multi-round pipeline\nModerator + Personas\nFact-Checker + Synthesis]
        O[knowledge-base/upload.js\nFile → Databricks volumes]
        P[knowledge-base/process.js\nText extract + AI metadata\nWhisper audio transcription]
        Q[personas/save.js\nlist.js + delete.js]
        R[gems/save.js]
        S[findings/save.js\nsummarize.js]
        T[config/brands-projects.js]
    end

    subgraph Databricks ["Databricks"]
        U[Model Serving\nClaude / GPT / Gemini]
        V[SQL Warehouse\nfile_metadata\ncustom_personas\ngems + activity_log\nfindings_iterations]
        W[Volumes\n/knowledge_base/files/]
        X[OpenAI Whisper-1\nAudio transcription]
    end

    L --> N
    G --> O
    G --> P
    G --> Q
    L --> R
    I --> S
    B --> T

    N --> U
    N --> V
    N --> W
    P --> W
    P --> V
    P --> X
    O --> W
    O --> V
    Q --> V
    R --> V
    S --> V
    T --> V
```

---

*Generated from CoHive codebase — May 2026*
