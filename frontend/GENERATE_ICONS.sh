#!/bin/bash

# PWA Icon Generation Script
# 
# This script generates PNG icons from the SVG source for the PulseParty PWA.
# 
# Requirements:
#   - ImageMagick (convert command)
#   - OR Inkscape
# 
# Installation:
#   macOS:   brew install imagemagick
#   Ubuntu:  sudo apt-get install imagemagick
#   Windows: Download from https://imagemagick.org/

set -e

echo "PulseParty PWA Icon Generator"
echo "=============================="
echo ""

# Check if we're in the frontend directory
if [ ! -f "public/pwa-icon.svg" ]; then
    echo "Error: public/pwa-icon.svg not found"
    echo "Please run this script from the frontend directory"
    exit 1
fi

# Check if ImageMagick is installed
if command -v convert &> /dev/null; then
    echo "Using ImageMagick to generate icons..."
    echo ""
    
    cd public
    
    echo "Generating pwa-192x192.png..."
    convert -background none pwa-icon.svg -resize 192x192 pwa-192x192.png
    
    echo "Generating pwa-512x512.png..."
    convert -background none pwa-icon.svg -resize 512x512 pwa-512x512.png
    
    echo "Generating apple-touch-icon.png..."
    convert -background none pwa-icon.svg -resize 180x180 apple-touch-icon.png
    
    echo "Generating favicon.ico..."
    convert -background none pwa-icon.svg -resize 32x32 favicon.ico
    
    cd ..
    
    echo ""
    echo "✓ All icons generated successfully!"
    echo ""
    echo "Generated files:"
    ls -lh public/*.png public/*.ico 2>/dev/null || true
    
elif command -v inkscape &> /dev/null; then
    echo "Using Inkscape to generate icons..."
    echo ""
    
    cd public
    
    echo "Generating pwa-192x192.png..."
    inkscape pwa-icon.svg --export-filename=pwa-192x192.png --export-width=192 --export-height=192
    
    echo "Generating pwa-512x512.png..."
    inkscape pwa-icon.svg --export-filename=pwa-512x512.png --export-width=512 --export-height=512
    
    echo "Generating apple-touch-icon.png..."
    inkscape pwa-icon.svg --export-filename=apple-touch-icon.png --export-width=180 --export-height=180
    
    echo "Generating favicon.ico..."
    inkscape pwa-icon.svg --export-filename=favicon.png --export-width=32 --export-height=32
    convert favicon.png favicon.ico
    rm favicon.png
    
    cd ..
    
    echo ""
    echo "✓ All icons generated successfully!"
    echo ""
    echo "Generated files:"
    ls -lh public/*.png public/*.ico 2>/dev/null || true
    
else
    echo "Error: Neither ImageMagick nor Inkscape is installed"
    echo ""
    echo "Please install one of the following:"
    echo ""
    echo "ImageMagick:"
    echo "  macOS:   brew install imagemagick"
    echo "  Ubuntu:  sudo apt-get install imagemagick"
    echo "  Windows: https://imagemagick.org/"
    echo ""
    echo "Inkscape:"
    echo "  macOS:   brew install inkscape"
    echo "  Ubuntu:  sudo apt-get install inkscape"
    echo "  Windows: https://inkscape.org/"
    echo ""
    echo "Alternatively, use an online tool:"
    echo "  https://realfavicongenerator.net/"
    exit 1
fi

echo ""
echo "Next steps:"
echo "1. Verify the generated icons look correct"
echo "2. Run 'npm run build' to include them in the build"
echo "3. Test the PWA installation on mobile devices"
