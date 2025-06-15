import fs from 'fs';
import path from 'path';
import os from 'os';

const PROD_CONFIG_PATH = path.join(os.homedir(), '.config', 'web-overlay', 'config.json');
const BACKUP_CONFIG_PATH = path.join(os.tmpdir(), 'web-overlay-prod-config.backup.json');

/**
 * Backs up the production config file if it exists
 */
export const backupProdConfig = (): void => {
  if (fs.existsSync(PROD_CONFIG_PATH)) {
    // Ensure backup directory exists
    const backupDir = path.dirname(BACKUP_CONFIG_PATH);
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    // Copy the production config to backup
    fs.copyFileSync(PROD_CONFIG_PATH, BACKUP_CONFIG_PATH);
  }
};

/**
 * Restores the production config from backup if it exists
 */
export const restoreProdConfig = (): void => {
  if (fs.existsSync(BACKUP_CONFIG_PATH)) {
    // Ensure production config directory exists
    const prodDir = path.dirname(PROD_CONFIG_PATH);
    if (!fs.existsSync(prodDir)) {
      fs.mkdirSync(prodDir, { recursive: true });
    }
    
    // Restore the production config from backup
    fs.copyFileSync(BACKUP_CONFIG_PATH, PROD_CONFIG_PATH);
    
    // Clean up backup file
    fs.unlinkSync(BACKUP_CONFIG_PATH);
  } else if (fs.existsSync(PROD_CONFIG_PATH)) {
    // If no backup exists but prod config does, remove the prod config
    // This handles the case where tests created a new config file
    fs.unlinkSync(PROD_CONFIG_PATH);
  }
}; 