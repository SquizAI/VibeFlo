# TRON Agent Implementation

This directory contains the implementation of the TRON (Task-Reactive Orchestration Network) agent system.

## Implementation Status

### Core Components
- ✅ Base Agent Framework
- ✅ Agent Registry
- ✅ Master Agent
- ✅ Domain Agent (Workflow)
- ✅ Worker Agent (Task)

### Testing Infrastructure
- ✅ Test Runner
- ✅ Workflow Domain Agent Tests
- ✅ Task Worker Agent Tests

### Next Steps
- 🔲 Message Bus Implementation
- 🔲 State Persistence
- 🔲 Security Module
- 🔲 Plugin System
- 🔲 Integration with Tools System
- 🔲 Integration with MCP (Model Context Protocol)

## Agent Hierarchy

```
BaseAgent
├── MasterAgent
├── DomainAgent
│   └── WorkflowDomainAgent
└── WorkerAgent
    └── TaskWorkerAgent
```

## Running Tests

To run tests for a specific agent:

```bash
npm run test:tron -- --test=WorkflowDomainAgentTest
npm run test:tron -- --test=TaskWorkerAgentTest
```

## Development Guidelines

1. All agents should extend the appropriate base class (MasterAgent, DomainAgent, or WorkerAgent)
2. Each agent should handle its specific command messages and return appropriate responses
3. Error handling should use the `getErrorMessage` helper to handle unknown error types
4. Each new agent implementation should include corresponding test files

## Architecture Documents

For detailed architecture information, refer to the following documents in the main TRON directory:

- [Architecture Overview](../Architecture.md)
- [Agent Core](../AgentCore.md)
- [Tools System](../ToolsSystem.md)
- [Workflow Engine](../WorkflowEngine.md)
- [Security Framework](../SecurityFramework.md)
- [Communication Protocol](../CommunicationProtocol.md) 