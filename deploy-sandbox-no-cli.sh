#!/bin/bash

# PulseParty AWS Sandbox Deployment (No AWS CLI Required)
# This script works with AWS sandbox credentials set as environment variables

set -e

echo "🚀 PulseParty AWS Sandbox Deployment (CDK Only)"
echo "================================================"
echo ""

# Check if AWS credentials are set as environment variables
if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
    echo "❌ AWS credentials not found in environment variables"
    echo ""
    echo "For AWS Sandbox, you need to export credentials:"
    echo ""
    echo "1. Go to your AWS Sandbox portal"
    echo "2. Copy the AWS credentials"
    echo "3. Paste them in your terminal (they look like):"
    echo ""
    echo "   export AWS_ACCESS_KEY_ID=ASIA..."
    echo "   export AWS_SECRET_ACCESS_KEY=..."
    echo "   export AWS_SESSION_TOKEN=..."
    echo "   export AWS_DEFAULT_REGION=us-east-1"
    echo ""
    echo "4. Then run this script again"
    echo ""
    exit 1
fi

echo "✓ AWS credentials found in environment"
echo "  Region: ${AWS_DEFAULT_REGION:-us-east-1}"
echo ""

# Navigate to infrastructure directory
cd infrastructure

# Install dependencies
echo "📦 Installing dependencies..."
npm install --silent

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build

# Check if CDK is bootstrapped (will fail gracefully if not)
echo ""
echo "🔍 Checking CDK bootstrap status..."
if ! npx cdk bootstrap 2>&1 | grep -q "already bootstrapped"; then
    echo "🚀 Bootstrapping CDK..."
    npx cdk bootstrap
    echo "✓ CDK bootstrapped successfully"
else
    echo "✓ CDK is already bootstrapped"
fi

# Synthesize CloudFormation template
echo ""
echo "📝 Synthesizing CloudFormation template..."
npx cdk synth > /dev/null

# Show what will be deployed
echo ""
echo "📋 Preview of changes:"
npx cdk diff || true

# Confirm deployment
echo ""
echo "⚠️  This will deploy resources to your AWS sandbox account"
echo "Resources to be created:"
echo "  - DynamoDB Table (PulsePartyTable)"
echo "  - EventBridge Event Bus"
echo "  - API Gateway WebSocket API"
echo "  - 6 Lambda Functions"
echo "  - Cognito User Pool"
echo "  - IAM Roles and Policies"
echo ""
read -p "Do you want to proceed with deployment? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    exit 0
fi

# Deploy
echo ""
echo "🚀 Deploying to AWS..."
echo "This may take 5-10 minutes..."
echo ""

npx cdk deploy --require-approval never

# Check deployment status
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Deployment successful!"
    echo ""
    echo "📊 Stack Outputs:"
    npx cdk deploy --outputs-file ../cdk-outputs.json --require-approval never 2>/dev/null || true
    
    if [ -f ../cdk-outputs.json ]; then
        cat ../cdk-outputs.json
        echo ""
        echo "Outputs saved to: cdk-outputs.json"
    fi
    
    echo ""
    echo "🎉 Next Steps:"
    echo "1. Check cdk-outputs.json for WebSocket URL and other outputs"
    echo "2. Update frontend/.env.local with the WebSocket URL"
    echo "3. Run 'cd frontend && npm run dev' to test locally"
    echo ""
else
    echo ""
    echo "❌ Deployment failed"
    echo "Check the error messages above for details"
    exit 1
fi
