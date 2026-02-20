#!/bin/bash

# =============================================================================
# Databricks Integration - Backup Script
# 
# This script backs up all critical Databricks integration files before
# running Figma-Make regeneration to prevent accidental overwrites.
# 
# Usage: ./scripts/backup-protected.sh
# =============================================================================

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Databricks Integration Backup${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Create backup directory with timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=".protected-code"
TIMESTAMPED_BACKUP="$BACKUP_DIR/backups/$TIMESTAMP"

echo -e "${YELLOW}Creating backup directory...${NC}"
mkdir -p "$TIMESTAMPED_BACKUP/src/utils"
mkdir -p "$TIMESTAMPED_BACKUP/src/hooks"
mkdir -p "$TIMESTAMPED_BACKUP/api"
mkdir -p "$TIMESTAMPED_BACKUP/config"

# Track what was backed up
BACKUP_LOG="$TIMESTAMPED_BACKUP/backup.log"
echo "Databricks Integration Backup - $TIMESTAMP" > "$BACKUP_LOG"
echo "==========================================" >> "$BACKUP_LOG"
echo "" >> "$BACKUP_LOG"

# Function to backup a file
backup_file() {
  local source=$1
  local dest=$2
  
  if [ -f "$source" ]; then
    cp "$source" "$dest"
    echo -e "${GREEN}✓${NC} Backed up: $source"
    echo "✓ $source" >> "$BACKUP_LOG"
    return 0
  else
    echo -e "${YELLOW}⚠${NC} Not found: $source (skipping)"
    echo "⚠ NOT FOUND: $source" >> "$BACKUP_LOG"
    return 1
  fi
}

# Function to backup a directory
backup_dir() {
  local source=$1
  local dest=$2
  
  if [ -d "$source" ]; then
    cp -r "$source" "$dest"
    echo -e "${GREEN}✓${NC} Backed up directory: $source"
    echo "✓ DIRECTORY: $source" >> "$BACKUP_LOG"
    return 0
  else
    echo -e "${YELLOW}⚠${NC} Directory not found: $source (skipping)"
    echo "⚠ DIRECTORY NOT FOUND: $source" >> "$BACKUP_LOG"
    return 1
  fi
}

echo ""
echo -e "${YELLOW}Backing up core utility files...${NC}"
backup_file "src/utils/databricksAuth.ts" "$TIMESTAMPED_BACKUP/src/utils/databricksAuth.ts"
backup_file "src/utils/databricksClient.ts" "$TIMESTAMPED_BACKUP/src/utils/databricksClient.ts"
backup_file "src/utils/safeFetch.ts" "$TIMESTAMPED_BACKUP/src/utils/safeFetch.ts"

echo ""
echo -e "${YELLOW}Backing up custom hooks...${NC}"
backup_file "src/hooks/useDatabricksFiles.ts" "$TIMESTAMPED_BACKUP/src/hooks/useDatabricksFiles.ts"
backup_file "src/hooks/useDatabricksAuth.ts" "$TIMESTAMPED_BACKUP/src/hooks/useDatabricksAuth.ts"

echo ""
echo -e "${YELLOW}Backing up API routes...${NC}"
backup_dir "api/databricks" "$TIMESTAMPED_BACKUP/api/databricks"

echo ""
echo -e "${YELLOW}Backing up configuration files...${NC}"
backup_file "vercel.json" "$TIMESTAMPED_BACKUP/config/vercel.json"
backup_file ".env.example" "$TIMESTAMPED_BACKUP/config/.env.example"
backup_file ".figma-make-ignore" "$TIMESTAMPED_BACKUP/config/.figma-make-ignore"

# Create a "latest" symlink for easy restore
echo ""
echo -e "${YELLOW}Creating 'latest' backup reference...${NC}"
rm -f "$BACKUP_DIR/latest"
ln -s "backups/$TIMESTAMP" "$BACKUP_DIR/latest"
echo -e "${GREEN}✓${NC} Latest backup linked"

# Also copy to a non-timestamped location for restore script
echo ""
echo -e "${YELLOW}Creating restore-ready backup...${NC}"
rm -rf "$BACKUP_DIR/current"
cp -r "$TIMESTAMPED_BACKUP" "$BACKUP_DIR/current"

echo "" >> "$BACKUP_LOG"
echo "Backup completed at: $(date)" >> "$BACKUP_LOG"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ Backup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Backup location: $TIMESTAMPED_BACKUP"
echo "Log file: $BACKUP_LOG"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Run Figma-Make to regenerate UI components"
echo "2. Run ./scripts/restore-protected.sh to restore integration files"
echo "3. Test that Databricks integration still works"
echo ""

# Keep only last 10 backups to save space
echo -e "${YELLOW}Cleaning up old backups (keeping last 10)...${NC}"
cd "$BACKUP_DIR/backups" 2>/dev/null && ls -t | tail -n +11 | xargs -r rm -rf
cd - > /dev/null 2>&1

echo -e "${GREEN}✓ Cleanup complete${NC}"
echo ""
