#!/bin/bash

# Check if we have cached match data in DynamoDB

echo "========================================="
echo "Checking for Cached Match Data"
echo "========================================="
echo ""

# Check if AWS CLI is available
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI not found"
    echo "Please install AWS CLI or check your PATH"
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS credentials not configured"
    echo ""
    echo "Please export your AWS credentials:"
    echo "  export AWS_ACCESS_KEY_ID=\"...\""
    echo "  export AWS_SECRET_ACCESS_KEY=\"...\""
    echo "  export AWS_SESSION_TOKEN=\"...\""
    exit 1
fi

echo "✓ AWS credentials valid"
echo ""

# Query DynamoDB for cached matches
echo "Querying DynamoDB for cached matches..."
echo ""

aws dynamodb query \
  --table-name PulsePartyTable-v2 \
  --key-condition-expression "PK = :pk" \
  --expression-attribute-values '{":pk":{"S":"MATCH_CACHE"}}' \
  --output json > cached_matches.json

# Check if query was successful
if [ $? -ne 0 ]; then
    echo "❌ Failed to query DynamoDB"
    exit 1
fi

# Count matches
MATCH_COUNT=$(cat cached_matches.json | grep -o '"matchId"' | wc -l)

echo "========================================="
echo "Results"
echo "========================================="
echo ""
echo "Cached matches found: $MATCH_COUNT"
echo ""

if [ $MATCH_COUNT -gt 0 ]; then
    echo "✅ You have cached match data!"
    echo ""
    echo "Matches:"
    cat cached_matches.json | grep -A 1 '"homeTeam"' | grep '"S"' | sed 's/.*"S": "\(.*\)".*/  • \1/' | head -20
    echo ""
    echo "You can use this cached data without making new API calls!"
    echo ""
    echo "Next steps:"
    echo "1. Just disable the scheduled polling (already done)"
    echo "2. Deploy the changes"
    echo "3. The Match API will serve the cached data"
else
    echo "⚠️  No cached matches found"
    echo ""
    echo "This means the cache refresh never ran successfully."
    echo ""
    echo "Options:"
    echo "1. Wait until tomorrow when API quota resets"
    echo "2. Use demo matches (hardcoded in Match API)"
    echo "3. Upgrade API-Football plan"
fi

echo ""
echo "Full data saved to: cached_matches.json"
