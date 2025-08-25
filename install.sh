#!/bin/bash

# Route Extractor CLI Installation Script

set -e

echo "🚀 Installing Route Extractor CLI..."

# Check if bun is installed
if ! command -v bun &> /dev/null; then
    echo "❌ Error: Bun is not installed. Please install Bun first:"
    echo "   curl -fsSL https://bun.sh/install | bash"
    exit 1
fi

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Build the project
echo "📦 Building the project..."
cd "$SCRIPT_DIR"
bun run build

# Make CLI executable
echo "🔧 Making CLI executable..."
chmod +x bin/cli.js

# Create global symlink
echo "🔗 Creating global symlink..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sudo ln -sf "$SCRIPT_DIR/bin/cli.js" /usr/local/bin/route-extractor
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    sudo ln -sf "$SCRIPT_DIR/bin/cli.js" /usr/local/bin/route-extractor
else
    echo "⚠️  Unsupported OS. Please manually add the following to your PATH:"
    echo "   export PATH=\"$SCRIPT_DIR/bin:\$PATH\""
    echo "   Add this line to your shell profile (.bashrc, .zshrc, etc.)"
fi

echo "✅ Installation complete!"
echo ""
echo "You can now use the CLI from anywhere:"
echo "  route-extractor --help"
echo "  route-extractor ./my-react-project"
echo ""
echo "To uninstall, run:"
echo "  sudo rm /usr/local/bin/route-extractor"
