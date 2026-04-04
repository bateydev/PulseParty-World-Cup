#!/bin/bash

# Get API URLs from deployed CloudFormation stack
# This script helps you update frontend/.env.local with the correct API URLs

echo "========================================="
echo "Getting API URLs from AWS"
echo "========================================="
echo ""

# Check if jq is available (optional, for better JSON parsing)
HAS_JQ=false
if command -v jq &> /dev/null; then
    HAS_JQ=true
fi

# Get stack outputs
echo "Fetching CloudFormation stack outputs..."
echo ""

if [ "$HAS_JQ" = true ]; then
    # Use jq for clean output
    OUTPUTS=$(aws cloudformation describe-stacks --stack-name PulsePartyStack --query 'Stacks[0].Outputs' --output json 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        echo "✅ Stack outputs retrieved successfully!"
        echo ""
        echo "========================================="
        echo "API URLs"
        echo "========================================="
        echo ""
        
        WEBSOCKET_URL=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="WebSocketApiEndpoint") | .OutputValue')
        HTTP_API_URL=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="HttpApiEndpoint") | .OutputValue')
        MATCH_API_URL=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="MatchApiUrl") | .OutputValue')
        USER_POOL_ID=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="UserPoolId") | .OutputValue')
        CLIENT_ID=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="UserPoolClientId") | .OutputValue')
        IDENTITY_POOL_ID=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="IdentityPoolId") | .OutputValue')
        
        echo "WebSocket URL:    $WEBSOCKET_URL"
        echo "HTTP API URL:     $HTTP_API_URL"
        echo "Match API URL:    $MATCH_API_URL"
        echo "User Pool ID:     $USER_POOL_ID"
        echo "Client ID:        $CLIENT_ID"
        echo "Identity Pool ID: $IDENTITY_POOL_ID"
        echo ""
        
        # Update frontend/.env.local
        echo "========================================="
        echo "Updating frontend/.env.local"
        echo "========================================="
        echo ""
        
        cat > frontend/.env.local << EOF
VITE_WEBSOCKET_URL=$WEBSOCKET_URL
VITE_API_URL=$HTTP_API_URL
VITE_MATCH_API_URL=$MATCH_API_URL
VITE_USER_POOL_ID=$USER_POOL_ID
VITE_USER_POOL_CLIENT_ID=$CLIENT_ID
VITE_IDENTITY_POOL_ID=$IDENTITY_POOL_ID
VITE_REGION=us-east-1
EOF
        
        echo "✅ frontend/.env.local updated!"
        echo ""
        echo "Next steps:"
        echo "1. Restart your frontend dev server (npm run dev)"
        echo "2. The frontend will now fetch from the correct Match API URL"
        echo ""
    else
        echo "❌ Failed to get stack outputs"
        echo ""
        echo "Make sure:"
        echo "1. AWS credentials are configured"
        echo "2. The stack 'PulsePartyStack' is deployed"
        echo ""
        exit 1
    fi
else
    # Fallback without jq
    echo "⚠️  jq not found, using basic parsing"
    echo ""
    
    WEBSOCKET_URL=$(aws cloudformation describe-stacks --stack-name PulsePartyStack --query "Stacks[0].Outputs[?OutputKey=='WebSocketApiEndpoint'].OutputValue" --output text 2>/dev/null)
    MATCH_API_URL=$(aws cloudformation describe-stacks --stack-name PulsePartyStack --query "Stacks[0].Outputs[?OutputKey=='MatchApiUrl'].OutputValue" --output text 2>/dev/null)
    HTTP_API_URL=$(aws cloudformation describe-stacks --stack-name PulsePartyStack --query "Stacks[0].Outputs[?OutputKey=='HttpApiEndpoint'].OutputValue" --output text 2>/dev/null)
    USER_POOL_ID=$(aws cloudformation describe-stacks --stack-name PulsePartyStack --query "Stacks[0].Outputs[?OutputKey=='UserPoolId'].OutputValue" --output text 2>/dev/null)
    CLIENT_ID=$(aws cloudformation describe-stacks --stack-name PulsePartyStack --query "Stacks[0].Outputs[?OutputKey=='UserPoolClientId'].OutputValue" --output text 2>/dev/null)
    IDENTITY_POOL_ID=$(aws cloudformation describe-stacks --stack-name PulsePartyStack --query "Stacks[0].Outputs[?OutputKey=='IdentityPoolId'].OutputValue" --output text 2>/dev/null)
    
    if [ -n "$MATCH_API_URL" ]; then
        echo "✅ Stack outputs retrieved!"
        echo ""
        echo "WebSocket URL:    $WEBSOCKET_URL"
        echo "HTTP API URL:     $HTTP_API_URL"
        echo "Match API URL:    $MATCH_API_URL"
        echo "User Pool ID:     $USER_POOL_ID"
        echo "Client ID:        $CLIENT_ID"
        echo "Identity Pool ID: $IDENTITY_POOL_ID"
        echo ""
        
        # Update frontend/.env.local
        cat > frontend/.env.local << EOF
VITE_WEBSOCKET_URL=$WEBSOCKET_URL
VITE_API_URL=$HTTP_API_URL
VITE_MATCH_API_URL=$MATCH_API_URL
VITE_USER_POOL_ID=$USER_POOL_ID
VITE_USER_POOL_CLIENT_ID=$CLIENT_ID
VITE_IDENTITY_POOL_ID=$IDENTITY_POOL_ID
VITE_REGION=us-east-1
EOF
        
        echo "✅ frontend/.env.local updated!"
        echo ""
        echo "Next steps:"
        echo "1. Restart your frontend dev server (npm run dev)"
        echo "2. The frontend will now fetch from the correct Match API URL"
        echo ""
    else
        echo "❌ Failed to get stack outputs"
        echo ""
        echo "Make sure:"
        echo "1. AWS credentials are configured"
        echo "2. The stack 'PulsePartyStack' is deployed"
        echo ""
        exit 1
    fi
fi

echo "========================================="
echo "Testing Match API"
echo "========================================="
echo ""

if [ -n "$MATCH_API_URL" ]; then
    echo "Fetching matches from: $MATCH_API_URL"
    echo ""
    
    curl -s "$MATCH_API_URL" | head -20
    echo ""
    echo ""
    echo "If you see match data above, the API is working! 🎉"
else
    echo "⚠️  Match API URL not found, skipping test"
fi
