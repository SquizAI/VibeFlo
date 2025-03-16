import { StateManager, InMemoryStorageProvider, FileSystemStorageProvider } from '../StatePersistence';
import { join } from 'path';
import { promises as fs } from 'fs';

/**
 * Test the StatePersistence system
 */
async function testStatePersistence() {
  console.log('Starting StatePersistence test...');
  
  // Test in-memory storage first (easier to test)
  await testInMemoryStorage();
  
  // Then test file system storage
  await testFileSystemStorage();
  
  console.log('StatePersistence test completed');
}

/**
 * Test in-memory storage provider
 */
async function testInMemoryStorage() {
  console.log('\nTesting InMemoryStorageProvider...');
  
  // Create storage provider
  const storageProvider = new InMemoryStorageProvider();
  
  // Create state manager
  const stateManager = new StateManager(storageProvider, 'test-agent-1', 'TEST', false);
  
  // Run the common tests
  await runCommonStateTests(stateManager, storageProvider);
  
  console.log('InMemoryStorageProvider tests completed');
}

/**
 * Test file system storage provider
 */
async function testFileSystemStorage() {
  console.log('\nTesting FileSystemStorageProvider...');
  
  // Create a temporary directory for testing
  const tempDir = join(process.cwd(), 'temp-state-test');
  
  try {
    // Ensure the directory exists
    await fs.mkdir(tempDir, { recursive: true });
    
    // Create storage provider
    const storageProvider = new FileSystemStorageProvider(tempDir);
    
    // Create state manager
    const stateManager = new StateManager(storageProvider, 'test-agent-2', 'TEST', false);
    
    // Run the common tests
    await runCommonStateTests(stateManager, storageProvider);
    
    console.log('FileSystemStorageProvider tests completed');
  } catch (error) {
    console.error('Error in file system storage test:', error);
  } finally {
    // Clean up temporary directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
      console.log(`Cleaned up temporary directory: ${tempDir}`);
    } catch (error) {
      console.error(`Error cleaning up temporary directory: ${error}`);
    }
  }
}

/**
 * Common tests for all storage providers
 */
async function runCommonStateTests(stateManager: StateManager, storageProvider: any) {
  // Test setting and getting state
  console.log('Testing setState/getState...');
  await stateManager.setState({
    testKey: 'testValue',
    nestedObject: {
      key1: 'value1',
      key2: 42
    },
    array: [1, 2, 3]
  });
  
  const state = stateManager.getState();
  console.log('State:', state);
  
  // Test saving and loading state
  console.log('Testing saveState/loadState...');
  await stateManager.saveState();
  
  // Create a new state manager with the same storage provider
  const stateManager2 = new StateManager(storageProvider, 'test-agent-1', 'TEST', false);
  
  // Load the state
  await stateManager2.loadState();
  
  const loadedState = stateManager2.getState();
  console.log('Loaded state:', loadedState);
  
  // Check if loaded state matches original state
  const statesMatch = JSON.stringify(state) === JSON.stringify(loadedState);
  console.log(`States match: ${statesMatch}`);
  
  if (!statesMatch) {
    console.error('ERROR: Loaded state does not match original state');
  }
  
  // Test getting and setting individual values
  console.log('Testing getStateValue/setStateValue...');
  const testValue = stateManager.getStateValue<string>('testKey');
  console.log(`testKey = ${testValue}`);
  
  await stateManager.setStateValue('newKey', 'newValue');
  const newValue = stateManager.getStateValue<string>('newKey');
  console.log(`newKey = ${newValue}`);
  
  // Test creating and restoring backups
  console.log('Testing createBackup/restoreBackup...');
  const backupKey = await stateManager.createBackup('test-backup');
  console.log(`Created backup: ${backupKey}`);
  
  // Change the state
  await stateManager.setStateValue('testKey', 'changedValue');
  console.log(`Changed testKey to: ${stateManager.getStateValue('testKey')}`);
  
  // Restore the backup
  const restored = await stateManager.restoreBackup(backupKey);
  console.log(`Restored backup: ${restored}`);
  console.log(`testKey after restore: ${stateManager.getStateValue('testKey')}`);
  
  // Test listing backups
  const backups = await stateManager.listBackups();
  console.log(`Backups: ${backups.join(', ')}`);
  
  // Test resetting state
  console.log('Testing resetState...');
  await stateManager.resetState();
  console.log('State after reset:', stateManager.getState());
}

// Run the test
testStatePersistence().catch(error => {
  console.error('Error running StatePersistence test:', error);
}); 