#!/bin/bash

# Verification script for PulseParty Rooms project setup

echo "🔍 Verifying PulseParty Rooms Project Setup..."
echo ""

# Check Node.js version
echo "📦 Checking Node.js version..."
node_version=$(node -v)
echo "   Node.js: $node_version"
if [[ ! "$node_version" =~ ^v(1[8-9]|[2-9][0-9]) ]]; then
    echo "   ⚠️  Warning: Node.js >= 18.0.0 is required"
fi
echo ""

# Check npm version
echo "📦 Checking npm version..."
npm_version=$(npm -v)
echo "   npm: $npm_version"
echo ""

# Check directory structure
echo "📁 Checking directory structure..."
directories=(
    "backend"
    "backend/src"
    "backend/src/types"
    "frontend"
    "frontend/src"
    "frontend/src/store"
    "frontend/src/test"
)

for dir in "${directories[@]}"; do
    if [ -d "$dir" ]; then
        echo "   ✅ $dir"
    else
        echo "   ❌ $dir (missing)"
    fi
done
echo ""

# Check configuration files
echo "📄 Checking configuration files..."
config_files=(
    "package.json"
    ".eslintrc.json"
    ".prettierrc.json"
    ".gitignore"
    "backend/package.json"
    "backend/tsconfig.json"
    "backend/jest.config.js"
    "frontend/package.json"
    "frontend/tsconfig.json"
    "frontend/vite.config.ts"
    "frontend/vitest.config.ts"
    "frontend/tailwind.config.js"
)

for file in "${config_files[@]}"; do
    if [ -f "$file" ]; then
        echo "   ✅ $file"
    else
        echo "   ❌ $file (missing)"
    fi
done
echo ""

# Check if dependencies are installed
echo "📦 Checking dependencies..."
if [ -d "node_modules" ]; then
    echo "   ✅ Root dependencies installed"
else
    echo "   ⚠️  Root dependencies not installed (run: npm install)"
fi

if [ -d "backend/node_modules" ]; then
    echo "   ✅ Backend dependencies installed"
else
    echo "   ⚠️  Backend dependencies not installed (run: npm run install:all)"
fi

if [ -d "frontend/node_modules" ]; then
    echo "   ✅ Frontend dependencies installed"
else
    echo "   ⚠️  Frontend dependencies not installed (run: npm run install:all)"
fi
echo ""

echo "✨ Setup verification complete!"
echo ""
echo "Next steps:"
echo "1. Run: npm run install:all"
echo "2. Run: cd frontend && npm run dev"
echo "3. Run: cd backend && npm run build"
