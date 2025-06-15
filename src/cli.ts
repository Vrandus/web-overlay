import Store from 'electron-store';
import { GlobalConfig, OverlayConfig, DEFAULT_CONFIG } from './types/config';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';

const configPath = path.join(os.homedir(), '.config', 'web-overlay', 'config.json');
const store = new Store<GlobalConfig>({
  defaults: DEFAULT_CONFIG,
  cwd: path.dirname(configPath),
  name: path.basename(configPath, '.json')
});

// Ensure overlays array exists
if (!store.get('overlays')) {
  store.set('overlays', []);
}

function printHelp() {
  console.log(`
Web Overlay CLI

Usage:
  npm run overlay [command] [options]

Commands:
  list                    List all configured overlays
  add <id> <url>         Add a new overlay
  remove <id>            Remove an overlay
  start <id>             Start a specific overlay
  stop <id>              Stop a specific overlay
  start-all              Start all overlays
  stop-all               Stop all overlays
  help                   Show this help message

Options:
  --ws-uri <uri>         WebSocket URI for the overlay
  --name <string>        Display name for the overlay (defaults to ID if not specified)
  --x <number>           X position (default: 100)
  --y <number>           Y position (default: 100)
  --width <number>       Window width (default: 400)
  --height <number>      Window height (default: 300)
  --opacity <number>     Window opacity (0-1, default: 0.9)
  --click-through        Enable click-through (default: true)
  --always-on-top        Keep window always on top (default: true)
  --debug               Enable debug logging

Examples:
  npm run overlay add dps-meter file:///path/to/overlay.html --ws-uri ws://127.0.0.1:10501/ws --name "DPS Meter"
  npm run overlay list
  npm run overlay remove dps-meter
  npm run overlay start dps-meter --debug
  npm run overlay stop-all

Note: Always use 'npm run overlay' (not overlay:start or overlay:list) to ensure options are passed correctly.
`);
}

function listOverlays() {
  const config = store.get('overlays');
  if (config.length === 0) {
    console.log('No overlays configured.');
    return;
  }

  console.log('\nConfigured Overlays:');
  config.forEach((overlay: OverlayConfig) => {
    console.log(`
ID: ${overlay.id}
Name: ${overlay.name}
URL: ${overlay.url}
WebSocket: ${overlay.wsUri || 'None'}
Position: ${overlay.position.x}, ${overlay.position.y}
Size: ${overlay.size.width}x${overlay.size.height}
Opacity: ${overlay.opacity}
Click-through: ${overlay.clickThrough}
Always on top: ${overlay.alwaysOnTop}
-------------------`);
  });
}

function addOverlay(args: string[]) {
  const id = args[0];
  const url = args[1];
  
  if (!id || !url) {
    console.error('Error: ID and URL are required');
    printHelp();
    process.exit(1);
  }

  const config = store.get('overlays');
  if (config.some((o: OverlayConfig) => o.id === id)) {
    console.error(`Error: Overlay with ID "${id}" already exists`);
    process.exit(1);
  }

  const newOverlay: OverlayConfig = {
    id,
    name: process.argv.find(arg => arg.startsWith('--name='))?.split('=')[1] || id,
    url,
    wsUri: process.argv.find(arg => arg.startsWith('--ws-uri='))?.split('=')[1],
    position: {
      x: parseInt(process.argv.find(arg => arg.startsWith('--x='))?.split('=')[1] || '100'),
      y: parseInt(process.argv.find(arg => arg.startsWith('--y='))?.split('=')[1] || '100')
    },
    size: {
      width: parseInt(process.argv.find(arg => arg.startsWith('--width='))?.split('=')[1] || '400'),
      height: parseInt(process.argv.find(arg => arg.startsWith('--height='))?.split('=')[1] || '300')
    },
    opacity: parseFloat(process.argv.find(arg => arg.startsWith('--opacity='))?.split('=')[1] || '0.9'),
    clickThrough: !process.argv.includes('--no-click-through'),
    alwaysOnTop: process.argv.includes('--always-on-top')
  };

  store.set('overlays', [...config, newOverlay]);
  console.log(`Added overlay "${id}"`);
}

function removeOverlay(id: string) {
  const config = store.get('overlays');
  const newConfig = config.filter((o: OverlayConfig) => o.id !== id);
  
  if (newConfig.length === config.length) {
    console.error(`Error: Overlay with ID "${id}" not found`);
    process.exit(1);
  }

  store.set('overlays', newConfig);
  console.log(`Removed overlay "${id}"`);
}

function startOverlay(overlayId: string) {
  const config = store.get('overlays');
  const overlay = config.find((o: OverlayConfig) => o.id === overlayId);
  
  if (!overlay) {
    console.error(`Error: Overlay with ID "${overlayId}" not found`);
    process.exit(1);
  }

  // Get debug flag
  const debug = process.argv.includes('--debug');

  // Spawn a new Electron process
  const electronPath = require('electron');
  const appPath = path.join(__dirname, 'main.js');
  
  const args = [appPath, '--overlay-id', overlayId];
  if (debug) {
    args.push('--debug');
  }

  const child = spawn(electronPath, args, {
    stdio: 'inherit',
    detached: true
  });

  // Unref the child to allow the parent to exit
  child.unref();
}

function stopOverlay(overlayId: string) {
  const config = store.get('overlays');
  const overlay = config.find((o: OverlayConfig) => o.id === overlayId);
  
  if (!overlay) {
    console.error(`Error: Overlay with ID "${overlayId}" not found`);
    process.exit(1);
  }

  // Send SIGTERM to any running overlay processes
  const { execSync } = require('child_process');
  try {
    // Find and kill any Electron processes running with this overlay ID
    // The process has the main.js path between --overlay-id and the actual ID
    execSync(`pkill -f "electron.*--overlay-id.*main\.js ${overlayId}"`);
    console.log(`Stopped overlay "${overlayId}"`);
  } catch (error) {
    // If no process is found, pkill will return non-zero exit code
    console.log(`No running process found for overlay "${overlayId}"`);
  }
}

function startAllOverlays() {
  const config = store.get('overlays');
  if (config.length === 0) {
    console.log('No overlays configured.');
    return;
  }

  const debug = process.argv.includes('--debug');
  
  for (const overlay of config) {
    startOverlay(overlay.id);
  }
  console.log('Started all overlays');
}

function stopAllOverlays() {
  const config = store.get('overlays');
  if (config.length === 0) {
    console.log('No overlays configured.');
    return;
  }

  // Send SIGTERM to all running overlay processes
  const { execSync } = require('child_process');
  try {
    // Kill all Electron processes running with --overlay-id
    execSync(`pkill -f "electron.*--overlay-id"`);
    console.log('Stopped all overlays');
  } catch (error) {
    // If no process is found, pkill will return non-zero exit code
    console.log('No running overlays found');
  }
}

// Parse command line arguments
const command = process.argv[2];
const args = process.argv.slice(3);

// If no command is provided, show help and exit
if (!command) {
  printHelp();
  process.exit(0);
}

// Process commands
switch (command) {
  case 'list':
    listOverlays();
    break;
  case 'add':
    addOverlay(args);
    break;
  case 'remove':
    if (!args[0]) {
      console.error('Error: Overlay ID is required');
      printHelp();
      process.exit(1);
    } else {
      removeOverlay(args[0]);
    }
    break;
  case 'start':
    if (!args[0]) {
      console.error('Error: Overlay ID is required');
      printHelp();
      process.exit(1);
    }
    startOverlay(args[0]);
    break;
  case 'stop':
    if (!args[0]) {
      console.error('Error: Overlay ID is required');
      printHelp();
      process.exit(1);
    }
    stopOverlay(args[0]);
    break;
  case 'start-all':
    startAllOverlays();
    break;
  case 'stop-all':
    stopAllOverlays();
    break;
  case 'help':
    printHelp();
    break;
  default:
    console.error(`Unknown command: ${command}`);
    printHelp();
    process.exit(1);
}

// Exit after processing command
process.exit(0); 