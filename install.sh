#!/bin/bash

# Exit on any error
set -e

echo "Installing/Updating web-overlay CLI tool..."

# Ensure proper ownership of the project directory
if [ "$SUDO_USER" ]; then
    # If script is run with sudo, ensure files are owned by the real user
    sudo chown -R $SUDO_USER:$SUDO_USER .
else
    # If we don't have sudo rights, try to get them
    if [ ! -w "/usr/lib/node_modules" ]; then
        echo "This script requires sudo privileges to install globally"
        echo "Please run with: sudo ./install.sh"
        exit 1
    fi
fi

# Clean up any existing installation
echo "Cleaning up existing installation..."
sudo rm -f /usr/bin/web-overlay
sudo npm uninstall -g web-overlay 2>/dev/null || true

# Clean up any previous build
echo "Cleaning up previous build..."
rm -rf dist/

# Install dependencies
echo "Installing dependencies..."
if [ "$SUDO_USER" ]; then
    sudo -u $SUDO_USER npm install
else
    npm install
fi

# Install type definitions
echo "Installing type definitions..."
if [ "$SUDO_USER" ]; then
    sudo -u $SUDO_USER npm install --save-dev @types/commander @types/chalk
else
    npm install --save-dev @types/commander @types/chalk
fi

# Build the project
echo "Building project..."
if [ "$SUDO_USER" ]; then
    sudo -u $SUDO_USER npm run build
else
    npm run build
fi

# Make the CLI executable
echo "Setting up CLI..."
chmod +x dist/src/cli.js

# Install globally
echo "Installing globally..."
# Always use sudo for global installation
sudo npm install -g .

# Create symlink with proper permissions
if [ -f "/usr/lib/node_modules/web-overlay/dist/src/cli.js" ]; then
    echo "Creating symlink..."
    sudo ln -sf /usr/lib/node_modules/web-overlay/dist/src/cli.js /usr/bin/web-overlay
    sudo chmod +x /usr/bin/web-overlay
fi

echo -e "\nInstallation complete! You can now use 'web-overlay' command globally."
echo "Example usage:"
echo "  web-overlay list"
echo "  web-overlay add my-overlay http://localhost:3000"
echo "  web-overlay start my-overlay"

# Verify installation
if command -v web-overlay >/dev/null 2>&1; then
    echo -e "\nVerification: web-overlay is successfully installed!"
    web-overlay -V
else
    echo -e "\nWarning: Installation may have failed. 'web-overlay' command not found in PATH"
    echo "Please check the error messages above or try running the script with sudo"
    exit 1
fi 