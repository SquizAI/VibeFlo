import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import { 
  ToolsSystem,
  Tool,
  ToolMetadata,
  ToolProtocol,
  ToolContext,
  ToolResult,
  CompositeToolPlan
} from '../ToolsSystem';
import { SecurityModule, SecurityLevel, Credentials, AuthMethod } from '../SecurityModule';
import { registerBasicTools } from '../BasicTools';

/**
 * Test for ToolsSystem
 */
export async function testToolsSystem(): Promise<void> {
  console.log('Running Tools System Tests...');
  
  // Run core functionality tests
  await testCoreToolsSystem();
  
  // Run basic tools tests
  await testBasicTools();
  
  // Run capability-based tests
  await testCapabilityBasedTools();
  
  // Run composite tools tests
  await testCompositeTools();
  
  // Run security integration tests
  await testSecurityIntegration();
  
  console.log('All Tools System Tests Completed Successfully!');
}

/**
 * Test the core Tools System functionality
 */
async function testCoreToolsSystem(): Promise<void> {
  console.log('  Testing core ToolsSystem functionality...');
  
  // Get the singleton instance
  const toolsSystem = ToolsSystem.getInstance();
  
  // Create a test tool
  const testTool = createTestTool();
  
  // Register the tool
  toolsSystem.registerTool(testTool);
  
  // Test tool discovery
  const discoveredTools = toolsSystem.discoverTools();
  assertEquals(
    discoveredTools.some(t => t.id === 'test.tool'),
    true,
    'Should discover registered tool'
  );
  
  // Test filtering by category
  const filteredByCategory = toolsSystem.discoverTools({ category: 'Test' });
  assertEquals(
    filteredByCategory.length > 0 && filteredByCategory.every(t => t.category === 'Test'),
    true,
    'Should filter tools by category'
  );
  
  // Test filtering by tag
  const filteredByTag = toolsSystem.discoverTools({ tags: ['unit-test'] });
  assertEquals(
    filteredByTag.length > 0 && filteredByTag.every(t => t.tags.includes('unit-test')),
    true,
    'Should filter tools by tag'
  );
  
  // Test filtering by capability
  const filteredByCapability = toolsSystem.discoverTools({ capabilities: ['test.execute'] });
  assertEquals(
    filteredByCapability.length > 0 && 
    filteredByCapability.every(t => t.capabilities.includes('test.execute')),
    true,
    'Should filter tools by capability'
  );
  
  // Test tool execution
  const result = await toolsSystem.executeTool('test.tool', { value: 'test' });
  assertEquals(result.success, true, 'Tool execution should succeed');
  assertEquals(result.data.result, 'Processed: test', 'Tool should process data correctly');
  
  // Test unregistering tool
  const unregistered = toolsSystem.unregisterTool('test.tool');
  assertEquals(unregistered, true, 'Should unregister tool successfully');
  
  // Verify tool is no longer discoverable
  const postUnregisterTools = toolsSystem.discoverTools();
  assertEquals(
    postUnregisterTools.some(t => t.id === 'test.tool'),
    false,
    'Unregistered tool should not be discoverable'
  );
  
  console.log('  Core ToolsSystem functionality tests passed!');
}

/**
 * Test the basic tools functionality
 */
async function testBasicTools(): Promise<void> {
  console.log('  Testing basic tools functionality...');
  
  // Register the basic tools
  registerBasicTools();
  
  const toolsSystem = ToolsSystem.getInstance();
  
  // Test JSON Parser tool
  const jsonResult = await toolsSystem.executeTool('data.json.parse', {
    input: '{"name":"test","value":123}'
  });
  
  assertEquals(jsonResult.success, true, 'JSON parser should succeed');
  assertEquals(jsonResult.data.name, 'test', 'JSON parser should parse correctly');
  assertEquals(jsonResult.data.value, 123, 'JSON parser should parse numbers correctly');
  
  // Test System Info tool
  const sysInfoResult = await toolsSystem.executeTool('system.info', {
    includeCpu: true,
    includeMemory: true,
    includeNetwork: false
  });
  
  assertEquals(sysInfoResult.success, true, 'System info tool should succeed');
  assertEquals(typeof sysInfoResult.data.platform, 'string', 'System info should return platform');
  assertEquals(typeof sysInfoResult.data.hostname, 'string', 'System info should return hostname');
  
  // Create a temporary file for testing file operations
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tools-test-'));
  const testFilePath = path.join(tempDir, 'test-file.txt');
  const testContent = 'Hello Tools System!';
  
  try {
    // Test Write File tool
    const writeResult = await toolsSystem.executeTool('file.write', {
      filePath: testFilePath,
      content: testContent
    });
    
    assertEquals(writeResult.success, true, 'Write file tool should succeed');
    assertEquals(writeResult.data, true, 'Write file tool should return true on success');
    
    // Test Read File tool
    const readResult = await toolsSystem.executeTool('file.read', {
      filePath: testFilePath
    });
    
    assertEquals(readResult.success, true, 'Read file tool should succeed');
    assertEquals(readResult.data, testContent, 'Read file tool should return correct content');
    
    // Test List Directory tool
    const listResult = await toolsSystem.executeTool('file.list', {
      directoryPath: tempDir
    });
    
    assertEquals(listResult.success, true, 'List directory tool should succeed');
    assertEquals(
      listResult.data.some((file: any) => file.name === 'test-file.txt'),
      true,
      'List directory should find the test file'
    );
  } finally {
    // Clean up
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Failed to clean up temp directory:', error);
    }
  }
  
  console.log('  Basic tools functionality tests passed!');
}

/**
 * Test the capability-based tools functionality
 */
async function testCapabilityBasedTools(): Promise<void> {
  console.log('  Testing capability-based tools functionality...');
  
  const toolsSystem = ToolsSystem.getInstance();
  
  // Create two tools that provide the same capability
  const toolA = createCapabilityTool('tool.a', SecurityLevel.LOW);
  const toolB = createCapabilityTool('tool.b', SecurityLevel.MEDIUM);
  
  // Register both tools
  toolsSystem.registerTool(toolA);
  toolsSystem.registerTool(toolB);
  
  // Test capabilities discovery
  const capabilities = toolsSystem.discoverCapabilities();
  assertEquals(
    capabilities.some(c => c.id === 'capability.process'),
    true,
    'Should discover registered capability'
  );
  
  // Test capability execution (should use tool A due to lower security level)
  const result = await toolsSystem.executeCapability('capability.process', { data: 'capability-test' });
  
  assertEquals(result.success, true, 'Capability execution should succeed');
  assertEquals(
    result.data.toolId, 
    'tool.a', 
    'Should use the tool with the lowest security level'
  );
  
  // Unregister tools
  toolsSystem.unregisterTool('tool.a');
  toolsSystem.unregisterTool('tool.b');
  
  console.log('  Capability-based tools tests passed!');
}

/**
 * Test the composite tools functionality
 */
async function testCompositeTools(): Promise<void> {
  console.log('  Testing composite tools functionality...');
  
  const toolsSystem = ToolsSystem.getInstance();
  
  // Register helper tools for the composite test
  const stringifyTool = createStringifyTool();
  const uppercaseTool = createUppercaseTool();
  const lengthTool = createLengthTool();
  
  toolsSystem.registerTool(stringifyTool);
  toolsSystem.registerTool(uppercaseTool);
  toolsSystem.registerTool(lengthTool);
  
  // Create a composite tool plan
  const plan: CompositeToolPlan = {
    steps: [
      {
        toolId: 'test.stringify',
        parameterMapping: {
          value: 'input'
        },
        resultMapping: 'result'
      },
      {
        toolId: 'test.uppercase',
        parameterMapping: {
          text: 'step0'
        }
      },
      {
        toolId: 'test.length',
        parameterMapping: {
          text: 'step1'
        }
      }
    ]
  };
  
  // Create the composite tool
  const compositeTool = toolsSystem.createCompositeTool(
    {
      id: 'test.composite',
      name: 'Composite Test Tool',
      description: 'A composite tool that stringifies, uppercases, and calculates length',
      version: '1.0.0',
      category: 'Test',
      tags: ['test', 'composite'],
      parameters: [
        {
          name: 'input',
          type: 'object',
          description: 'The input object to process',
          required: true
        }
      ],
      returns: {
        type: 'number',
        description: 'The length of the uppercased stringified input'
      },
      requiresAuth: false,
      minSecurityLevel: SecurityLevel.LOW,
      capabilities: ['test.process']
    },
    plan
  );
  
  // Test the composite tool
  const input = { name: 'test', value: 42 };
  const expected = JSON.stringify(input).toUpperCase().length;
  
  const result = await toolsSystem.executeTool('test.composite', { input });
  
  assertEquals(result.success, true, 'Composite tool execution should succeed');
  assertEquals(result.data.step2, expected, 'Composite tool should process data correctly');
  
  // Test a parallel composite tool
  const parallelPlan: CompositeToolPlan = {
    steps: [
      {
        toolId: 'test.stringify',
        parameterMapping: {
          value: 'input'
        }
      },
      {
        toolId: 'test.uppercase',
        parameterMapping: {
          text: 'input'
        }
      },
      {
        toolId: 'test.length',
        parameterMapping: {
          text: 'input'
        }
      }
    ],
    parallel: true
  };
  
  // Create the parallel composite tool
  const parallelTool = toolsSystem.createCompositeTool(
    {
      id: 'test.parallel',
      name: 'Parallel Test Tool',
      description: 'A composite tool that runs steps in parallel',
      version: '1.0.0',
      category: 'Test',
      tags: ['test', 'composite', 'parallel'],
      parameters: [
        {
          name: 'input',
          type: 'string',
          description: 'The input string to process',
          required: true
        }
      ],
      returns: {
        type: 'object',
        description: 'The results of parallel processing'
      },
      requiresAuth: false,
      minSecurityLevel: SecurityLevel.LOW,
      capabilities: ['test.parallel']
    },
    parallelPlan
  );
  
  // Test the parallel composite tool
  const parallelResult = await toolsSystem.executeTool('test.parallel', { input: 'test' });
  
  assertEquals(parallelResult.success, true, 'Parallel composite tool execution should succeed');
  assertEquals(typeof parallelResult.data.step0, 'string', 'Step 0 should return a string');
  assertEquals(parallelResult.data.step1, 'TEST', 'Step 1 should return uppercased text');
  assertEquals(parallelResult.data.step2, 4, 'Step 2 should return the length');
  
  // Clean up
  toolsSystem.unregisterTool('test.stringify');
  toolsSystem.unregisterTool('test.uppercase');
  toolsSystem.unregisterTool('test.length');
  toolsSystem.unregisterTool('test.composite');
  toolsSystem.unregisterTool('test.parallel');
  
  console.log('  Composite tools tests passed!');
}

/**
 * Test the security integration
 */
async function testSecurityIntegration(): Promise<void> {
  console.log('  Testing security integration...');
  
  const toolsSystem = ToolsSystem.getInstance();
  
  // Get the security module singleton instance
  const securityModule = SecurityModule.getInstance();
  
  // Set the security module
  toolsSystem.setSecurityModule(securityModule);
  
  // Create a secure tool that requires high security level
  const secureTool = createSecureTool();
  toolsSystem.registerTool(secureTool);
  
  // Create credentials with different security levels
  const lowCreds: Credentials = {
    id: 'low-cred-id',
    authMethod: AuthMethod.NONE,
    authData: null,
    securityLevel: SecurityLevel.LOW,
    roles: ['user']
  };
  
  const highCreds: Credentials = {
    id: 'high-cred-id',
    authMethod: AuthMethod.NONE,
    authData: null,
    securityLevel: SecurityLevel.HIGH,
    roles: ['admin']
  };
  
  // Test execution with insufficient security level
  const lowSecResult = await toolsSystem.executeTool(
    'test.secure',
    { action: 'read' },
    {
      requesterInfo: {
        id: 'test-user',
        credentials: lowCreds
      }
    }
  );
  
  assertEquals(lowSecResult.success, false, 'Should fail with insufficient security level');
  assertEquals(
    lowSecResult.error?.code,
    'INSUFFICIENT_SECURITY_LEVEL',
    'Error code should indicate security level issue'
  );
  
  // Test execution with sufficient security level
  const highSecResult = await toolsSystem.executeTool(
    'test.secure',
    { action: 'read' },
    {
      requesterInfo: {
        id: 'test-user',
        credentials: highCreds
      }
    }
  );
  
  assertEquals(highSecResult.success, true, 'Should succeed with sufficient security level');
  
  // Test execution without providing credentials
  const noCredsResult = await toolsSystem.executeTool(
    'test.secure',
    { action: 'read' }
  );
  
  assertEquals(noCredsResult.success, false, 'Should fail without credentials');
  assertEquals(
    noCredsResult.error?.code,
    'AUTHENTICATION_REQUIRED',
    'Error code should indicate authentication requirement'
  );
  
  // Clean up
  toolsSystem.unregisterTool('test.secure');
  
  console.log('  Security integration tests passed!');
}

/**
 * Helper function to create a test tool
 */
function createTestTool(): Tool<{ value: string }, { result: string }> {
  return {
    metadata: {
      id: 'test.tool',
      name: 'Test Tool',
      description: 'A tool for testing',
      version: '1.0.0',
      category: 'Test',
      tags: ['test', 'unit-test'],
      parameters: [
        {
          name: 'value',
          type: 'string',
          description: 'The value to process',
          required: true
        }
      ],
      returns: {
        type: 'object',
        description: 'The processed result'
      },
      protocolInfo: {
        protocol: ToolProtocol.LOCAL,
        config: {}
      },
      requiresAuth: false,
      minSecurityLevel: SecurityLevel.LOW,
      capabilities: ['test.execute']
    },
    initialized: true,
    execute: async (params: { value: string }): Promise<{ result: string }> => {
      return { result: `Processed: ${params.value}` };
    }
  };
}

/**
 * Helper function to create tools that provide the same capability
 */
function createCapabilityTool(id: string, securityLevel: SecurityLevel): Tool {
  return {
    metadata: {
      id,
      name: `Capability Tool ${id}`,
      description: `A tool that provides the process capability with security level ${securityLevel}`,
      version: '1.0.0',
      category: 'Test',
      tags: ['test', 'capability'],
      parameters: [
        {
          name: 'data',
          type: 'string',
          description: 'The data to process',
          required: true
        }
      ],
      returns: {
        type: 'object',
        description: 'The processed result with tool identifier'
      },
      protocolInfo: {
        protocol: ToolProtocol.LOCAL,
        config: {}
      },
      requiresAuth: false,
      minSecurityLevel: securityLevel,
      capabilities: ['capability.process']
    },
    initialized: true,
    execute: async (params: { data: string }): Promise<{ toolId: string, processed: string }> => {
      return { 
        toolId: id,
        processed: `Processed by ${id}: ${params.data}`
      };
    }
  };
}

/**
 * Helper function to create a secure tool
 */
function createSecureTool(): Tool<{ action: string }, { result: string }> {
  return {
    metadata: {
      id: 'test.secure',
      name: 'Secure Tool',
      description: 'A tool that requires authentication and high security level',
      version: '1.0.0',
      category: 'Security',
      tags: ['test', 'security'],
      parameters: [
        {
          name: 'action',
          type: 'string',
          description: 'The action to perform',
          required: true,
          enum: ['read', 'write', 'delete']
        }
      ],
      returns: {
        type: 'object',
        description: 'The action result'
      },
      protocolInfo: {
        protocol: ToolProtocol.LOCAL,
        config: {}
      },
      requiresAuth: true,
      minSecurityLevel: SecurityLevel.HIGH,
      capabilities: ['security.test']
    },
    initialized: true,
    execute: async (params: { action: string }): Promise<{ result: string }> => {
      return { result: `Secure action ${params.action} performed` };
    }
  };
}

/**
 * Helper function to create a tool that stringifies objects
 */
function createStringifyTool(): Tool<{ value: any }, string> {
  return {
    metadata: {
      id: 'test.stringify',
      name: 'Stringify Tool',
      description: 'Converts an object to a JSON string',
      version: '1.0.0',
      category: 'Test',
      tags: ['test', 'string', 'json'],
      parameters: [
        {
          name: 'value',
          type: 'object',
          description: 'The value to stringify',
          required: true
        }
      ],
      returns: {
        type: 'string',
        description: 'The stringified value'
      },
      protocolInfo: {
        protocol: ToolProtocol.LOCAL,
        config: {}
      },
      requiresAuth: false,
      minSecurityLevel: SecurityLevel.LOW,
      capabilities: ['string.stringify']
    },
    initialized: true,
    execute: async (params: { value: any }): Promise<string> => {
      return JSON.stringify(params.value);
    }
  };
}

/**
 * Helper function to create a tool that converts text to uppercase
 */
function createUppercaseTool(): Tool<{ text: string }, string> {
  return {
    metadata: {
      id: 'test.uppercase',
      name: 'Uppercase Tool',
      description: 'Converts text to uppercase',
      version: '1.0.0',
      category: 'Test',
      tags: ['test', 'string', 'uppercase'],
      parameters: [
        {
          name: 'text',
          type: 'string',
          description: 'The text to convert',
          required: true
        }
      ],
      returns: {
        type: 'string',
        description: 'The uppercase text'
      },
      protocolInfo: {
        protocol: ToolProtocol.LOCAL,
        config: {}
      },
      requiresAuth: false,
      minSecurityLevel: SecurityLevel.LOW,
      capabilities: ['string.transform']
    },
    initialized: true,
    execute: async (params: { text: string }): Promise<string> => {
      return params.text.toUpperCase();
    }
  };
}

/**
 * Helper function to create a tool that measures string length
 */
function createLengthTool(): Tool<{ text: string }, number> {
  return {
    metadata: {
      id: 'test.length',
      name: 'Length Tool',
      description: 'Measures the length of a string',
      version: '1.0.0',
      category: 'Test',
      tags: ['test', 'string', 'length'],
      parameters: [
        {
          name: 'text',
          type: 'string',
          description: 'The text to measure',
          required: true
        }
      ],
      returns: {
        type: 'number',
        description: 'The length of the text'
      },
      protocolInfo: {
        protocol: ToolProtocol.LOCAL,
        config: {}
      },
      requiresAuth: false,
      minSecurityLevel: SecurityLevel.LOW,
      capabilities: ['string.analyze']
    },
    initialized: true,
    execute: async (params: { text: string }): Promise<number> => {
      return params.text.length;
    }
  };
}

/**
 * Assertion helper
 */
function assertEquals<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`Assertion failed: ${message}\nExpected: ${expected}\nActual: ${actual}`);
  }
} 