import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { getErrorMessage } from './BaseAgent';

/**
 * Interface for storage providers
 */
export interface StorageProvider {
  save(key: string, data: any): Promise<void>;
  load(key: string): Promise<any>;
  exists(key: string): Promise<boolean>;
  delete(key: string): Promise<boolean>;
  list(prefix?: string): Promise<string[]>;
}

/**
 * File system based storage provider
 */
export class FileSystemStorageProvider implements StorageProvider {
  private basePath: string;
  
  constructor(basePath: string) {
    this.basePath = basePath;
  }
  
  /**
   * Save data to a file
   * @param key The key to save under
   * @param data The data to save
   */
  public async save(key: string, data: any): Promise<void> {
    const filePath = this.getFilePath(key);
    
    try {
      // Ensure the directory exists
      await this.ensureDirectoryExists(dirname(filePath));
      
      // Serialize and write data
      const serialized = JSON.stringify(data, null, 2);
      await fs.writeFile(filePath, serialized, 'utf8');
      
      console.log(`Saved state to ${filePath}`);
    } catch (error: unknown) {
      console.error(`Error saving to ${filePath}: ${getErrorMessage(error)}`);
      throw error;
    }
  }
  
  /**
   * Load data from a file
   * @param key The key to load
   * @returns The loaded data
   */
  public async load(key: string): Promise<any> {
    const filePath = this.getFilePath(key);
    
    try {
      // Check if file exists
      if (!await this.exists(key)) {
        return null;
      }
      
      // Read and parse data
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error: unknown) {
      console.error(`Error loading from ${filePath}: ${getErrorMessage(error)}`);
      throw error;
    }
  }
  
  /**
   * Check if a key exists
   * @param key The key to check
   * @returns Whether the key exists
   */
  public async exists(key: string): Promise<boolean> {
    const filePath = this.getFilePath(key);
    
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Delete a file
   * @param key The key to delete
   * @returns Whether the deletion was successful
   */
  public async delete(key: string): Promise<boolean> {
    const filePath = this.getFilePath(key);
    
    try {
      // Check if file exists
      if (!await this.exists(key)) {
        return false;
      }
      
      // Delete the file
      await fs.unlink(filePath);
      console.log(`Deleted ${filePath}`);
      return true;
    } catch (error: unknown) {
      console.error(`Error deleting ${filePath}: ${getErrorMessage(error)}`);
      return false;
    }
  }
  
  /**
   * List all keys with a given prefix
   * @param prefix Optional prefix to filter by
   * @returns Array of keys
   */
  public async list(prefix?: string): Promise<string[]> {
    try {
      const prefixPath = prefix ? this.getFilePath(prefix) : this.basePath;
      const prefixDir = prefix ? dirname(prefixPath) : this.basePath;
      
      // Ensure the directory exists
      if (!await this.directoryExists(prefixDir)) {
        return [];
      }
      
      // Get all files in the directory
      const files = await this.listFilesRecursively(prefixDir);
      
      // Convert file paths back to keys
      return files.map(file => {
        const relativePath = file.slice(this.basePath.length);
        return relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
      }).filter(key => {
        return !prefix || key.startsWith(prefix);
      });
    } catch (error: unknown) {
      console.error(`Error listing keys: ${getErrorMessage(error)}`);
      return [];
    }
  }
  
  /**
   * Get the file path for a key
   * @param key The key
   * @returns The file path
   */
  private getFilePath(key: string): string {
    // Replace dots with slashes
    const normalizedKey = key.replace(/\./g, '/');
    
    // Append .json extension if not present
    const hasExtension = normalizedKey.endsWith('.json');
    const keyWithExtension = hasExtension ? normalizedKey : `${normalizedKey}.json`;
    
    return join(this.basePath, keyWithExtension);
  }
  
  /**
   * Ensure a directory exists
   * @param dirPath The directory path
   */
  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error: unknown) {
      // Ignore if directory already exists
      if ((error as any)?.code !== 'EEXIST') {
        throw error;
      }
    }
  }
  
  /**
   * Check if a directory exists
   * @param dirPath The directory path
   */
  private async directoryExists(dirPath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(dirPath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }
  
  /**
   * List files recursively in a directory
   * @param dirPath The directory path
   * @returns Array of file paths
   */
  private async listFilesRecursively(dirPath: string): Promise<string[]> {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    const files: string[] = [];
    
    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        const subFiles = await this.listFilesRecursively(fullPath);
        files.push(...subFiles);
      } else if (entry.isFile()) {
        files.push(fullPath);
      }
    }
    
    return files;
  }
}

/**
 * In-memory storage provider for testing
 */
export class InMemoryStorageProvider implements StorageProvider {
  private storage: Map<string, any> = new Map();
  
  /**
   * Save data in memory
   * @param key The key to save under
   * @param data The data to save
   */
  public async save(key: string, data: any): Promise<void> {
    this.storage.set(key, JSON.parse(JSON.stringify(data)));
  }
  
  /**
   * Load data from memory
   * @param key The key to load
   * @returns The loaded data
   */
  public async load(key: string): Promise<any> {
    if (!this.storage.has(key)) {
      return null;
    }
    
    const data = this.storage.get(key);
    return JSON.parse(JSON.stringify(data));
  }
  
  /**
   * Check if a key exists in memory
   * @param key The key to check
   * @returns Whether the key exists
   */
  public async exists(key: string): Promise<boolean> {
    return this.storage.has(key);
  }
  
  /**
   * Delete a key from memory
   * @param key The key to delete
   * @returns Whether the deletion was successful
   */
  public async delete(key: string): Promise<boolean> {
    return this.storage.delete(key);
  }
  
  /**
   * List all keys with a given prefix
   * @param prefix Optional prefix to filter by
   * @returns Array of keys
   */
  public async list(prefix?: string): Promise<string[]> {
    const keys = Array.from(this.storage.keys());
    
    if (prefix) {
      return keys.filter(key => key.startsWith(prefix));
    }
    
    return keys;
  }
  
  /**
   * Clear all data (for testing)
   */
  public clear(): void {
    this.storage.clear();
  }
}

/**
 * State manager for agents
 */
export class StateManager {
  private storageProvider: StorageProvider;
  private agentId: string;
  private agentType: string;
  private state: Record<string, any> = {};
  private autoSave: boolean;
  
  /**
   * Create a new state manager
   * @param storageProvider The storage provider to use
   * @param agentId The ID of the agent
   * @param agentType The type of the agent
   * @param autoSave Whether to automatically save on state changes
   */
  constructor(storageProvider: StorageProvider, agentId: string, agentType: string, autoSave: boolean = false) {
    this.storageProvider = storageProvider;
    this.agentId = agentId;
    this.agentType = agentType;
    this.autoSave = autoSave;
  }
  
  /**
   * Get the entire state
   * @returns The state object
   */
  public getState(): Record<string, any> {
    return { ...this.state };
  }
  
  /**
   * Set the entire state
   * @param state The new state
   */
  public async setState(state: Record<string, any>): Promise<void> {
    this.state = { ...state };
    
    if (this.autoSave) {
      await this.saveState();
    }
  }
  
  /**
   * Get a value from the state
   * @param key The key to get
   * @returns The value, or undefined if not found
   */
  public getStateValue<T>(key: string): T | undefined {
    return this.state[key] as T;
  }
  
  /**
   * Set a value in the state
   * @param key The key to set
   * @param value The value to set
   */
  public async setStateValue<T>(key: string, value: T): Promise<void> {
    this.state[key] = value;
    
    if (this.autoSave) {
      await this.saveState();
    }
  }
  
  /**
   * Save the current state
   */
  public async saveState(): Promise<void> {
    const key = this.getStateKey();
    await this.storageProvider.save(key, this.state);
  }
  
  /**
   * Load the state from storage
   */
  public async loadState(): Promise<void> {
    const key = this.getStateKey();
    const state = await this.storageProvider.load(key);
    
    if (state) {
      this.state = state;
    }
  }
  
  /**
   * Reset the state to an empty object
   */
  public async resetState(): Promise<void> {
    this.state = {};
    
    if (this.autoSave) {
      await this.saveState();
    }
  }
  
  /**
   * Create a backup of the current state
   * @param backupName Optional name for the backup
   * @returns The key of the backup
   */
  public async createBackup(backupName?: string): Promise<string> {
    const timestamp = Date.now();
    const name = backupName || `backup-${timestamp}`;
    const key = `${this.getStateKey()}.${name}`;
    
    await this.storageProvider.save(key, this.state);
    return key;
  }
  
  /**
   * Restore a backup
   * @param backupKey The key of the backup to restore
   * @returns Whether the restore was successful
   */
  public async restoreBackup(backupKey: string): Promise<boolean> {
    const state = await this.storageProvider.load(backupKey);
    
    if (!state) {
      return false;
    }
    
    this.state = state;
    
    if (this.autoSave) {
      await this.saveState();
    }
    
    return true;
  }
  
  /**
   * List all backups
   * @returns Array of backup keys
   */
  public async listBackups(): Promise<string[]> {
    const prefix = `${this.getStateKey()}.backup`;
    return await this.storageProvider.list(prefix);
  }
  
  /**
   * Get the key for storing the state
   */
  private getStateKey(): string {
    return `agents.${this.agentType.toLowerCase()}.${this.agentId}`;
  }
} 