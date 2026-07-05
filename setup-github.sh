#!/bin/bash
# SensorModel — GitHub Push Script
# Handles the [...nextauth] catch-all directory correctly

set -e

echo "SensorModel — GitHub setup"
echo ""

# 1. Init git if needed
if [ ! -d ".git" ]; then
  git init
  echo "Git repo initialised"
fi

# 2. Set remote
echo ""
read -p "Enter your GitHub repo URL (e.g. https://github.com/org/sensormodel): " REPO_URL
git remote remove origin 2>/dev/null || true
git remote add origin "$REPO_URL"

# 3. Stage everything — git handles [...nextauth] brackets fine natively
git add .
git status

echo ""
echo "Files staged. Review above, then run:"
echo "  git commit -m 'Initial SensorModel deployment'"
echo "  git push -u origin main"
echo ""
echo "IMPORTANT: Rename src/app/api/auth/nextauth/ -> src/app/api/auth/[...nextauth]/ before running."
echo "Git handles bracket names natively — do NOT rename this folder."
