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
  config?: string;
}

interface StartOptions {
  debug?: boolean;
  config?: string;
}

interface BaseOptions {
  config?: string;
}

const program = new Command();

// Helper to get store instance based on config path
const getStore = (configPath?: string) => {
  const storePath = configPath || path.join(os.homedir(), '.config', 'web-overlay', 'config.json');
  return new Store<GlobalConfig>({
    defaults: DEFAULT_CONFIG,
    cwd: path.dirname(storePath),
    name: path.basename(storePath, '.json')
  });
};

program
  .name('web-overlay')
  .description('A configurable overlay window manager for Linux')
  .version('0.1.11')
  .option('--config <path>', 'Path to config file');

program
  .command('list')
  .description('List all configured overlays')
  .option('--config <path>', 'Path to config file')
  .action((options: BaseOptions) => {
    const store = getStore(options.config);
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
  .option('--name <n>', 'Display name for the overlay')
  .option('--x <number>', 'X position', '100')
  .option('--y <number>', 'Y position', '100')
  .option('--width <number>', 'Window width', '400')
  .option('--height <number>', 'Window height', '300')
  .option('--opacity <number>', 'Window opacity (0-1)', '0.9')
  .option('--no-click-through', 'Disable click-through')
  .option('--always-on-top', 'Keep window always on top')
  .option('--config <path>', 'Path to config file')
  .action((id: string, url: string, options: AddOptions) => {
    const store = getStore(options.config);
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
  .option('--config <path>', 'Path to config file')
  .action((id: string, options: BaseOptions) => {
    const store = getStore(options.config);
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
  .option('--config <path>', 'Path to config file')
  .action((id: string | undefined, options: StartOptions) => {
    const store = getStore(options.config);
    if (id) {
      startOverlay(id, options.debug, store);
    } else {
      startAllOverlays(options.debug, store);
    }
  });

program
  .command('stop')
  .description('Stop an overlay')
  .argument('[id]', 'ID of the overlay to stop (omit for all)')
  .option('--config <path>', 'Path to config file')
  .action((id: string | undefined, options: BaseOptions) => {
    const store = getStore(options.config);
    if (id) {
      stopOverlay(id, store);
    } else {
      stopAllOverlays(store);
    }
  });

function startOverlay(overlayId: string, debug = false, store: Store<GlobalConfig>) {
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

function stopOverlay(overlayId: string, store: Store<GlobalConfig>) {
  const config = store.get('overlays');
  const overlay = config.find((o: OverlayConfig) => o.id === overlayId);
  
  if (!overlay) {
    console.error(chalk.red(`Error: Overlay with ID "${overlayId}" not found`));
    process.exit(1);
  }

  const { spawnSync } = require('child_process');
  const result = spawnSync('pkill', ['-f', `electron.*--overlay-id.*main\.js ${overlayId}`]);
  
  // pkill exit codes: 0 = processes killed, 1 = no processes found
  if (result.status === 0) {
    console.log(chalk.green(`Stopped overlay "${overlayId}"`));
  } else {
    console.log(chalk.yellow(`No running process found for overlay "${overlayId}"`));
  }
}

function startAllOverlays(debug = false, store: Store<GlobalConfig>) {
  const config = store.get('overlays');
  if (config.length === 0) {
    console.log(chalk.yellow('No overlays configured.'));
    return;
  }
  
  for (const overlay of config) {
    startOverlay(overlay.id, debug, store);
  }
  console.log(chalk.green('Started all overlays'));
}

function stopAllOverlays(store: Store<GlobalConfig>) {
  const config = store.get('overlays');
  if (config.length === 0) {
    console.log(chalk.yellow('No overlays configured.'));
    return;
  }

  const { spawnSync } = require('child_process');
  console.log(chalk.dim('Attempting to stop all overlays...'));
  
  // First try to list matching processes
  const psList = spawnSync('pgrep', ['-f', 'electron.*--overlay-id']);
  if (psList.stdout) {
    console.log(chalk.dim(`Found processes: ${psList.stdout.toString()}`));
  }
  
  const result = spawnSync('pkill', ['-f', 'electron.*--overlay-id']);
  console.log(chalk.dim(`pkill exit code: ${result.status}`));
  if (result.stderr) {
    console.log(chalk.dim(`pkill stderr: ${result.stderr.toString()}`));
  }
  
  // pkill exit codes: 0 = processes killed, 1 = no processes found
  if (result.status === 0) {
    console.log(chalk.green('Stopped all overlays'));
  } else if (result.status === 1) {
    console.log(chalk.yellow('No running overlays found'));
  } else {
    console.log(chalk.red(`Error stopping overlays (exit code ${result.status})`));
  }
}

program.parse(); 