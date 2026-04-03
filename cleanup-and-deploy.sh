#!/bin/bash

# Cleanup script for AWS sandbox deployment issues

echo "🧹 Cleaning up existing resources..."
echo ""

# Check if table exists and delete it
echo "Checking for existing DynamoDB table..."
if aws dynamodb describe-table --table-name PulsePartyTable 2>/dev/null; then
    echo "Found PulsePartyTable, deleting..."
    aws dynamodb delete-table --table-name PulsePartyTable
    echo "Waiting for table deletion..."
    aws dynamodb wait table-not-exists --table-name PulsePartyTable
    echo "✓ Table deleted"
else
    echo "✓ No existing table found"
fi

echo ""
echo "🚀 Deploying stack..."
cd infrastructure
npx cdk deploy --require-approval never

echo ""
echo "✅ Deployment complete!"
