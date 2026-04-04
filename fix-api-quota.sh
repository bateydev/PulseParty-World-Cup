#!/bin/bash

# Fix API Quota Issue
# This script disables all API-Football polling and switches to simulator mode

set -e

echo "========================================="
echo "Fixing API Quota Issue"
echo "========================================="
echo ""
echo "Changes being applied:"
echo "✓ Disable Ingestion schedule (no more event polling)"
echo "✓ Disable Match Cache Refresh schedule"
echo "✓ Switch Ingestion Lambda to simulator mode"
echo "✓ Match API will return demo matches"
echo ""
echo "Result: 0 API calls/day (was 1,536/day)"
echo ""

# Check if we're in the right directory
if [ ! -d "backend" ] || [ ! -d "infrastructure" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Build backend
echo "Step 1: Building backend..."
cd backend
npm run build
cd ..
echo "✓ Backend built"
echo ""

# Deploy
echo "Step 2: Deploying to AWS..."
echo "Make sure you have AWS credentials set!"
echo ""

cd infrastructure

# Check AWS credentials
if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
    echo "⚠️  AWS credentials not found in environment"
    echo ""
    echo "Please export your AWS credentials first:"
    echo "  export AWS_ACCESS_KEY_ID=\"...\""
    echo "  export AWS_SECRET_ACCESS_KEY=\"...\""
    echo "  export AWS_SESSION_TOKEN=\"...\""
    echo ""
    read -p "Press Enter once you've set credentials, or Ctrl+C to cancel..."
fi

npx cdk deploy --require-approval never

echo ""
echo "========================================="
echo "✅ Fix Applied Successfully!"
echo "========================================="
echo ""
echo "What changed:"
echo "• Ingestion schedule: DISABLED (was running every 1 minute)"
echo "• Match cache refresh: DISABLED (was running every 15 minutes)"
echo "• Ingestion mode: SIMULATOR (uses pre-recorded events)"
echo "• Match API: Returns demo matches"
echo ""
echo "API calls per day: 0 (was 1,536)"
echo ""
echo "Your app will now:"
echo "• Show demo matches in the frontend"
echo "• Generate simulated match events"
echo "• Work perfectly for development/testing"
echo "• Cost $0 for API calls"
echo ""
echo "To enable live mode later (when you have more quota):"
echo "1. Edit infrastructure/lib/pulseparty-stack.ts"
echo "2. Set enabled: true for the schedules"
echo "3. Set SIMULATOR_MODE: 'false'"
echo "4. Add your API key"
echo "5. Redeploy"
echo ""

cd ..
