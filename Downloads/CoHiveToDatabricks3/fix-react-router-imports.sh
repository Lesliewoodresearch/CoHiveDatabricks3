#!/bin/bash

###############################################################################
# Fix React Router Imports
# 
# This script finds all imports from 'react-router' and changes them to 
# 'react-router-dom' to fix package conflicts with Figma exports.
#
# Usage: ./fix-react-router-imports.sh
###############################################################################

echo "🔍 Searching for 'react-router' imports (that should be 'react-router-dom')..."
echo ""

# Count how many files have the issue
file_count=$(grep -rl "from ['\"]react-router['\"]" src/ --include="*.tsx" --include="*.ts" --include="*.jsx" --include="*.js" 2>/dev/null | wc -l | tr -d ' ')

if [ "$file_count" -eq 0 ]; then
  echo "✅ No issues found! All imports are using 'react-router-dom' correctly."
  exit 0
fi

echo "Found $file_count file(s) with 'react-router' imports that need fixing:"
echo ""

# List the files
grep -rl "from ['\"]react-router['\"]" src/ --include="*.tsx" --include="*.ts" --include="*.jsx" --include="*.js" 2>/dev/null

echo ""
echo "🔧 Fixing imports..."
echo ""

# Fix all occurrences
# This handles both single and double quotes
find src/ -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.jsx" -o -name "*.js" \) -exec sed -i '' "s/from ['\"]react-router['\"]/from 'react-router-dom'/g" {} \;

echo "✅ Fixed all 'react-router' imports to 'react-router-dom'"
echo ""
echo "📋 Files modified:"
grep -rl "from ['\"]react-router-dom['\"]" src/ --include="*.tsx" --include="*.ts" --include="*.jsx" --include="*.js" 2>/dev/null | head -20

echo ""
echo "🎯 Next steps:"
echo "1. Review the changes: git diff"
echo "2. Test the app: npm run dev"
echo "3. Commit: git add . && git commit -m 'Fix react-router imports'"
echo "4. Deploy: git push origin main"
