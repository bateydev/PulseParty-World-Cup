#!/bin/bash

# Deploy PulseParty with Live Match Data Integration
# This script builds the backend and deploys to AWS with either simulator or live mode

set -e  # Exit on error

echo "========================================="
echo "PulseParty Live Data Deployment"
echo "========================================="
echo ""

# Check if we're in the right directory
if [ ! -d "backend" ] || [ ! -d "infrastructure" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Load .env file if it exists
if [ -f "infrastructure/.env" ]; then
    echo "Loading configuration from infrastructure/.env..."
    set -a  # Automatically export all variables
    source infrastructure/.env
    set +a
    echo "✓ Configuration loaded"
    echo ""
fi

# Ask user which mode to use
echo "Select deployment mode:"
echo "1) Simulator Mode (recommended for testing)"
echo "2) Live Mode (requires API-Football key)"
if [ -n "$API_FOOTBALL_KEY" ] && [ "$API_FOOTBALL_KEY" != "your-api-key-here" ]; then
    echo "3) Live Mode (use API key from .env file)"
fi
echo ""
read -p "Enter choice (1, 2$([ -n "$API_FOOTBALL_KEY" ] && [ "$API_FOOTBALL_KEY" != "your-api-key-here" ] && echo ", or 3")): " mode_choice

if [ "$mode_choice" = "1" ]; then
    MODE="simulator"
    export SIMULATOR_MODE=true
    export API_FOOTBALL_KEY=""
    echo "✓ Using Simulator Mode"
elif [ "$mode_choice" = "2" ]; then
    MODE="live"
    export SIMULATOR_MODE=false
    
    # Ask for API key
    read -p "Enter your API-Football key: " api_key
    if [ -z "$api_key" ]; then
        echo "❌ Error: API key is required for live mode"
        exit 1
    fi
    export API_FOOTBALL_KEY="$api_key"
    echo "✓ Using Live Mode with API-Football"
elif [ "$mode_choice" = "3" ] && [ -n "$API_FOOTBALL_KEY" ] && [ "$API_FOOTBALL_KEY" != "your-api-key-here" ]; then
    MODE="live"
    export SIMULATOR_MODE=false
    echo "✓ Using Live Mode with API key from .env file"
    echo "   API Key: ${API_FOOTBALL_KEY:0:10}..." # Show first 10 chars only
else
    echo "❌ Invalid choice"
    exit 1
fi

echo ""
echo "========================================="
echo "Step 1: Building Backend"
echo "========================================="
cd backend

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing backend dependencies..."
    npm install
fi

# Build TypeScript
echo "Compiling TypeScript..."
npm run build

if [ ! -d "dist" ]; then
    echo "❌ Error: Build failed - dist directory not found"
    exit 1
fi

echo "✓ Backend built successfully"
cd ..

echo ""
echo "========================================="
echo "Step 2: Deploying to AWS"
echo "========================================="
cd infrastructure

# Check AWS credentials (reload from .env if needed)
if [ -f ".env" ]; then
    set -a
    source .env
    set +a
fi

# Try to verify AWS credentials if aws CLI is available
if command -v aws &> /dev/null; then
    if aws sts get-caller-identity > /dev/null 2>&1; then
        echo "✓ AWS credentials verified"
        echo "AWS Account: $(aws sts get-caller-identity --query Account --output text)"
        echo "AWS Region: $(aws configure get region 2>/dev/null || echo ${AWS_REGION:-us-east-1})"
    else
        echo "⚠️  Warning: AWS credentials check failed"
        echo "If you have fresh credentials exported, deployment will continue..."
    fi
else
    echo "⚠️  AWS CLI not found in PATH, skipping credential check"
    echo "Make sure you have exported AWS credentials before running this script"
fi

# Check if credentials are set as environment variables
if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
    echo ""
    echo "❌ Error: AWS credentials not found"
    echo ""
    echo "Please export your AWS credentials:"
    echo "  export AWS_ACCESS_KEY_ID=\"...\""
    echo "  export AWS_SECRET_ACCESS_KEY=\"...\""
    echo "  export AWS_SESSION_TOKEN=\"...\""
    echo ""
    echo "Or update infrastructure/.env with fresh credentials"
    exit 1
fi

echo ""

# Deploy with CDK
echo "Deploying stack..."
npx cdk deploy --require-approval never

if [ $? -ne 0 ]; then
    echo "❌ Deployment failed"
    exit 1
fi

echo ""
echo "========================================="
echo "✅ Deployment Complete!"
echo "========================================="
echo ""
echo "Mode: $MODE"
echo ""

# Get outputs
WEBSOCKET_URL=$(aws cloudformation describe-stacks --stack-name PulsePartyStack --query "Stacks[0].Outputs[?OutputKey=='WebSocketApiEndpoint'].OutputValue" --output text)
INGESTION_FUNCTION=$(aws cloudformation describe-stacks --stack-name PulsePartyStack --query "Stacks[0].Outputs[?OutputKey=='IngestionFunctionArn'].OutputValue" --output text)

echo "WebSocket URL: $WEBSOCKET_URL"
echo "Ingestion Function: $INGESTION_FUNCTION"
echo ""

echo "========================================="
echo "Next Steps"
echo "========================================="
echo ""

if [ "$MODE" = "simulator" ]; then
    echo "1. Watch ingestion logs:"
    echo "   aws logs tail /aws/lambda/PulseParty-Ingestion --follow"
    echo ""
    echo "2. Test manually:"
    echo "   aws lambda invoke --function-name PulseParty-Ingestion --payload '{}' response.json && cat response.json"
    echo ""
    echo "3. Open frontend: http://localhost:3000"
    echo ""
    echo "4. Create a room and watch for simulated events!"
    echo ""
    echo "💡 To switch to live mode later:"
    echo "   aws lambda update-function-configuration \\"
    echo "     --function-name PulseParty-Ingestion \\"
    echo "     --environment \"Variables={TABLE_NAME=PulsePartyTable-v2,EVENT_BUS_NAME=PulsePartyEventBus,API_FOOTBALL_KEY=your-key,SIMULATOR_MODE=false}\""
else
    echo "1. Watch ingestion logs:"
    echo "   aws logs tail /aws/lambda/PulseParty-Ingestion --follow"
    echo ""
    echo "2. Test manually:"
    echo "   aws lambda invoke --function-name PulseParty-Ingestion --payload '{}' response.json && cat response.json"
    echo ""
    echo "3. Check for live matches at: https://www.api-football.com/"
    echo ""
    echo "4. Open frontend: http://localhost:3000"
    echo ""
    echo "5. Create a room for a live match and watch for real events!"
    echo ""
    echo "💡 API Quota: 100 requests/day (free tier)"
    echo "   Current polling: Every 30 seconds = ~2,880 requests/day"
    echo "   Consider adjusting schedule in infrastructure/lib/pulseparty-stack.ts"
fi

echo ""
echo "========================================="
echo "Documentation"
echo "========================================="
echo ""
echo "Quick Start: QUICK_START_LIVE_DATA.md"
echo "Full Guide: LIVE_MATCH_DATA_INTEGRATION.md"
echo ""

cd ..
