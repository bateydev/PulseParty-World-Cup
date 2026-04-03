#!/bin/bash

# PulseParty AWS Sandbox Deployment Script
# This script helps deploy the infrastructure to AWS

set -e

echo "🚀 PulseParty AWS Sandbox Deployment"
echo "===================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI is not installed${NC}"
    echo ""
    echo "Please install AWS CLI first:"
    echo "  Linux: curl 'https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip' -o 'awscliv2.zip' && unzip awscliv2.zip && sudo ./aws/install"
    echo "  macOS: brew install awscli"
    echo ""
    echo "Then configure your credentials:"
    echo "  aws configure"
    echo ""
    exit 1
fi

echo -e "${GREEN}✓ AWS CLI is installed${NC}"

# Check if AWS credentials are configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}❌ AWS credentials are not configured${NC}"
    echo ""
    echo "Please configure your AWS credentials:"
    echo "  aws configure"
    echo ""
    echo "Or set environment variables:"
    echo "  export AWS_ACCESS_KEY_ID=your-access-key"
    echo "  export AWS_SECRET_ACCESS_KEY=your-secret-key"
    echo "  export AWS_DEFAULT_REGION=us-east-1"
    echo ""
    exit 1
fi

echo -e "${GREEN}✓ AWS credentials are configured${NC}"

# Get AWS account info
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION=$(aws configure get region || echo "us-east-1")

echo ""
echo "AWS Account: $ACCOUNT_ID"
echo "Region: $REGION"
echo ""

# Navigate to infrastructure directory
cd infrastructure

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build

# Check if CDK is bootstrapped
echo ""
echo "🔍 Checking CDK bootstrap status..."
if ! aws cloudformation describe-stacks --stack-name CDKToolkit --region $REGION &> /dev/null; then
    echo -e "${YELLOW}⚠️  CDK is not bootstrapped in this account/region${NC}"
    echo ""
    read -p "Do you want to bootstrap CDK now? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🚀 Bootstrapping CDK..."
        npx cdk bootstrap aws://$ACCOUNT_ID/$REGION
        echo -e "${GREEN}✓ CDK bootstrapped successfully${NC}"
    else
        echo -e "${RED}❌ CDK bootstrap is required. Exiting.${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ CDK is already bootstrapped${NC}"
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
echo -e "${YELLOW}⚠️  This will deploy resources to your AWS account${NC}"
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
    echo -e "${GREEN}✅ Deployment successful!${NC}"
    echo ""
    echo "📊 Stack Outputs:"
    aws cloudformation describe-stacks \
        --stack-name PulsePartyStack \
        --query 'Stacks[0].Outputs' \
        --output table
    
    echo ""
    echo "🎉 Next Steps:"
    echo "1. Copy the WebSocket URL from the outputs above"
    echo "2. Update frontend/.env.local with the WebSocket URL"
    echo "3. Run 'cd frontend && npm run dev' to test locally"
    echo ""
    echo "📖 See DEPLOYMENT_SANDBOX.md for more details"
else
    echo ""
    echo -e "${RED}❌ Deployment failed${NC}"
    echo "Check the error messages above for details"
    exit 1
fi
