# TRON Agent Implementation

This directory contains the implementation of the TRON (Task-Reactive Orchestration Network) agent system.

## Implementation Status

### Core Components
- ✅ Base Agent
- ✅ Message Bus
- ✅ State Persistence
- ✅ Security Module
- ✅ Plugin System
- ✅ Tools System
- ✅ Function Calling
- ❌ MCP Integration

### Testing Infrastructure
- ✅ Base Test Runner
- ✅ Message Bus Tests
- ✅ State Persistence Tests
- ✅ Security Module Tests
- ✅ Plugin System Tests
- ✅ Tools System Tests
- ❌ MCP Integration Tests

### Next Steps
- ❌ MCP Integration
- ✅ Tools System Integration

## Agent Hierarchy

```
BaseAgent
├── MasterAgent
├── DomainAgent
│   └── WorkflowDomainAgent
└── WorkerAgent
    └── TaskWorkerAgent
```

## Communication

Agents can communicate in two ways:

1. **Direct Method Calls** - When agents are in the same process, they can communicate by directly calling methods on each other.
2. **Message Bus** - For distributed communication, agents can publish and subscribe to messages on the MessageBus.

The Message Bus provides:
- Publish/Subscribe pattern for asynchronous communication
- Request/Response pattern for synchronous operations
- Message filtering by type, command, event, or sender
- Subscription management

## Security Framework

The Security Module provides comprehensive security features for the TRON agent system:

1. **Authentication** - Multiple authentication methods supported:
   - API Keys
   - Password-based authentication
   - JWT tokens
   - Certificate-based authentication
   - OAuth integration

2. **Authorization** - Role-based access control (RBAC):
   - Define roles with specific permissions
   - Control access to commands, events, and resources
   - Security levels for different sensitivity levels

3. **Secure Messaging** - Protect sensitive communications:
   - Message signing for integrity verification
   - Payload encryption for sensitive data
   - Authentication token integration in messages

4. **Token Management** - Flexible token handling:
   - Token generation and verification
   - Token revocation
   - Expiration management

5. **Message Bus Integration** - Automatic security for all messages:
   - Transparent encryption/decryption
   - Automatic signature verification
   - Security event logging

## Plugin System

The Plugin System allows extending agent functionality through plugins:

1. **Plugin Architecture** - Modular design for extensibility:
   - Plugins can be dynamically loaded and unloaded
   - Dependency management between plugins
   - Lifecycle hooks for integration with agent events

2. **Plugin API** - Rich interface for plugin developers:
   - Register message handlers
   - Add/remove agent capabilities
   - Manage plugin state and configuration
   - Interact with other plugins

3. **Lifecycle Hooks** - Multiple integration points:
   - Loading/unloading hooks
   - Agent start/stop hooks
   - Message processing hooks
   - State change hooks

4. **State Management** - Persistent plugin state:
   - Plugin state persists across agent restarts
   - Serializable configuration

5. **Security Integration** - Safe plugin execution:
   - Plugins run with controlled permissions
   - Isolated plugin state

## State Management and Persistence

TRON agents can persist their state using the StatePersistence system, which provides:

1. **Storage Providers** - Pluggable storage backends:
   - `FileSystemStorageProvider` - Persists state to the file system
   - `InMemoryStorageProvider` - Stores state in memory (for testing)

2. **StateManager** - Manages state for agents:
   - Get/set entire state or individual values
   - Save/load state to/from storage
   - Create/restore backups
   - Auto-save option for automatic persistence

3. **Hierarchical Keys** - State is organized by agent type and ID

## Tools System

The Tools System provides a flexible and extensible way to integrate various tools and capabilities into the TRON agent ecosystem. It follows a hybrid approach combining capability-based abstraction, protocol-based integration, composability, and a central tool registry.

### Key Features

- **Capability-Based Abstraction**: Agents request capabilities rather than specific tools, allowing for flexible tool substitution and decoupling.
- **Protocol-Based Integration**: Support for various execution protocols (local, HTTP, gRPC, shell, etc.) enables integration with diverse tool implementations.
- **Composable Tools**: Tools can be composed to form more complex workflows, with support for both sequential and parallel execution.
- **Tool Registry**: Central registry for tool discovery and metadata, with support for filtering by category, tags, and capabilities.
- **Security Integration**: Seamless integration with the Security Module for access control and permission management.
- **Plugin Extensibility**: Plugins can register new tools, enhancing the agent's capabilities without modifying core code.

### Architecture

- **Tool Interface**: Standardized interface for all tools, with metadata, execution logic, and lifecycle management.
- **Tool Execution Context**: Context information for each tool execution, including requestor ID, credentials, and execution metadata.
- **Tool Results**: Standardized result format with success/failure status, data, errors, and execution metadata.
- **Composite Tools**: Building complex tools from simpler components, supporting conditional execution and parameter mapping.

### Built-in Tools

The system comes with several built-in tool categories:

- **File System Tools**: Reading, writing, and listing files and directories.
- **Network Tools**: Making HTTP requests and other network operations.
- **System Tools**: Retrieving system information and executing system operations.
- **Data Processing Tools**: JSON parsing and other data transformation operations.

### Usage Example

```typescript
// Get the ToolsSystem instance
const toolsSystem = ToolsSystem.getInstance();

// Execute a tool by ID
const result = await toolsSystem.executeTool('file.read', {
  filePath: '/path/to/file.txt'
});

// Execute a capability (the system will find an appropriate tool)
const httpResult = await toolsSystem.executeCapability('network.request', {
  url: 'https://api.example.com/data'
});

// Create a composite tool for a complex workflow
const compositeTool = toolsSystem.createCompositeTool(
  {
    id: 'process.data',
    name: 'Process Data',
    // ... other metadata
  },
  {
    steps: [
      {
        toolId: 'file.read',
        parameterMapping: { filePath: 'inputPath' }
      },
      {
        toolId: 'data.json.parse',
        parameterMapping: { input: 'step0' }
      }
      // ... more steps
    ]
  }
);
```

## Function Calling

The Function Calling system provides a standardized way for agents to invoke external functions with well-defined parameters, similar to OpenAI's function calling capabilities.

### Key Features

- **OpenAI-Compatible Interface**: Uses a function definition format compatible with OpenAI's function calling API.
- **Registration System**: Allows dynamic registration of functions that can be called by agents.
- **Type Safety**: Provides TypeScript interfaces for function definitions and parameters.
- **Automatic Tool Generation**: Dynamically creates specialized tools for each registered function.
- **Security Integration**: Enforces security levels and authentication for function execution.
- **Function Discovery**: Enables agents to discover available functions and their parameters.

### Architecture

#### Function Definition

Functions are defined using a schema similar to OpenAI's function definitions:

```typescript
interface FunctionDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, ParameterDefinition>;
    required?: string[];
  };
}
```

#### Core Components

1. **Function Calling Tool**: Executes functions by name with provided parameters.
2. **Function Registration Tool**: Registers new functions that can be called.
3. **Function List Tool**: Retrieves the list of available functions and their definitions.
4. **Function Executor**: Pluggable execution mechanism for invoking actual function implementations.

#### Integration with Tools System

The Function Calling system integrates with the Tools System by:

1. Registering specialized tools for each function.
2. Converting function parameters to tool parameters automatically.
3. Delegating execution to the appropriate function executor.

### Usage Examples

#### Registering Functions

```typescript
// Get the function calling tools
const { catalog } = registerFunctionCallingTools();

// Register a new function
const functionRegistrationTool = toolsSystem.getTool('function.register');
await functionRegistrationTool.execute({
  functions: [
    {
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
    }
  ]
});
```

#### Calling Functions

```typescript
// Get the function calling tool
const functionTool = toolsSystem.getTool('function.call');

// Call a function
const result = await functionTool.execute({
  function_name: 'weather.get',
  parameters: {
    location: 'New York, NY',
    units: 'celsius'
  }
});
```

#### Implementing Custom Function Executors

```typescript
// Create a custom function executor
const customExecutor = async (functionName: string, params: any) => {
  if (functionName === 'weather.get') {
    // Actual implementation to get weather data
    return { temperature: 22, condition: 'sunny' };
  }
  throw new Error(`Unknown function: ${functionName}`);
};

// Register function calling tools with custom executor
registerFunctionCallingTools({ functionExecutor: customExecutor });
```

### Testing

To run tests for the Function Calling system:

```
npm run test:tron -- --test=FunctionCallingTest
```

## Running Tests

Tests can be run using the following command:

```bash
npm run test:tron -- --test=<TestName>
```

Where `<TestName>` is one of:
- `MessageBusTest`
- `StatePersistenceTest`
- `SecurityModuleTest`
- `PluginSystemTest`
- `ToolsSystemTest`

## Development Guidelines

1. All agents should extend the appropriate base class (MasterAgent, DomainAgent, or WorkerAgent)
2. Each agent should handle its specific command messages and return appropriate responses
3. Error handling should use the `getErrorMessage` helper to handle unknown error types
4. Each new agent implementation should include corresponding test files
5. For distributed communication, use the MessageBus instead of direct method calls
6. For state that needs to persist across restarts, use the StateManager with a suitable StorageProvider
7. All sensitive operations should use the SecurityModule for authentication and authorization
8. Message payloads containing sensitive information should be encrypted using the SecurityModule
9. For extending agent functionality, use the Plugin System rather than modifying core code
10. When developing plugins, ensure they handle dependencies correctly and use lifecycle hooks appropriately
11. Use the Message Bus for distributed communication instead of direct method calls.
12. Use the State Manager with a suitable StorageProvider for state persistence across restarts.
13. Use the Plugin System to extend functionality without modifying core code.
14. Use the Tools System to provide and consume capabilities, following the capability-based design pattern.
15. When implementing a new tool, make it composable and focused on a single responsibility.
16. Define clear capability names that describe what the tool does, not how it does it.

## Architecture Documents

For detailed architecture information, refer to the following documents in the main TRON directory:

- [Architecture Overview](../Architecture.md)
- [Agent Core](../AgentCore.md)
- [Tools System](../ToolsSystem.md)
- [Workflow Engine](../WorkflowEngine.md)
- [Security Framework](../SecurityFramework.md)
- [Communication Protocol](../CommunicationProtocol.md) 