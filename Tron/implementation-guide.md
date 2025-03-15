# TRON Implementation Guide

This document provides practical guidance for implementing the TRON architecture, including common issues and their solutions.

## Development Environment Setup

### Prerequisites

- Node.js 16+ and npm 7+
- Git
- Docker (optional, for containerization)

### Initial Setup

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/yourusername/vibeflo.git
   cd vibeflo
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Setup Environment Variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

## Common Issues and Solutions

### Issue: Vite Command Not Found

**Problem**: When running `npm run dev`, you get an error `sh: vite: command not found`:

```bash
mattysquarzoni@Mac VibeFlo % cd /Users/mattysquarzoni/NodeFlo_CANVAS/VibeFlo && npm run dev
> vite-react-typescript-starter@0.0.0 dev
> vite
sh: vite: command not found
mattysquarzoni@Mac VibeFlo %
```

**Solution**:

This error occurs because Vite hasn't been installed locally or isn't in your PATH. Three approaches to solve this:

1. **Install Vite locally**:
   ```bash
   npm install vite --save-dev
   ```

2. **Use npx to run Vite** (modify package.json):
   ```json
   {
     "scripts": {
       "dev": "npx vite"
     }
   }
   ```

3. **Reinstall all dependencies**:
   ```bash
   rm -rf node_modules
   npm install
   ```

### Integrating MCP with Development Environment

The error above provides an opportunity to demonstrate how TRON's MCP integration can help manage development environments:

```typescript
// Example of a development tools MCP integration
async function setupDevEnvironmentMCP() {
  // Register Dev Environment MCP service
  await mcpRegistry.registerService({
    id: 'dev-environment-mcp',
    name: 'Development Environment MCP',
    description: 'Manages development environment setup and troubleshooting',
    version: '1.0.0',
    capabilities: ['dependency-check', 'environment-setup', 'dev-server'],
    schema: devEnvironmentSchema,
    endpoint: 'http://localhost:3001/dev-mcp',
    authType: 'NONE',
    metadata: {
      provider: 'TRON',
      documentationUrl: 'https://example.com/docs/dev-environment-mcp'
    }
  });
  
  // Create tools from Dev Environment MCP
  const dependencyCheckerTool = await mcpToolBridge.createToolFromMCPService(
    'dev-environment-mcp',
    {
      toolName: 'dev.dependencies',
      category: 'DEVELOPMENT',
      operations: ['check', 'install', 'update']
    }
  );
  
  // Register tool with TRON Tools System
  await toolsRegistry.registerTool(dependencyCheckerTool);
}

// Example of workflow to diagnose and fix Vite errors
const viteFixWorkflow = {
  metadata: {
    id: 'vite-error-fix-workflow',
    name: 'Vite Error Resolution',
    description: 'Diagnose and fix Vite command not found errors'
  },
  nodes: [
    {
      id: 'checkViteDep',
      type: 'ACTION',
      tool: 'dev.dependencies',
      parameters: {
        operation: 'check',
        package: 'vite'
      }
    },
    {
      id: 'checkCondition',
      type: 'CONDITION',
      condition: '${checkViteDep.installed === false}'
    },
    {
      id: 'installVite',
      type: 'ACTION',
      tool: 'dev.dependencies',
      parameters: {
        operation: 'install',
        package: 'vite',
        isDev: true
      }
    },
    {
      id: 'updatePackageJson',
      type: 'ACTION',
      tool: 'dev.packageJson',
      parameters: {
        operation: 'update',
        field: 'scripts.dev',
        value: 'npx vite'
      }
    },
    {
      id: 'notifySuccess',
      type: 'ACTION',
      tool: 'system.notify',
      parameters: {
        message: 'Vite has been installed and package.json updated. Try running npm run dev again.'
      }
    }
  ],
  edges: [
    { source: 'checkViteDep', target: 'checkCondition', type: 'SEQUENCE' },
    { source: 'checkCondition', target: 'installVite', type: 'CONDITION', condition: 'true' },
    { source: 'installVite', target: 'updatePackageJson', type: 'SEQUENCE' },
    { source: 'updatePackageJson', target: 'notifySuccess', type: 'SEQUENCE' },
    { source: 'checkCondition', target: 'notifySuccess', type: 'CONDITION', condition: 'false' }
  ]
};
```

## Setting Up TRON Components

### Master Control Agent Setup

```typescript
// Initialize the Master Control Agent
const masterAgent = await MasterAgent.initialize({
  id: 'tron-master',
  name: 'TRON Master Control Agent',
  configuration: {
    registryPath: './agent-registry',
    schedulerInterval: 5000, // 5 seconds
    logLevel: 'info',
    persistence: true
  }
});

// Register with the system
await masterAgent.register();

// Start the agent
await masterAgent.start();
```

### Domain Agent Setup

```typescript
// Initialize the MCP Domain Agent
const mcpDomainAgent = await MCPDomainAgent.initialize({
  id: 'mcp-domain',
  name: 'MCP Domain Agent',
  masterAgentUrl: 'http://localhost:8000/master',
  configuration: {
    registryPath: './mcp-registry',
    logLevel: 'info',
    persistence: true
  }
});

// Register with master agent
await mcpDomainAgent.register();

// Start the agent
await mcpDomainAgent.start();
```

### Worker Agent Setup

```typescript
// Initialize a Worker Agent
const workerAgent = await WorkerAgent.initialize({
  id: 'worker-1',
  name: 'Worker Agent 1',
  masterAgentUrl: 'http://localhost:8000/master',
  capabilities: ['tool-execution', 'node-execution'],
  configuration: {
    maxConcurrentTasks: 5,
    logLevel: 'info'
  }
});

// Register with master agent
await workerAgent.register();

// Start the agent
await workerAgent.start();
```

## Integrating with External Systems

### GitHub Integration

```typescript
// Setup GitHub MCP Integration
async function setupGitHubIntegration() {
  // Register GitHub MCP service
  const githubService = {
    id: 'github-mcp',
    name: 'GitHub MCP',
    description: 'Integration with GitHub',
    version: '1.0.0',
    capabilities: ['issues', 'pull-requests', 'repositories'],
    schema: githubMCPSchema,
    endpoint: 'https://api.github.com',
    authType: 'OAUTH',
    metadata: {
      provider: 'GitHub',
      documentationUrl: 'https://docs.github.com/en/rest'
    }
  };
  
  await mcpRegistry.registerService(githubService);
  
  // Create tools from GitHub MCP
  const repoTool = await mcpToolBridge.createToolFromMCPService(
    'github-mcp',
    {
      toolName: 'github.repositories',
      category: 'INTEGRATION',
      operations: ['list', 'get', 'create', 'update']
    }
  );
  
  // Register tool with Tools Registry
  await toolsRegistry.registerTool(repoTool);
  
  console.log('GitHub integration setup complete');
}
```

### Database Integration

```typescript
// Setup PostgreSQL MCP Integration
async function setupPostgresIntegration() {
  // Register PostgreSQL MCP service
  const postgresService = {
    id: 'postgres-mcp',
    name: 'PostgreSQL MCP',
    description: 'Integration with PostgreSQL databases',
    version: '1.0.0',
    capabilities: ['query', 'transaction', 'schema'],
    schema: postgresMCPSchema,
    endpoint: process.env.DATABASE_URL || 'postgresql://localhost:5432/default',
    authType: 'CONNECTION_STRING',
    metadata: {
      provider: 'PostgreSQL',
      documentationUrl: 'https://www.postgresql.org/docs/'
    }
  };
  
  await mcpRegistry.registerService(postgresService);
  
  // Create tools from PostgreSQL MCP
  const queryTool = await mcpToolBridge.createToolFromMCPService(
    'postgres-mcp',
    {
      toolName: 'postgres.query',
      category: 'DATABASE',
      operations: ['execute', 'select', 'insert', 'update', 'delete']
    }
  );
  
  // Register tool with Tools Registry
  await toolsRegistry.registerTool(queryTool);
  
  console.log('PostgreSQL integration setup complete');
}
```

## Deployment

### Development Deployment

For local development, you can run TRON components directly:

```bash
# Start Master Agent
npm run start:master

# Start Domain Agents
npm run start:domain:mcp
npm run start:domain:workflow

# Start Worker Agents
npm run start:worker
```

### Production Deployment

For production, containerization is recommended:

```yaml
# docker-compose.yml
version: '3'
services:
  tron-master:
    build:
      context: .
      dockerfile: docker/master.Dockerfile
    ports:
      - "8000:8000"
    volumes:
      - ./data/master:/app/data
    environment:
      - NODE_ENV=production
      - LOG_LEVEL=info
  
  tron-mcp-domain:
    build:
      context: .
      dockerfile: docker/domain.Dockerfile
    environment:
      - DOMAIN_TYPE=mcp
      - MASTER_URL=http://tron-master:8000
    volumes:
      - ./data/mcp:/app/data
    depends_on:
      - tron-master
  
  tron-worker:
    build:
      context: .
      dockerfile: docker/worker.Dockerfile
    environment:
      - MASTER_URL=http://tron-master:8000
    volumes:
      - ./data/worker:/app/data
    depends_on:
      - tron-master
    deploy:
      replicas: 3
```

Run with:

```bash
docker-compose up -d
```

## Monitoring and Observability

TRON provides comprehensive monitoring through its Observability module:

```typescript
// Setup Observability
await ObservabilityManager.initialize({
  metrics: {
    enabled: true,
    endpoint: '/metrics',
    interval: 15000 // 15 seconds
  },
  tracing: {
    enabled: true,
    exporter: 'jaeger',
    endpoint: 'http://jaeger:14268/api/traces'
  },
  logging: {
    level: 'info',
    format: 'json',
    destination: 'file',
    filepath: './logs/tron.log'
  }
});

// Start collecting metrics
ObservabilityManager.start();
```

## Conclusion

This implementation guide provides a practical starting point for implementing the TRON architecture with MCP integration. By following these guidelines, you'll be able to set up a robust, extensible workflow automation system that can integrate with a wide range of external services through the Model Context Protocol.

For more detailed documentation on each component, refer to the respective documentation files in the TRON documentation directory. 