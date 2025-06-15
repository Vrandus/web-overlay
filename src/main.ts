import { app, BrowserWindow, ipcMain, IpcMainInvokeEvent } from 'electron';
import Store from 'electron-store';
import { GlobalConfig, OverlayConfig, DEFAULT_CONFIG } from './types/config';
import path from 'path';
import os from 'os';

const configPath = path.join(os.homedir(), '.config', 'web-overlay', 'config.json');
const store = new Store<GlobalConfig>({
  defaults: DEFAULT_CONFIG,
  cwd: path.dirname(configPath),
  name: path.basename(configPath, '.json')
});

// Debug mode flag
const DEBUG = process.argv.includes('--debug');

function debugLog(...args: any[]) {
  if (DEBUG) {
    console.log(...args);
  }
}

// Add debug logging at app start
app.whenReady().then(() => {
  if (DEBUG) {
    debugLog('Process Environment:', {
      DESKTOP_SESSION: process.env.DESKTOP_SESSION,
      XDG_CURRENT_DESKTOP: process.env.XDG_CURRENT_DESKTOP,
      WAYLAND_DISPLAY: process.env.WAYLAND_DISPLAY,
      NODE_ENV: process.env.NODE_ENV,
      npm_config_user_agent: process.env.npm_config_user_agent
    });
  }

  // Check if we're starting a specific overlay
  const overlayId = process.argv.find((arg, index) => 
    arg === '--overlay-id' && process.argv.length > index + 1
  );

  if (overlayId) {
    const id = process.argv[process.argv.indexOf(overlayId) + 1];
    const config = store.get('overlays');
    const overlay = config.find((o: OverlayConfig) => o.id === id);
    
    if (overlay) {
      overlayManager.createOverlay(overlay);
      debugLog(`Started overlay "${id}"`);
    } else {
      console.error(`Error: Overlay with ID "${id}" not found`);
      app.quit();
    }
  } else {
    // Start all overlays in normal mode
    const config = store.get('overlays');
    debugLog('Loaded overlays:', config);
    config.forEach((overlay: OverlayConfig) => overlayManager.createOverlay(overlay));
  }
});

class OverlayManager {
  private windows: Map<string, BrowserWindow> = new Map();

  createOverlay(config: OverlayConfig): BrowserWindow {
    // Debug log the overlay configuration
    debugLog('Creating overlay with config:', {
      id: config.id,
      name: config.name,
      url: config.url,
      wsUri: config.wsUri
    });

    const window = new BrowserWindow({
      x: config.position.x,
      y: config.position.y,
      width: config.size.width,
      height: config.size.height,
      transparent: true,
      frame: false,
      alwaysOnTop: config.alwaysOnTop,
      type: 'notification',
      focusable: !config.clickThrough,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      },
      title: config.name || config.id,
      backgroundColor: '#00000000'
    });

    // Debug log window properties
    debugLog('Window Properties:', {
      title: window.getTitle(),
      alwaysOnTop: window.isAlwaysOnTop()
    });

    window.setTitle(config.name || config.id);
    window.setVisibleOnAllWorkspaces(true);
    window.setAlwaysOnTop(true);
    window.setIgnoreMouseEvents(config.clickThrough);
    window.setOpacity(config.opacity);

    const url = config.wsUri 
      ? `${config.url}${config.url.includes('?') ? '&' : '?'}OVERLAY_WS=${config.wsUri}`
      : config.url;
    
    debugLog("Constructed overlay URL (with wsUri):", url);
    
    // Add error handler for page load
    window.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.error('Failed to load URL:', {
        url,
        errorCode,
        errorDescription
      });
    });

    // Add handler for page console messages
    window.webContents.on('console-message', (event, level, message) => {
      debugLog('Page console:', {
        level,
        message
      });
    });

    window.loadURL(url);
    this.windows.set(config.id, window);

    window.on('closed', () => {
      this.windows.delete(config.id);
    });

    return window;
  }

  closeOverlay(id: string): void {
    const window = this.windows.get(id);
    if (window) {
      window.close();
      this.windows.delete(id);
    }
  }

  closeAllOverlays(): void {
    this.windows.forEach(window => window.close());
    this.windows.clear();
  }
}

const overlayManager = new OverlayManager();

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('create-overlay', (_: IpcMainInvokeEvent, config: OverlayConfig) => {
  const window = overlayManager.createOverlay(config);
  return { id: config.id };
});

ipcMain.handle('close-overlay', (_: IpcMainInvokeEvent, id: string) => {
  overlayManager.closeOverlay(id);
});

ipcMain.handle('close-all-overlays', (_: IpcMainInvokeEvent) => {
  overlayManager.closeAllOverlays();
});

interface OverlayPosition {
  id: string;
  x: number;
  y: number;
}

ipcMain.on('overlay-moved', (_: IpcMainInvokeEvent, { id, x, y }: OverlayPosition) => {
  const config = store.get('overlays');
  const overlay = config.find(o => o.id === id);
  if (overlay) {
    overlay.position = { x, y };
    store.set('overlays', config);
  }
});

// Export overlayManager for CLI usage
export { overlayManager }; 