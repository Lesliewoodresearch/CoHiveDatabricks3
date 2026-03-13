# Session Versioning Examples

This document demonstrates how the session-based versioning system works with real-world examples.

## Date: March 7, 2026

### Scenario 1: Nike Packaging - Continuous Iterations

| Action | Filename Generated | Explanation |
|--------|-------------------|-------------|
| First iteration | `Nike_Packaging_2026-03-07` | No version suffix for first save |
| Second iteration | `Nike_Packaging_2026-03-07_V2` | Continuous iteration - V2 (no letter) |
| Third iteration | `Nike_Packaging_2026-03-07_V3` | Continuous iteration - V3 (no letter) |

**Session State After Third Iteration:**
- `sessionKey`: "Nike_Packaging"
- `baseFileName`: "Nike_Packaging_2026-03-07"
- `currentVersionLetter`: null
- `iterationNumber`: 3
- `contextSwitched`: false

---

### Scenario 2: Switch to Adidas Packaging

| Action | Filename Generated | Explanation |
|--------|-------------------|-------------|
| First iteration | `Adidas_Packaging_2026-03-07` | New session - no version suffix |
| Second iteration | `Adidas_Packaging_2026-03-07_V2` | Continuous iteration - V2 (no letter) |

**Session State After Second Iteration:**
- `sessionKey`: "Adidas_Packaging"
- `baseFileName`: "Adidas_Packaging_2026-03-07"
- `currentVersionLetter`: null
- `iterationNumber`: 2
- `contextSwitched`: false

**Global Tracker:**
- `lastActiveSessionKey`: "Adidas_Packaging"

---

### Scenario 3: Return to Nike Packaging (Context Switch!)

| Action | Filename Generated | Explanation |
|--------|-------------------|-------------|
| First iteration (after return) | `Nike_Packaging_2026-03-07_Va1` | Context switched! Started version letter 'a', iteration 1 |
| Second iteration | `Nike_Packaging_2026-03-07_Va2` | Continuing version 'a' - iteration 2 |
| Third iteration | `Nike_Packaging_2026-03-07_Va3` | Continuing version 'a' - iteration 3 |

**Session State After Third Iteration:**
- `sessionKey`: "Nike_Packaging"
- `baseFileName`: "Nike_Packaging_2026-03-07"
- `currentVersionLetter`: 'a'
- `iterationNumber`: 3
- `contextSwitched`: false (reset after handling)

**Global Tracker:**
- `lastActiveSessionKey`: "Nike_Packaging"

---

### Scenario 4: Manual "Start New Version Run"

User clicks "Start New Version Run" button while on Nike Packaging (currently at Va3)

| Action | Filename Generated | Explanation |
|--------|-------------------|-------------|
| Manual new version | `Nike_Packaging_2026-03-07_Vb1` | Force new version letter 'b', start at 1 |
| Next iteration | `Nike_Packaging_2026-03-07_Vb2` | Continue version 'b' - iteration 2 |

---

### Scenario 5: Switch to Nike Creative Messaging

| Action | Filename Generated | Explanation |
|--------|-------------------|-------------|
| First iteration | `Nike_Creative-Messaging_2026-03-07` | New project type = new session |
| Second iteration | `Nike_Creative-Messaging_2026-03-07_V2` | Continuous iteration - V2 |

**Note:** Even though it's the same brand (Nike), the project type changed (Packaging → Creative Messaging), so this creates a completely new session.

---

## Complete Timeline Summary

```
Session: Nike_Packaging
├─ Nike_Packaging_2026-03-07          (iteration 1)
├─ Nike_Packaging_2026-03-07_V2       (iteration 2)
└─ Nike_Packaging_2026-03-07_V3       (iteration 3)

[CONTEXT SWITCH to Adidas_Packaging]

Session: Adidas_Packaging
├─ Adidas_Packaging_2026-03-07        (iteration 1)
└─ Adidas_Packaging_2026-03-07_V2     (iteration 2)

[CONTEXT SWITCH back to Nike_Packaging]

Session: Nike_Packaging (resumed)
├─ Nike_Packaging_2026-03-07_Va1      (iteration 1 of version 'a')
├─ Nike_Packaging_2026-03-07_Va2      (iteration 2 of version 'a')
└─ Nike_Packaging_2026-03-07_Va3      (iteration 3 of version 'a')

[MANUAL: Start New Version Run]

Session: Nike_Packaging (new version)
├─ Nike_Packaging_2026-03-07_Vb1      (iteration 1 of version 'b')
└─ Nike_Packaging_2026-03-07_Vb2      (iteration 2 of version 'b')

[CONTEXT SWITCH to Nike_Creative-Messaging]

Session: Nike_Creative-Messaging
├─ Nike_Creative-Messaging_2026-03-07  (iteration 1)
└─ Nike_Creative-Messaging_2026-03-07_V2 (iteration 2)
```

---

## Next Day (March 8, 2026)

### Scenario 6: Nike Packaging on New Day

| Action | Filename Generated | Explanation |
|--------|-------------------|-------------|
| First iteration | `Nike_Packaging_2026-03-08` | New date = new base filename |
| Second iteration | `Nike_Packaging_2026-03-08_V2` | Continuous iteration - V2 |

**Key Point:** New day resets everything - new base filename with new date.

---

## Context Switch Detection Logic

The system detects a context switch when:

1. **User works on Session A** → `lastActiveSessionKey = "Nike_Packaging"`
2. **User switches to Session B** → `lastActiveSessionKey = "Adidas_Packaging"`
3. **User returns to Session A** → System detects: `lastActiveSessionKey ≠ currentSessionKey`
   - Context switch detected!
   - If `iterationNumber > 0`, start new version letter
   - Filename becomes: `Brand_Project_Date_V{letter}1`

---

## Summary of Versioning Rules

| Condition | Filename Format | Example |
|-----------|----------------|---------|
| First iteration ever | `Brand_Project_Date` | `Nike_Packaging_2026-03-07` |
| Continuous iterations | `Brand_Project_Date_V{num}` | `Nike_Packaging_2026-03-07_V2` |
| After context switch | `Brand_Project_Date_V{letter}{num}` | `Nike_Packaging_2026-03-07_Va1` |
| Manual new version | `Brand_Project_Date_V{letter}1` | `Nike_Packaging_2026-03-07_Vb1` |
| New day | `Brand_Project_NewDate` | `Nike_Packaging_2026-03-08` |

---

**Last Updated:** March 8, 2026
