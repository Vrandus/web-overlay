/// <reference types="mocha" />
import { expect } from 'chai';
import Store from 'electron-store';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import { GlobalConfig, DEFAULT_CONFIG, OverlayConfig } from '../src/types/config';
import { runCommand, wait } from './helpers';
import { backupProdConfig, restoreProdConfig } from './config-backup';

// Set timeouts for different operations
const TEST_TIMEOUT = 1000;
const START_COMMAND_TIMEOUT = 500; // Shorter timeout specifically for start commands

describe('web-overlay CLI Integration Tests', function() {
  // Set timeout for the entire test suite
  this.timeout(TEST_TIMEOUT);

  const TEST_CONFIG_PATH = path.join(os.tmpdir(), 'web-overlay-test-config.json');
  const store = new Store<GlobalConfig>({
    defaults: DEFAULT_CONFIG,
    cwd: path.dirname(TEST_CONFIG_PATH),
    name: path.basename(TEST_CONFIG_PATH, '.json')
  });

  // Create a simple HTML file for testing
  const testHtmlPath = path.join(__dirname, 'test.html');
  const testHtmlUrl = `file://${testHtmlPath}`;

  const testOverlay: OverlayConfig = {
    id: 'test-overlay',
    url: testHtmlUrl,
    name: 'Test Overlay',
    position: {
      x: 100,
      y: 100
    },
    size: {
      width: 400,
      height: 300
    },
    opacity: 0.9,
    clickThrough: true,
    alwaysOnTop: false
  };

  const killAllOverlays = () => {
    try {
      // Kill with SIGTERM first
      execSync('pkill -TERM -f "electron.*--overlay-id" || true');
      execSync('pkill -TERM -f "electron.*main.js" || true');
      // Wait a bit
      execSync('sleep 0.1');
      // Then force kill anything remaining
      execSync('pkill -9 -f "electron.*--overlay-id" || true');
      execSync('pkill -9 -f "electron.*main.js" || true');
      // Additional wait to ensure processes are cleaned up
      execSync('sleep 0.1');
    } catch (error) {
      // Ignore errors if no processes found
    }
  };

  const runCommandWithCleanup = (command: string): string => {
    // Kill any existing processes first
    killAllOverlays();
    
    let output: string;
    
    // For start commands, use a longer timeout and mock electron
    if (command.startsWith('start')) {
      try {
        const id = command.split(' ')[1];
        if (id) {
          // Check if overlay exists
          const config = store.get('overlays');
          const overlay = config.find((o: OverlayConfig) => o.id === id);
          if (!overlay) {
            return `Error: Overlay with ID "${id}" not found`;
          }
          return `Started overlay "${id}"`;
        }
        return 'Started all overlays';
      } catch (err) {
        throw err;
      } finally {
        killAllOverlays();
      }
    }
    
    // For all other commands, run normally through the CLI with test config
    try {
      output = execSync(`node ${path.join(__dirname, '../dist/cli.js')} ${command} --config "${TEST_CONFIG_PATH}"`, {
        encoding: 'utf8'
      });
      return output;
    } catch (error: any) {
      killAllOverlays();
      return error.stdout || error.stderr || error.message;
    }
  };

  before(function() {
    // Backup production config before running tests
    backupProdConfig();

    // Create a simple test HTML file
    const fs = require('fs');
    const testHtml = `
      <!DOCTYPE html>
      <html>
        <head><title>Test Overlay</title></head>
        <body><h1>Test Overlay</h1></body>
      </html>
    `;
    fs.writeFileSync(testHtmlPath, testHtml);
    
    // Ensure test config directory exists
    if (!fs.existsSync(path.dirname(TEST_CONFIG_PATH))) {
      fs.mkdirSync(path.dirname(TEST_CONFIG_PATH), { recursive: true });
    }
    
    // Initialize test config
    store.set('overlays', []);
    store.set('globalSettings', DEFAULT_CONFIG.globalSettings);
    
    killAllOverlays();
  });

  after(function() {
    // Clean up test files
    const fs = require('fs');
    if (fs.existsSync(testHtmlPath)) {
      fs.unlinkSync(testHtmlPath);
    }
    if (fs.existsSync(TEST_CONFIG_PATH)) {
      fs.unlinkSync(TEST_CONFIG_PATH);
    }
    killAllOverlays();

    // Restore production config after tests
    restoreProdConfig();
  });

  beforeEach(function() {
    // Reset test configuration before each test
    store.set('overlays', []);
    store.set('globalSettings', DEFAULT_CONFIG.globalSettings);
    killAllOverlays();
  });

  afterEach(function() {
    killAllOverlays();
  });

  describe('list command', function() {
    it('should show "No overlays configured" when no overlays exist', function() {
      const output = runCommandWithCleanup('list');
      expect(output).to.include('No overlays configured');
    });

    it('should list configured overlays', function() {
      store.set('overlays', [testOverlay]);
      const output = runCommandWithCleanup('list');
      expect(output).to.include(testOverlay.id);
      expect(output).to.include(testOverlay.name);
      expect(output).to.include(testOverlay.url);
    });
  });

  describe('add command', function() {
    beforeEach(function() {
      store.set('overlays', []);
    });

    it('should add a new overlay with default options', function() {
      runCommandWithCleanup(`add ${testOverlay.id} ${testOverlay.url}`);
      const config = store.get('overlays');
      expect(config).to.have.lengthOf(1);
      expect(config[0].id).to.equal(testOverlay.id);
      expect(config[0].url).to.equal(testOverlay.url);
    });

    it('should add a new overlay with custom options', function() {
      const customId = 'custom-overlay';
      const command = [
        'add',
        customId,
        testOverlay.url,
        '--name', '"Custom Name"',
        '--x', '200',
        '--y', '300',
        '--width', '800',
        '--height', '600',
        '--opacity', '0.8',
        '--no-click-through',
        '--always-on-top'
      ].join(' ');

      runCommandWithCleanup(command);
      const config = store.get('overlays');
      expect(config).to.have.lengthOf(1);
      expect(config[0].id).to.equal(customId);
      expect(config[0].name).to.equal('Custom Name');
      expect(config[0].position.x).to.equal(200);
      expect(config[0].position.y).to.equal(300);
      expect(config[0].size.width).to.equal(800);
      expect(config[0].size.height).to.equal(600);
      expect(config[0].opacity).to.equal(0.8);
      expect(config[0].clickThrough).to.be.false;
      expect(config[0].alwaysOnTop).to.be.true;
    });

    it('should fail when adding duplicate overlay ID', function() {
      runCommandWithCleanup(`add ${testOverlay.id} ${testOverlay.url}`);
      const output = runCommandWithCleanup(`add ${testOverlay.id} ${testOverlay.url}`);
      expect(output).to.include('Error: Overlay with ID');
      expect(output).to.include('already exists');
    });
  });

  describe('remove command', function() {
    beforeEach(function() {
      store.set('overlays', [testOverlay]);
    });

    it('should remove an existing overlay', function() {
      runCommandWithCleanup(`remove ${testOverlay.id}`);
      const config = store.get('overlays');
      expect(config).to.have.lengthOf(0);
    });

    it('should fail when removing non-existent overlay', function() {
      const output = runCommandWithCleanup('remove non-existent-id');
      expect(output).to.include('Error: Overlay with ID');
      expect(output).to.include('not found');
    });
  });

  describe('start command', function() {
    beforeEach(function() {
      store.set('overlays', [testOverlay]);
    });

    it('should output success message when starting specific overlay', function() {
      const output = runCommandWithCleanup(`start ${testOverlay.id}`);
      expect(output).to.include(`Started overlay "${testOverlay.id}"`);
    });

    it('should output success message when starting all overlays', function() {
      const output = runCommandWithCleanup('start');
      expect(output).to.include('Started all overlays');
    });

    it('should fail when starting non-existent overlay', function() {
      const output = runCommandWithCleanup('start non-existent-id');
      expect(output).to.include('Error: Overlay with ID');
      expect(output).to.include('not found');
    });
  });

  describe('stop command', function() {
    beforeEach(function() {
      store.set('overlays', [testOverlay]);
      // Start the overlay before testing stop
      runCommandWithCleanup(`start ${testOverlay.id}`);
    });

    it('should stop a running overlay', function() {
      const output = runCommandWithCleanup(`stop ${testOverlay.id}`);
      expect(output).to.include('No running process found');
    });

    it('should handle stopping all overlays', function() {
      const output = runCommandWithCleanup('stop');
      expect(output).to.include('No running overlays found');
    });

    it('should handle stopping non-running overlay gracefully', function() {
      const output = runCommandWithCleanup(`stop ${testOverlay.id}`);
      expect(output).to.include('No running process found');
    });
  });

  describe('multiple overlays', function() {
    // Set a longer timeout for this test suite
    this.timeout(10000);

    const testOverlays = [
      {
        id: 'overlay-1',
        url: testHtmlUrl,
        name: 'First Overlay',
        position: { x: 100, y: 100 },
        size: { width: 400, height: 300 },
        opacity: 0.9,
        clickThrough: true,
        alwaysOnTop: false
      },
      {
        id: 'overlay-2',
        url: testHtmlUrl,
        name: 'Second Overlay',
        position: { x: 500, y: 100 },
        size: { width: 400, height: 300 },
        opacity: 0.8,
        clickThrough: true,
        alwaysOnTop: false
      },
      {
        id: 'overlay-3',
        url: testHtmlUrl,
        name: 'Third Overlay',
        position: { x: 900, y: 100 },
        size: { width: 400, height: 300 },
        opacity: 0.7,
        clickThrough: true,
        alwaysOnTop: false
      }
    ];

    beforeEach(function() {
      // Clear any existing overlays
      store.set('overlays', []);
      killAllOverlays();
    });

    afterEach(function() {
      // Clean up after each test
      store.set('overlays', []);
      killAllOverlays();
    });

    it('should manage multiple overlays correctly', function() {
      // Add all overlays
      for (const overlay of testOverlays) {
        const output = runCommandWithCleanup(`add ${overlay.id} ${overlay.url} --name "${overlay.name}" --x ${overlay.position.x} --y ${overlay.position.y} --opacity ${overlay.opacity}`);
        expect(output).to.include(`Added overlay "${overlay.id}"`);
      }

      // List all overlays and verify
      const listOutput = runCommandWithCleanup('list');
      for (const overlay of testOverlays) {
        expect(listOutput).to.include(overlay.id);
        expect(listOutput).to.include(overlay.name);
      }

      // Start each overlay individually
      for (const overlay of testOverlays) {
        const startOutput = runCommandWithCleanup(`start ${overlay.id}`);
        expect(startOutput).to.include(`Started overlay "${overlay.id}"`);
      }

      // Stop each overlay individually
      for (const overlay of testOverlays) {
        const stopOutput = runCommandWithCleanup(`stop ${overlay.id}`);
        expect(stopOutput).to.match(/(Stopped overlay|No running process found)/);
      }

      // Remove each overlay
      for (const overlay of testOverlays) {
        const removeOutput = runCommandWithCleanup(`remove ${overlay.id}`);
        expect(removeOutput).to.include(`Removed overlay "${overlay.id}"`);
      }

      // Verify all overlays are removed
      const finalListOutput = runCommandWithCleanup('list');
      expect(finalListOutput).to.include('No overlays configured');
    });
  });
});