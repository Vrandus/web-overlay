#!/usr/bin/env node

import { Command } from 'commander';
import Store from 'electron-store';
import { GlobalConfig, OverlayConfig, DEFAULT_CONFIG } from './types/config';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';
import chalk from 'chalk';

interface AddOptions {
  wsUri?: string;
  name?: string;
  x: string;
  y: string;
  width: string;
  height: string;
  opacity: string;
  clickThrough: boolean;
  alwaysOnTop?: boolean;
}

interface StartOptions {
  debug?: boolean;
}

const program = new Command();
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

program
  .name('web-overlay')
  .description('A configurable overlay window manager for Linux')
  .version('0.1.0');

program
  .command('list')
  .description('List all configured overlays')
  .action(() => {
    const config = store.get('overlays');
    if (config.length === 0) {
      console.log(chalk.yellow('No overlays configured.'));
      return;
    }

    console.log(chalk.bold('\nConfigured Overlays:'));
    config.forEach((overlay: OverlayConfig) => {
      console.log(`
${chalk.green('ID:')} ${overlay.id}
${chalk.green('Name:')} ${overlay.name}
${chalk.green('URL:')} ${overlay.url}
${chalk.green('WebSocket:')} ${overlay.wsUri || 'None'}
${chalk.green('Position:')} ${overlay.position.x}, ${overlay.position.y}
${chalk.green('Size:')} ${overlay.size.width}x${overlay.size.height}
${chalk.green('Opacity:')} ${overlay.opacity}
${chalk.green('Click-through:')} ${overlay.clickThrough}
${chalk.green('Always on top:')} ${overlay.alwaysOnTop}
${chalk.dim('-------------------')}`);
    });
  });

program
  .command('add')
  .description('Add a new overlay')
  .argument('<id>', 'Unique identifier for the overlay')
  .argument('<url>', 'URL for the overlay content')
  .option('--ws-uri <uri>', 'WebSocket URI for the overlay')
  .option('--name <name>', 'Display name for the overlay')
  .option('--x <number>', 'X position', '100')
  .option('--y <number>', 'Y position', '100')
  .option('--width <number>', 'Window width', '400')
  .option('--height <number>', 'Window height', '300')
  .option('--opacity <number>', 'Window opacity (0-1)', '0.9')
  .option('--no-click-through', 'Disable click-through')
  .option('--always-on-top', 'Keep window always on top')
  .action((id: string, url: string, options: AddOptions) => {
    const config = store.get('overlays');
    if (config.some((o: OverlayConfig) => o.id === id)) {
      console.error(chalk.red(`Error: Overlay with ID "${id}" already exists`));
      process.exit(1);
    }

    const newOverlay: OverlayConfig = {
      id,
      name: options.name || id,
      url,
      wsUri: options.wsUri,
      position: {
        x: parseInt(options.x),
        y: parseInt(options.y)
      },
      size: {
        width: parseInt(options.width),
        height: parseInt(options.height)
      },
      opacity: parseFloat(options.opacity),
      clickThrough: options.clickThrough !== false,
      alwaysOnTop: options.alwaysOnTop || false
    };

    store.set('overlays', [...config, newOverlay]);
    console.log(chalk.green(`Added overlay "${id}"`));
  });

program
  .command('remove')
  .description('Remove an overlay')
  .argument('<id>', 'ID of the overlay to remove')
  .action((id: string) => {
    const config = store.get('overlays');
    const newConfig = config.filter((o: OverlayConfig) => o.id !== id);
    
    if (newConfig.length === config.length) {
      console.error(chalk.red(`Error: Overlay with ID "${id}" not found`));
      process.exit(1);
    }

    store.set('overlays', newConfig);
    console.log(chalk.green(`Removed overlay "${id}"`));
  });

program
  .command('start')
  .description('Start an overlay')
  .argument('[id]', 'ID of the overlay to start (omit for all)')
  .option('--debug', 'Enable debug mode')
  .action((id: string | undefined, options: StartOptions) => {
    if (id) {
      startOverlay(id, options.debug);
    } else {
      startAllOverlays(options.debug);
    }
  });

program
  .command('stop')
  .description('Stop an overlay')
  .argument('[id]', 'ID of the overlay to stop (omit for all)')
  .action((id: string | undefined) => {
    if (id) {
      stopOverlay(id);
    } else {
      stopAllOverlays();
    }
  });

function startOverlay(overlayId: string, debug = false) {
  const config = store.get('overlays');
  const overlay = config.find((o: OverlayConfig) => o.id === overlayId);
  
  if (!overlay) {
    console.error(chalk.red(`Error: Overlay with ID "${overlayId}" not found`));
    process.exit(1);
  }

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

  child.unref();
  console.log(chalk.green(`Started overlay "${overlayId}"`));
}

function stopOverlay(overlayId: string) {
  const config = store.get('overlays');
  const overlay = config.find((o: OverlayConfig) => o.id === overlayId);
  
  if (!overlay) {
    console.error(chalk.red(`Error: Overlay with ID "${overlayId}" not found`));
    process.exit(1);
  }

  const { execSync } = require('child_process');
  try {
    execSync(`pkill -f "electron.*--overlay-id.*main\.js ${overlayId}"`);
    console.log(chalk.green(`Stopped overlay "${overlayId}"`));
  } catch (error) {
    console.log(chalk.yellow(`No running process found for overlay "${overlayId}"`));
  }
}

function startAllOverlays(debug = false) {
  const config = store.get('overlays');
  if (config.length === 0) {
    console.log(chalk.yellow('No overlays configured.'));
    return;
  }
  
  for (const overlay of config) {
    startOverlay(overlay.id, debug);
  }
  console.log(chalk.green('Started all overlays'));
}

function stopAllOverlays() {
  const config = store.get('overlays');
  if (config.length === 0) {
    console.log(chalk.yellow('No overlays configured.'));
    return;
  }

  const { execSync } = require('child_process');
  try {
    execSync(`pkill -f "electron.*--overlay-id"`);
    console.log(chalk.green('Stopped all overlays'));
  } catch (error) {
    console.log(chalk.yellow('No running overlays found'));
  }
}

program.parse(); 