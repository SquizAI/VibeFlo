# TRON Workflow Engine

## Overview

The Workflow Engine is a central component of the TRON architecture that enables the definition, execution, and management of complex workflows. This document details the Workflow Engine architecture, components, and implementation guidelines.

## Core Concepts

### What is a Workflow?

In the TRON system, a "workflow" is a directed graph of interconnected nodes that defines a process to be executed. Workflows provide:

- **Visual Representation**: Workflows can be visualized and edited as node graphs
- **Automation**: Workflows automate multi-step processes
- **Orchestration**: Workflows coordinate the execution of tools and services
- **State Management**: Workflows maintain execution state
- **Error Handling**: Workflows include built-in error handling and recovery
- **Reusability**: Workflows can be shared, versioned, and reused

### Workflow Structure

A workflow consists of:

```
┌───────────────────────────────────────────────────────────┐
│                    Workflow Definition                     │
├───────────────────────────────────────────────────────────┤
│ Metadata                                                  │
│   - ID, Name, Description                                 │
│   - Version, Category, Tags                               │
│   - Author, Status                                        │
├───────────────────────────────────────────────────────────┤
│ Nodes                                                     │
│   - Trigger Nodes                                         │
│   - Action Nodes                                          │
│   - Condition Nodes                                       │
│   - Transformation Nodes                                  │
│   - Subworkflow Nodes                                     │
├───────────────────────────────────────────────────────────┤
│ Edges                                                     │
│   - Node Connections                                      │
│   - Data Flow                                             │
│   - Condition Paths                                       │
├───────────────────────────────────────────────────────────┤
│ Configuration                                             │
│   - Input Parameters                                      │
│   - Global Variables                                      │
│   - Error Handling                                        │
│   - Execution Settings                                    │
└───────────────────────────────────────────────────────────┘
```

### Node Types

Workflows support various node types:

1. **Trigger Nodes**: Initiate workflow execution based on events
2. **Action Nodes**: Execute operations, often wrapping tool calls
3. **Condition Nodes**: Control flow based on conditions
4. **Transformation Nodes**: Transform data between nodes
5. **Subworkflow Nodes**: Execute nested workflows
6. **Loop Nodes**: Iterate over collections of data
7. **Wait Nodes**: Pause workflow execution for events or time
8. **End Nodes**: Terminate workflow execution

### Edge Types

Edges connect nodes and define the flow of execution:

1. **Sequence Edges**: Standard execution flow between nodes
2. **Condition Edges**: Paths taken based on conditions
3. **Error Edges**: Paths taken when errors occur
4. **Data Edges**: Define data dependencies between nodes
5. **Event Edges**: Connect event emitters and handlers

## Workflow Definition

### Workflow Metadata

Each workflow includes metadata for discovery and management:

```typescript
interface WorkflowMetadata {
  id: string;                  // Unique workflow identifier
  name: string;                // Human-readable name
  description: string;         // Description of what the workflow does
  version: string;             // Semantic version (major.minor.patch)
  category: WorkflowCategory;  // Workflow category
  tags: string[];              // Search tags
  author: string;              // Workflow author
  created: number;             // Creation timestamp
  updated: number;             // Last update timestamp
  status: WorkflowStatus;      // DRAFT, PUBLISHED, DEPRECATED, etc.
  icon?: string;               // Icon identifier or URL
  documentationUrl?: string;   // URL to documentation
}
```

### Node Definition

Nodes are the building blocks of workflows:

```typescript
interface WorkflowNode {
  id: string;                  // Unique node identifier within workflow
  type: NodeType;              // Node type (TRIGGER, ACTION, CONDITION, etc.)
  label: string;               // Human-readable label
  description?: string;        // Optional description
  position: {                  // Visual position in the editor
    x: number;
    y: number;
  };
  
  // Node type-specific properties
  config: Record<string, any>; // Node configuration
  
  // For ACTION nodes
  tool?: string;               // Tool ID for action nodes
  parameters?: Record<string, any> | string; // Tool parameters or template
  
  // For CONDITION nodes
  condition?: string;          // Condition expression
  
  // For TRANSFORMATION nodes
  transformation?: string;     // Transformation expression
  
  // Visual properties
  style?: Record<string, any>; // Visual styling properties
}
```

### Edge Definition

Edges connect nodes in the workflow:

```typescript
interface WorkflowEdge {
  id: string;                  // Unique edge identifier within workflow
  type: EdgeType;              // Edge type (SEQUENCE, CONDITION, ERROR, etc.)
  source: string;              // Source node ID
  target: string;              // Target node ID
  sourceHandle?: string;       // Optional handle on source node
  targetHandle?: string;       // Optional handle on target node
  
  // For CONDITION edges
  condition?: string;          // Condition for condition edges
  
  // For DATA edges
  sourceField?: string;        // Source field for data edges
  targetField?: string;        // Target field for data edges
  transformation?: string;     // Optional data transformation
  
  // Visual properties
  label?: string;              // Optional edge label
  style?: Record<string, any>; // Visual styling properties
}
```

### Workflow Configuration

Configuration specifies how the workflow operates:

```typescript
interface WorkflowConfiguration {
  // Input parameters
  parameters: {
    type: 'object';
    properties: Record<string, JSONSchema>;
    required?: string[];
  };
  
  // Global variables
  variables?: Record<string, any>;
  
  // Error handling
  errorHandling: {
    defaultRetries: number;      // Default retry count
    defaultRetryDelay: number;   // Default delay between retries in ms
    globalErrorNode?: string;    // Global error handler node ID
  };
  
  // Execution settings
  execution: {
    timeout?: number;            // Maximum execution time in ms
    concurrency?: number;        // Maximum concurrent node executions
    persistState: boolean;       // Whether to persist execution state
    debugMode?: boolean;         // Whether to run in debug mode
  };
}
```

### Complete Workflow Definition

A complete workflow definition combines all the above components:

```typescript
interface WorkflowDefinition {
  metadata: WorkflowMetadata;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  configuration: WorkflowConfiguration;
}
```

## Workflow Registry

### Registry Architecture

The Workflow Registry is the central repository for all workflows in the TRON system:

```
┌───────────────────────────────────────────────────────────┐
│                     Workflow Registry                     │
│                                                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │  Registry   │  │   Version   │  │ Dependency  │       │
│  │  Storage    │  │   Manager   │  │  Resolver   │       │
│  └─────────────┘  └─────────────┘  └─────────────┘       │
│                                                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │  Schema     │  │   Search    │  │  Import/    │       │
│  │  Validator  │  │   Engine    │  │  Export     │       │
│  └─────────────┘  └─────────────┘  └─────────────┘       │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

**Components:**
- **Registry Storage**: Persists workflow definitions
- **Version Manager**: Handles workflow versioning
- **Dependency Resolver**: Resolves workflow dependencies
- **Schema Validator**: Validates workflow schemas
- **Search Engine**: Enables workflow discovery
- **Import/Export**: Handles workflow sharing

### Registry Operations

The Workflow Registry exposes the following operations:

```typescript
interface WorkflowRegistry {
  // Registration
  registerWorkflow(workflow: WorkflowDefinition): Promise<string>; // Returns workflow ID
  updateWorkflow(workflowId: string, workflow: WorkflowDefinition): Promise<void>;
  deprecateWorkflow(workflowId: string, reason: string): Promise<void>;
  unregisterWorkflow(workflowId: string): Promise<void>;
  
  // Discovery
  getWorkflow(workflowId: string, version?: string): Promise<WorkflowDefinition>;
  listWorkflows(filter?: WorkflowFilter): Promise<WorkflowSummary[]>;
  searchWorkflows(query: string): Promise<WorkflowSummary[]>;
  
  // Versioning
  getWorkflowVersions(workflowId: string): Promise<WorkflowVersion[]>;
  
  // Validation
  validateWorkflow(workflow: WorkflowDefinition): Promise<ValidationResult>;
  
  // Import/Export
  importWorkflow(workflowData: string, options?: ImportOptions): Promise<string>;
  exportWorkflow(workflowId: string, format?: ExportFormat): Promise<string>;
  
  // Events
  onWorkflowRegistered(callback: (workflow: WorkflowSummary) => void): () => void;
  onWorkflowUpdated(callback: (workflow: WorkflowSummary) => void): () => void;
  onWorkflowDeprecated(callback: (workflowId: string, reason: string) => void): () => void;
}
```

## Workflow Execution Engine

### Execution Architecture

The Workflow Execution Engine is responsible for executing workflow instances:

```
┌───────────────────────────────────────────────────────────┐
│                  Workflow Execution Engine                │
│                                                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │  Workflow   │  │   Node      │  │ Execution   │       │
│  │  Manager    │  │  Executor   │  │   Context   │       │
│  └─────────────┘  └─────────────┘  └─────────────┘       │
│                                                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │  State      │  │   Event     │  │   Error     │       │
│  │  Manager    │  │  Handler    │  │  Handler    │       │
│  └─────────────┘  └─────────────┘  └─────────────┘       │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

**Components:**
- **Workflow Manager**: Controls workflow lifecycles
- **Node Executor**: Executes individual nodes
- **Execution Context**: Provides runtime context
- **State Manager**: Manages workflow state
- **Event Handler**: Processes workflow events
- **Error Handler**: Manages errors and retries

### Execution Flow

The general execution flow follows these steps:

1. **Initialization**: Create execution context and initialize state
2. **Node Selection**: Select next executable nodes
3. **Node Execution**: Execute nodes and capture outputs
4. **State Update**: Update workflow state with node results
5. **Flow Control**: Determine next nodes based on execution results
6. **Event Processing**: Handle events generated during execution
7. **Completion/Continuation**: Complete workflow or continue to next nodes

### Execution Context

The execution context provides runtime information for a workflow instance:

```typescript
interface ExecutionContext {
  // Identifiers
  executionId: string;         // Unique execution identifier
  workflowId: string;          // Workflow identifier
  triggerType?: string;        // What triggered this execution
  
  // Parameters and state
  parameters: Record<string, any>;   // Input parameters
  variables: Record<string, any>;    // Global variables
  state: ExecutionState;       // Current execution state
  results: Record<string, any>;// Node execution results
  
  // Execution information
  startTime: number;           // Execution start timestamp
  timeout?: number;            // Execution timeout in ms
  deadline?: number;           // Execution deadline timestamp
  
  // Services and utilities
  logger: Logger;              // Execution logger
  toolRegistry: ToolRegistry;  // Access to tools
  workflowRegistry: WorkflowRegistry; // Access to workflows
  expressionEvaluator: ExpressionEvaluator; // Expression evaluation
  
  // Methods
  getNodeResult(nodeId: string): any;
  setVariable(name: string, value: any): void;
  evaluateExpression(expression: string, context?: any): any;
}
```

### Node Execution

Node execution follows a standardized process:

```typescript
interface NodeExecutor {
  // Execute a node within a workflow
  executeNode(
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<NodeExecutionResult>;
  
  // Specialized executors for different node types
  executeTriggerNode(node: WorkflowNode, context: ExecutionContext): Promise<NodeExecutionResult>;
  executeActionNode(node: WorkflowNode, context: ExecutionContext): Promise<NodeExecutionResult>;
  executeConditionNode(node: WorkflowNode, context: ExecutionContext): Promise<NodeExecutionResult>;
  executeTransformationNode(node: WorkflowNode, context: ExecutionContext): Promise<NodeExecutionResult>;
  executeSubworkflowNode(node: WorkflowNode, context: ExecutionContext): Promise<NodeExecutionResult>;
  executeLoopNode(node: WorkflowNode, context: ExecutionContext): Promise<NodeExecutionResult>;
  executeWaitNode(node: WorkflowNode, context: ExecutionContext): Promise<NodeExecutionResult>;
  executeEndNode(node: WorkflowNode, context: ExecutionContext): Promise<NodeExecutionResult>;
}

interface NodeExecutionResult {
  status: 'SUCCESS' | 'ERROR' | 'WAITING';
  output?: any;
  error?: Error;
  nextNodes?: string[];
  waitingFor?: string;
  metadata?: Record<string, any>;
}
```

### Execution State

The workflow execution state tracks the progress of the workflow:

```typescript
interface ExecutionState {
  status: ExecutionStatus;     // Overall execution status
  nodeStates: Record<string, NodeExecutionState>; // State of each node
  currentNodes: string[];      // Currently executing nodes
  completedNodes: string[];    // Completed nodes
  failedNodes: string[];       // Failed nodes
  waitingNodes: string[];      // Waiting nodes
  
  // Execution metrics
  progress: number;            // Progress percentage (0-100)
  duration: number;            // Execution duration so far
  
  // Error information
  error?: Error;               // Last error encountered
  retries: Record<string, number>; // Retry counts by node
}

type ExecutionStatus = 
  | 'PENDING'    // Waiting to start
  | 'RUNNING'    // Actively executing
  | 'WAITING'    // Waiting for external event
  | 'SUCCEEDED'  // Successfully completed
  | 'FAILED'     // Failed execution
  | 'CANCELLED'  // Cancelled by user
  | 'SUSPENDED'  // Suspended execution
```

### Error Handling

The workflow engine provides robust error handling:

```typescript
interface ErrorHandler {
  // Handle an error during node execution
  handleNodeError(
    node: WorkflowNode,
    error: Error,
    context: ExecutionContext
  ): Promise<ErrorHandlingResult>;
  
  // Determine if a node should be retried
  shouldRetryNode(
    node: WorkflowNode,
    error: Error,
    retryCount: number,
    context: ExecutionContext
  ): Promise<RetryDecision>;
  
  // Handle workflow-level errors
  handleWorkflowError(
    error: Error,
    context: ExecutionContext
  ): Promise<ErrorHandlingResult>;
}

interface ErrorHandlingResult {
  action: 'RETRY' | 'CONTINUE' | 'FAIL';
  nextNodes?: string[];
  retryDelay?: number;
  error?: Error;
  output?: any;
}

interface RetryDecision {
  shouldRetry: boolean;
  retryDelay?: number;
  maxRetries?: number;
}
```

## Workflow Runtime Management

### Workflow Instances

Each running workflow is managed as a workflow instance:

```typescript
interface WorkflowInstance {
  // Instance identifiers
  instanceId: string;           // Unique instance identifier
  workflowId: string;           // Workflow definition ID
  workflowVersion: string;      // Workflow version
  
  // Execution information
  status: ExecutionStatus;      // Current execution status
  startTime: number;            // Start timestamp
  endTime?: number;             // End timestamp if completed
  progress: number;             // Progress percentage (0-100)
  
  // Execution details
  parameters: Record<string, any>;  // Input parameters
  result?: any;                 // Final result if completed
  error?: Error;                // Error if failed
  
  // Management methods
  pause(): Promise<void>;
  resume(): Promise<void>;
  cancel(): Promise<void>;
  getState(): Promise<ExecutionState>;
  getNodeState(nodeId: string): Promise<NodeExecutionState>;
}
```

### Workflow Runtime Operations

The workflow runtime provides operations for managing workflow instances:

```typescript
interface WorkflowRuntime {
  // Execution
  startWorkflow(
    workflowId: string,
    parameters: Record<string, any>,
    options?: ExecutionOptions
  ): Promise<WorkflowInstance>;
  
  // Management
  getInstance(instanceId: string): Promise<WorkflowInstance>;
  listInstances(filter?: InstanceFilter): Promise<WorkflowInstanceSummary[]>;
  
  // Control
  pauseInstance(instanceId: string): Promise<void>;
  resumeInstance(instanceId: string): Promise<void>;
  cancelInstance(instanceId: string): Promise<void>;
  
  // Query
  getInstanceState(instanceId: string): Promise<ExecutionState>;
  getNodeState(instanceId: string, nodeId: string): Promise<NodeExecutionState>;
  
  // Events
  onInstanceStarted(callback: (instance: WorkflowInstanceSummary) => void): () => void;
  onInstanceCompleted(callback: (instance: WorkflowInstanceSummary, result: any) => void): () => void;
  onInstanceFailed(callback: (instance: WorkflowInstanceSummary, error: Error) => void): () => void;
}
```

## Data Flow

### Variable Scopes

Workflows manage data in different scopes:

1. **Input Parameters**: Data provided when starting the workflow
2. **Global Variables**: Variables available throughout the workflow
3. **Node Outputs**: Results from node execution
4. **Local Variables**: Variables scoped to specific parts of the workflow
5. **Workflow Outputs**: Final outputs from the workflow

### Data Transformation

Data transformations are performed using expressions:

```typescript
interface ExpressionEvaluator {
  // Evaluate an expression in the current context
  evaluate(
    expression: string,
    context: Record<string, any>
  ): any;
  
  // Validate an expression without executing it
  validate(
    expression: string,
    expectedType?: string
  ): ValidationResult;
}
```

Expressions support:
- **JavaScript Expressions**: Using a sandboxed JS interpreter
- **Template Literals**: String interpolation with ${variable}
- **JSONPath**: For selecting parts of JSON objects
- **Built-in Functions**: String manipulation, math operations, etc.

### Data Flow Example

```typescript
// Example workflow data flow
const workflow = {
  // Input parameter schema
  parameters: {
    type: 'object',
    properties: {
      url: { type: 'string', format: 'uri' },
      headers: { type: 'object', additionalProperties: true }
    },
    required: ['url']
  },
  
  // Sample execution:
  // 1. HTTP Request node
  nodes: [
    {
      id: 'fetchData',
      type: 'ACTION',
      tool: 'http.request',
      parameters: {
        url: '${parameters.url}',
        method: 'GET',
        headers: '${parameters.headers || {}}'
      }
    },
    {
      id: 'parseData',
      type: 'TRANSFORMATION',
      transformation: '${fetchData.body ? JSON.parse(fetchData.body) : {}}'
    },
    {
      id: 'checkStatus',
      type: 'CONDITION',
      condition: '${fetchData.statusCode >= 200 && fetchData.statusCode < 300}'
    },
    {
      id: 'processSuccess',
      type: 'ACTION',
      tool: 'data.transform',
      parameters: {
        input: '${parseData}',
        template: {
          success: true,
          data: '${parseData}',
          timestamp: '${Date.now()}'
        }
      }
    },
    {
      id: 'processError',
      type: 'ACTION',
      tool: 'data.transform',
      parameters: {
        input: '${fetchData}',
        template: {
          success: false,
          error: '${fetchData.statusText || "Failed to fetch data"}',
          statusCode: '${fetchData.statusCode}',
          timestamp: '${Date.now()}'
        }
      }
    }
  ],
  // Edges define the flow and data dependencies
  edges: [
    { source: 'fetchData', target: 'parseData', type: 'SEQUENCE' },
    { source: 'parseData', target: 'checkStatus', type: 'SEQUENCE' },
    { source: 'checkStatus', target: 'processSuccess', type: 'CONDITION', condition: 'true' },
    { source: 'checkStatus', target: 'processError', type: 'CONDITION', condition: 'false' }
  ]
};
```

## Integration with TRON Architecture

### Workflow Domain Agent

The Workflow Domain Agent manages the workflow registry and execution:

```
┌───────────────────────────────────────────────────────────┐
│                 Workflow Domain Agent                     │
│                                                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │  Workflow   │  │  Workflow   │  │ Instance    │       │
│  │  Registry   │  │   Engine    │  │  Manager    │       │
│  └─────────────┘  └─────────────┘  └─────────────┘       │
│                                                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │  Scheduler  │  │ Persistence │  │  Metrics    │       │
│  │             │  │   Service   │  │  Collector  │       │
│  └─────────────┘  └─────────────┘  └─────────────┘       │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

### Worker Agent Integration

Worker Agents execute nodes within workflows:

```
┌───────────────────────────────────────────────────────────┐
│                    Worker Agent                           │
│                                                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │  Node       │  │   Tool      │  │  State      │       │
│  │  Executor   │  │  Executor   │  │  Manager    │       │
│  └─────────────┘  └─────────────┘  └─────────────┘       │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

### Visual Editor Integration

The Workflow Engine integrates with the VibeFlo Canvas for visual editing:

- **Node Definition**: Node types expose their configuration UI
- **Edge Validation**: Validates valid connections between nodes
- **Live Testing**: Allows testing workflows within the editor
- **Debug Mode**: Visualizes execution flow and data

## Security Considerations

### Access Control

Workflow security includes:

- **Workflow-Level Permissions**: Control who can edit or execute
- **Node-Level Permissions**: Control access to sensitive operations
- **Data Access Control**: Control access to sensitive data
- **Execution Isolation**: Prevent workflows from interfering with each other

### Secret Management

Workflows can access secrets securely:

- **Secret References**: References to secrets rather than values
- **Secret Scopes**: Limit secret access to specific workflows
- **Secret Rotation**: Support for rotating secrets

### Auditing

All workflow operations are audited:

- **Creation/Modification**: Track who created or modified workflows
- **Execution**: Track who executed workflows
- **Access**: Track who accessed workflow data

## Best Practices

### Workflow Design

- **Modularity**: Break complex workflows into subworkflows
- **Error Handling**: Always include error handling paths
- **Documentation**: Document workflow purpose and nodes
- **Testing**: Create test cases for workflows
- **Versioning**: Version workflows to manage changes

### Performance Optimization

- **Node Optimization**: Optimize heavy computation nodes
- **Parallelization**: Use parallel execution for independent nodes
- **Caching**: Cache expensive operation results
- **Selective Execution**: Only execute necessary nodes
- **Resource Management**: Control resource usage during execution

## Conclusion

The TRON Workflow Engine provides a powerful platform for automating complex processes. By combining a flexible workflow definition format, a robust execution engine, and integration with the broader TRON architecture, it enables the creation and management of sophisticated workflows that can coordinate tools, services, and data processing across the system. 