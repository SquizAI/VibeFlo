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
      default:
        console.error(`Unknown test: ${testName}`);
        process.exit(1);
    }
  } catch (error) {
    console.error(`Error running test ${testName}:`, error);
    process.exit(1);
  }
}

runTest(); 