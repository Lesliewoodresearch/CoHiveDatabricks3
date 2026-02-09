#!/bin/bash

# =============================================================================
# Figma-Make Safe Workflow Script
# 
# This script automates the complete workflow:
# 1. Backup protected Databricks files
# 2. Prompt for Figma-Make regeneration
# 3. Restore protected files
# 4. Verify integrity
# 
# Usage: ./scripts/figma-make-workflow.sh
# =============================================================================

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

clear

echo -e "${BLUE}"
cat << "EOF"
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║          FIGMA-MAKE SAFE WORKFLOW                          ║
║          Databricks Integration Protection                 ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

echo ""
echo -e "${YELLOW}This script will guide you through safely regenerating"
echo -e "UI components with Figma-Make while protecting your"
echo -e "Databricks integration code.${NC}"
echo ""

# Check if scripts exist
if [ ! -f "scripts/backup-protected.sh" ]; then
  echo -e "${RED}Error: backup-protected.sh not found!${NC}"
  echo "Please ensure all scripts are in the scripts/ directory"
  exit 1
fi

if [ ! -f "scripts/restore-protected.sh" ]; then
  echo -e "${RED}Error: restore-protected.sh not found!${NC}"
  echo "Please ensure all scripts are in the scripts/ directory"
  exit 1
fi

# =============================================================================
# STEP 1: Backup
# =============================================================================

echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}STEP 1: Backing up protected files${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""

./scripts/backup-protected.sh

if [ $? -ne 0 ]; then
  echo -e "${RED}Backup failed! Aborting workflow.${NC}"
  exit 1
fi

echo ""
echo -e "${GREEN}✓ Backup completed successfully${NC}"
echo ""

# =============================================================================
# STEP 2: Figma-Make
# =============================================================================

echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}STEP 2: Figma-Make Regeneration${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""

echo -e "${YELLOW}Protected files are now backed up.${NC}"
echo ""
echo "You can now safely run your Figma-Make regeneration."
echo ""
echo "Options:"
echo "  1. Run Figma-Make automatically (if you have figma-make CLI)"
echo "  2. Pause here and run Figma-Make manually"
echo "  3. Skip (already ran Figma-Make)"
echo ""

read -p "Choose an option (1/2/3): " figma_option

case $figma_option in
  1)
    echo ""
    echo -e "${YELLOW}Running Figma-Make...${NC}"
    
    # Check if figma-make command exists
    if command -v figma-make &> /dev/null; then
      figma-make generate
      
      if [ $? -ne 0 ]; then
        echo -e "${RED}Figma-Make failed!${NC}"
        echo "You can still restore your protected files."
        read -p "Continue with restore? (y/n): " continue_restore
        
        if [ "$continue_restore" != "y" ]; then
          exit 1
        fi
      fi
    else
      echo -e "${RED}figma-make command not found!${NC}"
      echo "Please run Figma-Make manually, then press Enter to continue"
      read -p "Press Enter after running Figma-Make..."
    fi
    ;;
    
  2)
    echo ""
    echo -e "${YELLOW}Pausing for manual Figma-Make regeneration...${NC}"
    echo ""
    echo "Instructions:"
    echo "1. Open a new terminal window"
    echo "2. Run your Figma-Make command (e.g., 'figma-make generate')"
    echo "3. Wait for it to complete"
    echo "4. Return here and press Enter"
    echo ""
    read -p "Press Enter after Figma-Make is complete..."
    ;;
    
  3)
    echo ""
    echo -e "${YELLOW}Skipping Figma-Make step...${NC}"
    ;;
    
  *)
    echo -e "${RED}Invalid option. Exiting.${NC}"
    exit 1
    ;;
esac

echo ""
echo -e "${GREEN}✓ Figma-Make step completed${NC}"
echo ""

# =============================================================================
# STEP 3: Restore
# =============================================================================

echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}STEP 3: Restoring protected files${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""

./scripts/restore-protected.sh

if [ $? -ne 0 ]; then
  echo -e "${RED}Restore failed!${NC}"
  echo "Your backups are in: .protected-code/backups/"
  echo "You can restore manually if needed"
  exit 1
fi

echo ""
echo -e "${GREEN}✓ Restore completed successfully${NC}"
echo ""

# =============================================================================
# STEP 4: Verification
# =============================================================================

echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}STEP 4: Verification${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""

echo -e "${YELLOW}Checking critical files...${NC}"
echo ""

MISSING=0

check_file() {
  if [ -f "$1" ]; then
    echo -e "${GREEN}✓${NC} $1"
  else
    echo -e "${RED}✗${NC} $1 ${RED}(MISSING!)${NC}"
    MISSING=$((MISSING + 1))
  fi
}

check_file "src/hooks/useDatabricksFiles.ts"
check_file "src/hooks/useDatabricksAuth.ts"
check_file "src/utils/databricksAuth.ts"
check_file "src/utils/databricksClient.ts"
check_file "src/utils/safeFetch.ts"
check_file "api/databricks/auth.js"
check_file "api/databricks/files.js"
check_file "vercel.json"

echo ""

if [ $MISSING -eq 0 ]; then
  echo -e "${GREEN}✓ All critical files present!${NC}"
else
  echo -e "${RED}⚠ Warning: $MISSING file(s) missing!${NC}"
  echo "Please check the restore log and backups"
fi

# =============================================================================
# STEP 5: Next Steps
# =============================================================================

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}STEP 5: Next Steps${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""

echo "The workflow is complete! Here's what to do next:"
echo ""
echo "1. ${YELLOW}Start development server:${NC}"
echo "   npm run dev"
echo ""
echo "2. ${YELLOW}Test Databricks integration:${NC}"
echo "   - Open http://localhost:3000"
echo "   - Click 'Import from Databricks'"
echo "   - Sign in and browse files"
echo "   - Try importing a file"
echo ""
echo "3. ${YELLOW}If everything works:${NC}"
echo "   git add ."
echo "   git commit -m 'Update UI from Figma-Make'"
echo "   git push"
echo ""
echo "4. ${YELLOW}If something broke:${NC}"
echo "   ./scripts/restore-protected.sh"
echo "   # or restore specific backup:"
echo "   ls .protected-code/backups/"
echo "   ./scripts/restore-protected.sh TIMESTAMP"
echo ""

read -p "Start development server now? (y/n): " start_dev

if [ "$start_dev" = "y" ]; then
  echo ""
  echo -e "${YELLOW}Starting development server...${NC}"
  echo ""
  npm run dev
else
  echo ""
  echo -e "${GREEN}All done! Run 'npm run dev' when ready.${NC}"
  echo ""
fi

# =============================================================================
# Completion
# =============================================================================

echo -e "${GREEN}"
cat << "EOF"
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║          ✓ WORKFLOW COMPLETE!                              ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"
