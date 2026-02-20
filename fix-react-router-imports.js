#!/usr/bin/env node

/**
 * Fix React Router Imports
 * 
 * This script finds all imports from 'react-router' and changes them to 
 * 'react-router-dom' to fix package conflicts with Figma exports.
 * 
 * Usage: node fix-react-router-imports.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Searching for react-router imports...\n');

let filesFixed = 0;
let totalReplacements = 0;

/**
 * Recursively find all TypeScript/JavaScript files in a directory
 */
function findFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Skip node_modules and build directories
      if (!['node_modules', 'dist', 'build', '.git'].includes(file)) {
        findFiles(filePath, fileList);
      }
    } else if (/\.(tsx?|jsx?)$/.test(file)) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

/**
 * Fix react-router imports in a file
 */
function fixImportsInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  
  // Match imports from 'react-router' (with single or double quotes)
  const patterns = [
    /from ['"]react-router['"]/g,
    /import\(['"]react-router['"]\)/g,
  ];
  
  let fileChanged = false;
  let replacements = 0;
  
  patterns.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      replacements += matches.length;
      fileChanged = true;
    }
  });
  
  if (fileChanged) {
    // Replace 'react-router' with 'react-router-dom'
    content = content.replace(/from ['"]react-router['"]/g, "from 'react-router-dom'");
    content = content.replace(/import\(['"]react-router['"]\)/g, "import('react-router-dom')");
    
    fs.writeFileSync(filePath, content, 'utf8');
    
    console.log(`✅ Fixed: ${path.relative(process.cwd(), filePath)} (${replacements} replacement${replacements > 1 ? 's' : ''})`);
    
    filesFixed++;
    totalReplacements += replacements;
  }
}

// Main execution
try {
  const srcDir = path.join(process.cwd(), 'src');
  
  if (!fs.existsSync(srcDir)) {
    console.error('❌ Error: src/ directory not found');
    console.error('   Make sure you run this script from the project root directory');
    process.exit(1);
  }
  
  const files = findFiles(srcDir);
  console.log(`📂 Scanning ${files.length} files...\n`);
  
  files.forEach(fixImportsInFile);
  
  console.log('\n' + '='.repeat(60));
  
  if (filesFixed === 0) {
    console.log('✅ No issues found! All imports are using react-router-dom correctly.');
  } else {
    console.log(`\n✅ Success!`);
    console.log(`   Files fixed: ${filesFixed}`);
    console.log(`   Total replacements: ${totalReplacements}`);
    console.log('\n🎯 Next steps:');
    console.log('   1. Review changes: git diff');
    console.log('   2. Test the app: npm run dev');
    console.log('   3. Commit: git add . && git commit -m "Fix react-router imports"');
    console.log('   4. Deploy: git push origin main');
  }
  
  console.log('='.repeat(60) + '\n');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
