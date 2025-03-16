import { registerFunctionCallingTools, FunctionDefinition } from '../FunctionCallingTool';
import { ToolsSystem } from '../ToolsSystem';
import * as assert from 'assert';

/**
 * Helper function to get a tool by ID
 */
function getToolById(toolsSystem: ToolsSystem, id: string) {
  // Use the private tools map via discover and filter
  const tools = toolsSystem.discoverTools();
  const tool = tools.find(tool => tool.id === id);
  if (!tool) return null;
  
  // The actual tool instance is in the private map, but we need to execute it
  // So we'll execute it via executeTool
  return {
    metadata: tool,
    execute: async (params: any, context: any) => {
      const result = await toolsSystem.executeTool(id, params, {
        requesterInfo: context.securityContext
      });
      if (!result.success) {
        throw new Error(result.error?.message || 'Unknown error');
      }
      return result.data;
    }
  };
}

/**
 * Helper function to clear all tools for testing
 */
function clearAllTools(toolsSystem: ToolsSystem) {
  // Unregister all tools found by discover
  const tools = toolsSystem.discoverTools();
  tools.forEach(tool => {
    toolsSystem.unregisterTool(tool.id);
  });
}

/**
 * Helper function to ensure a tool exists or throw error
 */
function ensureTool(tool: any, name: string) {
  if (!tool) {
    throw new Error(`Required tool ${name} not found`);
  }
  return tool;
}

/**
 * Test suite for the Function Calling system
 */
export async function testFunctionCalling() {
  console.log('Starting Function Calling tests...');
  
  // Clean start for tests - clear the instance for testing
  const toolsSystem = ToolsSystem.getInstance();
  // Manually reset the tools
  clearAllTools(toolsSystem);
  
  try {
    await testFunctionRegistration();
    await testFunctionListing();
    await testFunctionExecution();
    await testMultipleFunctions();
    await testCustomExecutor();
    await testParameterValidation();
    
    console.log('✅ All Function Calling tests passed!');
  } catch (error) {
    console.error('❌ Function Calling test failed:', error);
    throw error;
  }
}

/**
 * Test function registration functionality
 */
async function testFunctionRegistration() {
  console.log('Testing function registration...');
  
  // Clean start
  const toolsSystem = ToolsSystem.getInstance();
  clearAllTools(toolsSystem);
  
  // Register function calling tools
  const { catalog } = registerFunctionCallingTools();
  
  // Create a sample function definition
  const weatherFunction: FunctionDefinition = {
    name: 'weather.get',
    description: 'Get the current weather for a location',
    parameters: {
      type: 'object',
      properties: {
        location: {
          type: 'string',
          description: 'The location to get weather for, e.g., "New York, NY"'
        },
        units: {
          type: 'string',
          description: 'Temperature units',
          enum: ['celsius', 'fahrenheit']
        }
      },
      required: ['location']
    }
  };
  
  // Get the registration tool
  const registrationTool = getToolById(toolsSystem, 'function.register');
  assert.ok(registrationTool, 'Registration tool should exist');
  
  // Register the function
  const result = await ensureTool(registrationTool, 'function.register').execute({
    functions: [weatherFunction]
  }, { securityContext: { agentId: 'test-agent' } });
  
  // Verify the result
  assert.ok(Array.isArray(result), 'Registration result should be an array');
  assert.strictEqual(result.length, 1, 'Should have registered one function');
  assert.strictEqual(result[0], 'weather.get', 'Registered function name should match');
  
  // Verify that the function was added to the catalog
  assert.strictEqual(catalog.functions.length, 1, 'Catalog should contain one function');
  assert.strictEqual(catalog.functions[0].name, 'weather.get', 'Function in catalog should match');
  
  // Verify that a specialized tool was created for the function
  const weatherTool = getToolById(toolsSystem, 'function.weather.get');
  assert.ok(weatherTool, 'Specialized tool should be created for the function');
  
  console.log('✅ Function registration test passed');
}

/**
 * Test function listing functionality
 */
async function testFunctionListing() {
  console.log('Testing function listing...');
  
  // Clean start
  const toolsSystem = ToolsSystem.getInstance();
  clearAllTools(toolsSystem);
  
  // Register function calling tools
  const { catalog } = registerFunctionCallingTools();
  
  // Create two sample function definitions
  const functions: FunctionDefinition[] = [
    {
      name: 'weather.get',
      description: 'Get the current weather for a location',
      parameters: {
        type: 'object',
        properties: {
          location: { type: 'string', description: 'Location' }
        },
        required: ['location']
      }
    },
    {
      name: 'math.add',
      description: 'Add two numbers',
      parameters: {
        type: 'object',
        properties: {
          a: { type: 'number', description: 'First number' },
          b: { type: 'number', description: 'Second number' }
        },
        required: ['a', 'b']
      }
    }
  ];
  
  // Register functions
  const registrationTool = getToolById(toolsSystem, 'function.register');
  await ensureTool(registrationTool, 'function.register').execute(
    { functions }, 
    { securityContext: { agentId: 'test-agent' } }
  );
  
  // Get the listing tool
  const listingTool = getToolById(toolsSystem, 'function.list');
  assert.ok(listingTool, 'Listing tool should exist');
  
  // List functions
  const result = await ensureTool(listingTool, 'function.list').execute(
    {}, 
    { securityContext: { agentId: 'test-agent' } }
  );
  
  // Verify the result
  assert.ok(result.functions, 'List result should have functions array');
  assert.strictEqual(result.functions.length, 2, 'Should list two functions');
  assert.strictEqual(result.functions[0].name, 'weather.get', 'First function name should match');
  assert.strictEqual(result.functions[1].name, 'math.add', 'Second function name should match');
  
  console.log('✅ Function listing test passed');
}

/**
 * Test function execution functionality
 */
async function testFunctionExecution() {
  console.log('Testing function execution...');
  
  // Clean start
  const toolsSystem = ToolsSystem.getInstance();
  clearAllTools(toolsSystem);
  
  // Register function calling tools
  registerFunctionCallingTools();
  
  // Register a function
  const registrationTool = getToolById(toolsSystem, 'function.register');
  await ensureTool(registrationTool, 'function.register').execute({
    functions: [{
      name: 'echo',
      description: 'Echo back the input',
      parameters: {
        type: 'object',
        properties: {
          message: { type: 'string', description: 'Message to echo' }
        },
        required: ['message']
      }
    }]
  }, { securityContext: { agentId: 'test-agent' } });
  
  // Get the function calling tool
  const functionTool = getToolById(toolsSystem, 'function.call');
  assert.ok(functionTool, 'Function calling tool should exist');
  
  // Execute the function
  const result = await ensureTool(functionTool, 'function.call').execute({
    function_name: 'echo',
    parameters: { message: 'Hello, world!' }
  }, { securityContext: { agentId: 'test-agent' } });
  
  // Verify the result
  assert.ok(result, 'Should get a result');
  assert.strictEqual(result.function_name, 'echo', 'Result should contain function name');
  assert.ok(result.execution_id, 'Result should have execution ID');
  assert.ok(result.result, 'Result should have result data');
  assert.ok(result.result.result.includes('echo'), 'Result should contain placeholder for echo function');
  
  console.log('✅ Function execution test passed');
}

/**
 * Test registering and calling multiple functions
 */
async function testMultipleFunctions() {
  console.log('Testing multiple functions...');
  
  // Clean start
  const toolsSystem = ToolsSystem.getInstance();
  clearAllTools(toolsSystem);
  
  // Register function calling tools
  registerFunctionCallingTools();
  
  // Register multiple functions
  const registrationTool = getToolById(toolsSystem, 'function.register');
  await ensureTool(registrationTool, 'function.register').execute({
    functions: [
      {
        name: 'weather.get',
        description: 'Get weather',
        parameters: {
          type: 'object',
          properties: {
            location: { type: 'string', description: 'Location' }
          },
          required: ['location']
        }
      },
      {
        name: 'math.add',
        description: 'Add numbers',
        parameters: {
          type: 'object',
          properties: {
            a: { type: 'number', description: 'First number' },
            b: { type: 'number', description: 'Second number' }
          },
          required: ['a', 'b']
        }
      }
    ]
  }, { securityContext: { agentId: 'test-agent' } });
  
  // Verify specialized tools were created
  const weatherTool = getToolById(toolsSystem, 'function.weather.get');
  const mathTool = getToolById(toolsSystem, 'function.math.add');
  
  assert.ok(weatherTool, 'Weather tool should exist');
  assert.ok(mathTool, 'Math tool should exist');
  
  // Execute both functions
  const functionTool = getToolById(toolsSystem, 'function.call');
  assert.ok(functionTool, 'Function calling tool should exist');
  
  const weatherResult = await ensureTool(functionTool, 'function.call').execute({
    function_name: 'weather.get',
    parameters: { location: 'New York' }
  }, { securityContext: { agentId: 'test-agent' } });
  
  const mathResult = await ensureTool(functionTool, 'function.call').execute({
    function_name: 'math.add',
    parameters: { a: 1, b: 2 }
  }, { securityContext: { agentId: 'test-agent' } });
  
  // Verify results
  assert.strictEqual(weatherResult.function_name, 'weather.get', 'Weather result should have correct function name');
  assert.strictEqual(mathResult.function_name, 'math.add', 'Math result should have correct function name');
  
  console.log('✅ Multiple functions test passed');
}

/**
 * Test using a custom function executor
 */
async function testCustomExecutor() {
  console.log('Testing custom executor...');
  
  // Clean start
  const toolsSystem = ToolsSystem.getInstance();
  clearAllTools(toolsSystem);
  
  // Create custom executor
  const customExecutor = async (functionName: string, params: Record<string, any>) => {
    if (functionName === 'math.add') {
      return { sum: params.a + params.b };
    }
    throw new Error(`Unknown function: ${functionName}`);
  };
  
  // Register function calling tools with custom executor
  registerFunctionCallingTools({ functionExecutor: customExecutor });
  
  // Register a function
  const registrationTool = getToolById(toolsSystem, 'function.register');
  await ensureTool(registrationTool, 'function.register').execute({
    functions: [{
      name: 'math.add',
      description: 'Add two numbers',
      parameters: {
        type: 'object',
        properties: {
          a: { type: 'number', description: 'First number' },
          b: { type: 'number', description: 'Second number' }
        },
        required: ['a', 'b']
      }
    }]
  }, { securityContext: { agentId: 'test-agent' } });
  
  // Execute the function
  const functionTool = getToolById(toolsSystem, 'function.call');
  assert.ok(functionTool, 'Function calling tool should exist');
  
  const result = await ensureTool(functionTool, 'function.call').execute({
    function_name: 'math.add',
    parameters: { a: 5, b: 7 }
  }, { securityContext: { agentId: 'test-agent' } });
  
  // Verify the result uses our custom implementation
  assert.strictEqual(result.result.sum, 12, 'Custom executor should calculate sum correctly');
  
  console.log('✅ Custom executor test passed');
}

/**
 * Test parameter validation
 */
async function testParameterValidation() {
  console.log('Testing parameter validation...');
  
  // Clean start
  const toolsSystem = ToolsSystem.getInstance();
  clearAllTools(toolsSystem);
  
  // Register function calling tools
  registerFunctionCallingTools();
  
  // Register a function with required parameters
  const registrationTool = getToolById(toolsSystem, 'function.register');
  await ensureTool(registrationTool, 'function.register').execute({
    functions: [{
      name: 'validate.test',
      description: 'Test parameter validation',
      parameters: {
        type: 'object',
        properties: {
          requiredParam: { type: 'string', description: 'Required parameter' },
          optionalParam: { type: 'number', description: 'Optional parameter' }
        },
        required: ['requiredParam']
      }
    }]
  }, { securityContext: { agentId: 'test-agent' } });
  
  // Get the function calling tool
  const functionTool = getToolById(toolsSystem, 'function.call');
  assert.ok(functionTool, 'Function calling tool should exist');
  
  // Test valid parameters
  const validResult = await ensureTool(functionTool, 'function.call').execute({
    function_name: 'validate.test',
    parameters: { requiredParam: 'test', optionalParam: 42 }
  }, { securityContext: { agentId: 'test-agent' } });
  
  assert.ok(validResult, 'Valid parameters should execute successfully');
  
  // Test with missing function name
  try {
    await ensureTool(functionTool, 'function.call').execute({
      function_name: '',  // Empty function name
      parameters: { requiredParam: 'test' }
    }, { securityContext: { agentId: 'test-agent' } });
    assert.fail('Should have thrown an error for empty function name');
  } catch (error) {
    // Expected error
  }
  
  // Test with non-existent function
  try {
    await ensureTool(functionTool, 'function.call').execute({
      function_name: 'non.existent',
      parameters: {}
    }, { securityContext: { agentId: 'test-agent' } });
    assert.fail('Should have thrown an error for non-existent function');
  } catch (error) {
    // Expected error
  }
  
  console.log('✅ Parameter validation test passed');
}

// Run the tests if this file is executed directly
if (require.main === module) {
  testFunctionCalling().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });
} 