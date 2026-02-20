#!/bin/bash

# =============================================================================
# Databricks Integration - Restore Script
# 
# This script restores critical Databricks integration files after
# Figma-Make regeneration has potentially overwritten them.
# 
# Usage: ./scripts/restore-protected.sh [backup_timestamp]
# If no timestamp provided, restores from latest backup
# =============================================================================

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Databricks Integration Restore${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Determine which backup to restore from
BACKUP_DIR=".protected-code"

if [ -n "$1" ]; then
  # Restore from specific timestamp
  RESTORE_FROM="$BACKUP_DIR/backups/$1"
  echo -e "${BLUE}Restoring from backup: $1${NC}"
else
  # Restore from latest/current
  if [ -d "$BACKUP_DIR/current" ]; then
    RESTORE_FROM="$BACKUP_DIR/current"
    echo -e "${BLUE}Restoring from latest backup${NC}"
  else
    echo -e "${RED}Error: No backup found!${NC}"
    echo ""
    echo "Please run ./scripts/backup-protected.sh first"
    exit 1
  fi
fi

# Check if backup exists
if [ ! -d "$RESTORE_FROM" ]; then
  echo -e "${RED}Error: Backup directory not found: $RESTORE_FROM${NC}"
  echo ""
  echo "Available backups:"
  ls -1 "$BACKUP_DIR/backups" 2>/dev/null || echo "  (none)"
  exit 1
fi

echo ""
echo -e "${YELLOW}Restore source: $RESTORE_FROM${NC}"
echo ""

# Track what was restored
RESTORE_LOG="restore_$(date +%Y%m%d_%H%M%S).log"
echo "Databricks Integration Restore - $(date)" > "$RESTORE_LOG"
echo "Source: $RESTORE_FROM" >> "$RESTORE_LOG"
echo "==========================================" >> "$RESTORE_LOG"
echo "" >> "$RESTORE_LOG"

# Function to restore a file
restore_file() {
  local source=$1
  local dest=$2
  
  if [ -f "$source" ]; then
    # Create directory if it doesn't exist
    mkdir -p "$(dirname "$dest")"
    cp "$source" "$dest"
    echo -e "${GREEN}✓${NC} Restored: $dest"
    echo "✓ $dest" >> "$RESTORE_LOG"
    return 0
  else
    echo -e "${YELLOW}⚠${NC} Source not found: $source (skipping)"
    echo "⚠ NOT FOUND IN BACKUP: $source" >> "$RESTORE_LOG"
    return 1
  fi
}

# Function to restore a directory
restore_dir() {
  local source=$1
  local dest=$2
  
  if [ -d "$source" ]; then
    # Create parent directory if it doesn't exist
    mkdir -p "$(dirname "$dest")"
    # Remove existing directory if it exists
    rm -rf "$dest"
    cp -r "$source" "$dest"
    echo -e "${GREEN}✓${NC} Restored directory: $dest"
    echo "✓ DIRECTORY: $dest" >> "$RESTORE_LOG"
    return 0
  else
    echo -e "${YELLOW}⚠${NC} Source directory not found: $source (skipping)"
    echo "⚠ DIRECTORY NOT FOUND IN BACKUP: $source" >> "$RESTORE_LOG"
    return 1
  fi
}

echo -e "${YELLOW}Restoring core utility files...${NC}"
restore_file "$RESTORE_FROM/src/utils/databricksAuth.ts" "src/utils/databricksAuth.ts"
restore_file "$RESTORE_FROM/src/utils/databricksClient.ts" "src/utils/databricksClient.ts"
restore_file "$RESTORE_FROM/src/utils/safeFetch.ts" "src/utils/safeFetch.ts"

echo ""
echo -e "${YELLOW}Restoring custom hooks...${NC}"
restore_file "$RESTORE_FROM/src/hooks/useDatabricksFiles.ts" "src/hooks/useDatabricksFiles.ts"
restore_file "$RESTORE_FROM/src/hooks/useDatabricksAuth.ts" "src/hooks/useDatabricksAuth.ts"

echo ""
echo -e "${YELLOW}Restoring API routes...${NC}"
restore_dir "$RESTORE_FROM/api/databricks" "api/databricks"

echo ""
echo -e "${YELLOW}Restoring configuration files...${NC}"
restore_file "$RESTORE_FROM/config/vercel.json" "vercel.json"
restore_file "$RESTORE_FROM/config/.env.example" ".env.example"
restore_file "$RESTORE_FROM/config/.figma-make-ignore" ".figma-make-ignore"

echo "" >> "$RESTORE_LOG"
echo "Restore completed at: $(date)" >> "$RESTORE_LOG"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ Restore Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Restore log: $RESTORE_LOG"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Verify files were restored correctly"
echo "2. Run: npm run dev"
echo "3. Test Databricks integration thoroughly"
echo "4. If issues occur, check the restore log above"
echo ""

# Check if .env exists
if [ ! -f ".env" ]; then
  echo -e "${YELLOW}⚠ Warning: .env file not found${NC}"
  echo "Remember to create .env from .env.example with your credentials"
  echo ""
fi

# Quick verification
echo -e "${YELLOW}Quick verification:${NC}"
MISSING_FILES=0

check_file() {
  if [ -f "$1" ]; then
    echo -e "${GREEN}✓${NC} $1"
  else
    echo -e "${RED}✗${NC} $1 ${RED}(MISSING)${NC}"
    MISSING_FILES=$((MISSING_FILES + 1))
  fi
}

check_file "src/utils/databricksAuth.ts"
check_file "src/utils/databricksClient.ts"
check_file "api/databricks/auth.js"
check_file "api/databricks/files.js"
check_file "vercel.json"

echo ""
if [ $MISSING_FILES -eq 0 ]; then
  echo -e "${GREEN}All critical files present!${NC}"
else
  echo -e "${RED}Warning: $MISSING_FILES critical file(s) missing${NC}"
  echo "Please check the restore log and backup source"
fi
echo ""
