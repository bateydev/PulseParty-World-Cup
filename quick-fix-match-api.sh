#!/bin/bash

# Quick fix for Match API URL issue
# This script updates frontend/.env.local with the correct Match API URL

echo "========================================="
echo "Quick Fix: Match API URL"
echo "========================================="
echo ""

echo "The issue: frontend/.env.local has a placeholder URL"
echo "Current: https://your-api-id.execute-api.us-east-1.amazonaws.com/prod/matches"
echo ""

# Try to get the real URL from AWS
echo "Attempting to fetch real Match API URL from AWS..."
echo ""

MATCH_API_URL=$(aws cloudformation describe-stacks \
  --stack-name PulsePartyStack \
  --query "Stacks[0].Outputs[?OutputKey=='MatchApiUrl'].OutputValue" \
  --output text 2>/dev/null)

if [ $? -eq 0 ] && [ -n "$MATCH_API_URL" ] && [ "$MATCH_API_URL" != "None" ]; then
    echo "✅ Found Match API URL: $MATCH_API_URL"
    echo ""
    
    # Update frontend/.env.local
    sed -i.bak "s|VITE_MATCH_API_URL=.*|VITE_MATCH_API_URL=$MATCH_API_URL|" frontend/.env.local
    
    echo "✅ Updated frontend/.env.local"
    echo ""
    echo "New configuration:"
    cat frontend/.env.local
    echo ""
    echo "========================================="
    echo "Next Steps"
    echo "========================================="
    echo ""
    echo "1. Restart your frontend dev server:"
    echo "   cd frontend"
    echo "   npm run dev"
    echo ""
    echo "2. Refresh your browser"
    echo ""
    echo "3. The frontend should now fetch matches from the correct URL"
    echo ""
    
    # Test the API
    echo "========================================="
    echo "Testing Match API"
    echo "========================================="
    echo ""
    echo "Fetching from: $MATCH_API_URL"
    echo ""
    
    RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "$MATCH_API_URL")
    HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
    BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')
    
    if [ "$HTTP_STATUS" = "200" ]; then
        echo "✅ API is responding (HTTP 200)"
        echo ""
        echo "Response preview:"
        echo "$BODY" | head -20
        echo ""
        
        # Check if we have matches
        if echo "$BODY" | grep -q '"Country"'; then
            COUNTRY_COUNT=$(echo "$BODY" | grep -o '"matchId"' | wc -l)
            if [ "$COUNTRY_COUNT" -gt 0 ]; then
                echo "✅ Found $COUNTRY_COUNT cached matches!"
            else
                echo "⚠️  No matches in cache (empty arrays)"
                echo "   The API will return demo matches as fallback"
            fi
        fi
    else
        echo "⚠️  API returned HTTP $HTTP_STATUS"
        echo ""
        echo "Response:"
        echo "$BODY"
    fi
    
else
    echo "❌ Could not fetch Match API URL from AWS"
    echo ""
    echo "This could mean:"
    echo "1. AWS CLI is not installed or not in PATH"
    echo "2. AWS credentials are not configured"
    echo "3. The stack hasn't been deployed yet"
    echo ""
    echo "========================================="
    echo "Manual Fix"
    echo "========================================="
    echo ""
    echo "You need to find the HTTP API Gateway ID manually:"
    echo ""
    echo "Option 1: Check AWS Console"
    echo "  1. Go to AWS Console → API Gateway"
    echo "  2. Find 'PulsePartyHttpApi'"
    echo "  3. Copy the API ID (e.g., abc123xyz)"
    echo "  4. Update frontend/.env.local:"
    echo "     VITE_MATCH_API_URL=https://abc123xyz.execute-api.us-east-1.amazonaws.com/prod/matches"
    echo ""
    echo "Option 2: Check CloudFormation Outputs"
    echo "  1. Go to AWS Console → CloudFormation"
    echo "  2. Select 'PulsePartyStack'"
    echo "  3. Go to 'Outputs' tab"
    echo "  4. Find 'MatchApiUrl' and copy the value"
    echo "  5. Update frontend/.env.local with that value"
    echo ""
    echo "Option 3: Redeploy and capture outputs"
    echo "  cd infrastructure"
    echo "  npx cdk deploy --outputs-file outputs.json"
    echo "  cat outputs.json | grep MatchApiUrl"
    echo ""
fi

echo ""
echo "========================================="
echo "Additional Info"
echo "========================================="
echo ""
echo "Note: The HTTP API Gateway has a DIFFERENT ID than the WebSocket API"
echo "  WebSocket API: fpdd170hf8 (already correct in .env.local)"
echo "  HTTP API:      ??? (this is what we need to find)"
echo ""
echo "See MATCH_API_TROUBLESHOOTING.md for more details"
echo ""
