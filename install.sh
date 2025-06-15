#!/bin/bash

# Install dependencies
npm install

# Install type definitions
npm install --save-dev @types/commander @types/chalk

# Build the project
npm run build

# Make the CLI executable
chmod +x dist/cli.js

# Install globally
npm install -g .

echo "Installation complete! You can now use 'web-overlay' command globally."
echo "Example usage:"
echo "  web-overlay list"
echo "  web-overlay add my-overlay http://localhost:3000"
echo "  web-overlay start my-overlay" 