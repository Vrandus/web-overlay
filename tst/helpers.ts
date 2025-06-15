import { execSync } from 'child_process';
import path from 'path';
import os from 'os';

const TEST_CONFIG_PATH = path.join(os.tmpdir(), 'web-overlay-test-config.json');

/**
 * Helper function to run CLI commands in tests
 * @param command The command to run
 * @returns The command output
 */
export const runCommand = (command: string): string => {
  try {
    return execSync(`node ${path.join(__dirname, '../dist/cli.js')} ${command} --config "${TEST_CONFIG_PATH}"`, {
      encoding: 'utf8'
    });
  } catch (error: any) {
    return error.stdout || error.stderr || error.message;
  }
};

/**
 * Helper function to wait for a specified time
 * @param ms Time to wait in milliseconds
 */
export const wait = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
}; 