# React Router Import Fixer

## Problem

Figma exports use `react-router` package, but your app uses `react-router-dom`. This causes conflicts because components from different packages don't work together.

## Solution

Run this script **after every Figma export** to automatically fix all imports.

---

## 🚀 Usage

### Option 1: Node.js Script (Recommended - Works on all platforms)

```bash
# Copy the script to your project root
cp fix-react-router-imports.js /path/to/CoHiveToDatabricks3/

# Run it
node fix-react-router-imports.js
```

### Option 2: Bash Script (Mac/Linux only)

```bash
# Copy and make executable
cp fix-react-router-imports.sh /path/to/CoHiveToDatabricks3/
chmod +x fix-react-router-imports.sh

# Run it
./fix-react-router-imports.sh
```

---

## 📋 What It Does

The script will:

1. ✅ Search all `.ts`, `.tsx`, `.js`, `.jsx` files in `src/`
2. ✅ Find all `from 'react-router'` imports
3. ✅ Replace them with `from 'react-router-dom'`
4. ✅ Show you which files were modified

---

## 🔄 Workflow After Figma Export

```bash
# 1. Export new files from Figma
# (Figma overwrites files in src/)

# 2. Run the fix script
node fix-react-router-imports.js

# 3. Review changes
git diff

# 4. Test locally
npm run dev

# 5. Commit and deploy
git add .
git commit -m "Update from Figma + fix react-router imports"
git push origin main
```

---

## 📝 Add to package.json Scripts (Optional)

Add this to your `package.json` for easy access:

```json
{
  "scripts": {
    "fix-imports": "node fix-react-router-imports.js",
    "figma-export": "node fix-react-router-imports.js && npm run dev"
  }
}
```

Then just run:
```bash
npm run fix-imports
```

---

## 🔍 Manual Check

To manually check if there are any `react-router` imports:

```bash
grep -r "from ['\"]react-router['\"]" src/
```

If this returns nothing, all imports are correct! ✅

---

## ⚠️ Important Notes

1. **Always run this AFTER Figma exports**, not before
2. **Test the app** after running to make sure everything works
3. **Commit the changes** so they're tracked in git
4. The script is safe - it only changes import statements, nothing else

---

## 🎯 What Gets Changed

### Before (Wrong)
```typescript
import { BrowserRouter } from 'react-router';
import { Routes, Route } from 'react-router';
```

### After (Correct)
```typescript
import { BrowserRouter } from 'react-router-dom';
import { Routes, Route } from 'react-router-dom';
```

---

## 🆘 Troubleshooting

### Script says "No issues found" but app has errors

The issue might be in:
- `package.json` still has `react-router` installed
- Run: `npm uninstall react-router`
- Run: `npm install react-router-dom`

### Script doesn't run

**Node.js script:**
- Make sure you have Node.js installed: `node --version`
- Run from project root (where `package.json` is)

**Bash script:**
- Mac/Linux only
- Make it executable: `chmod +x fix-react-router-imports.sh`

---

## 📞 Support

If you have issues, check:
1. You're in the project root directory
2. `src/` folder exists
3. You have Node.js installed (for .js version)

---

**After running this script, your app will use `react-router-dom` consistently and routing will work correctly!** 🎉
