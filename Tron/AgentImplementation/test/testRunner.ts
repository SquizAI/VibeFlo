/**
 * Test Runner for TRON Agent Implementation
 * 
 * This file provides a simple way to run individual test files for TRON components.
 * Usage: npm run test -- --test=<testname>
 * Example: npm run test -- --test=WorkflowDomainAgentTest
 */

// Extract the test parameter from command line arguments
const args = process.argv.slice(2);
const testArg = args.find(arg => arg.startsWith('--test='));
const testName = testArg ? testArg.split('=')[1] : null;

if (!testName) {
  console.error('Please specify a test to run using --test=<testname>');
  console.log('Available tests:');
  console.log('  - WorkflowDomainAgentTest');
  console.log('  - TaskWorkerAgentTest');
  console.log('  - MessageBusTest');
  console.log('  - StatePersistenceTest');
  console.log('  - SecurityModuleTest');
  console.log('  - PluginSystemTest');
  console.log('  - ToolsSystemTest');
  console.log('  - FunctionCallingTest');
  process.exit(1);
}

async function runTest() {
  try {
    switch (testName) {
      case 'WorkflowDomainAgentTest':
        console.log(`Running test: ${testName}`);
        // Dynamic import to run the test file
        await import('./WorkflowDomainAgentTest.js');
        break;
      case 'TaskWorkerAgentTest':
        console.log(`Running test: ${testName}`);
        // Dynamic import to run the test file
        await import('./TaskWorkerAgentTest.js');
        break;
      case 'MessageBusTest':
        console.log('Running MessageBusTest...');
        await import('./MessageBusTest.js');
        break;
      case 'StatePersistenceTest':
        console.log('Running StatePersistenceTest...');
        await import('./StatePersistenceTest.js');
        break;
      case 'SecurityModuleTest':
        console.log('Running SecurityModuleTest...');
        await import('./SecurityModuleTest.js');
        break;
      case 'PluginSystemTest':
        console.log('Running PluginSystemTest...');
        await import('./PluginSystemTest.js');
        break;
      case 'ToolsSystemTest':
        console.log('Running ToolsSystemTest...');
        const { testToolsSystem } = await import('./ToolsSystemTest.js');
        await testToolsSystem();
        break;
      case 'FunctionCallingTest':
        console.log('Running Function Calling Tests...');
        await import('./FunctionCallingTest.js');
        break;
      default:
        console.error(`Unknown test: ${testName}`);
        console.log('Use one of: MessageBusTest, StatePersistenceTest, SecurityModuleTest, PluginSystemTest, ToolsSystemTest, FunctionCallingTest');
        process.exit(1);
    }
  } catch (error) {
    console.error(`Error running test ${testName}:`, error);
    process.exit(1);
  }
}

runTest(); 