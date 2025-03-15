import { MasterAgent } from '../AgentImplementation/MasterAgent';
import { AgentRegistry } from '../AgentImplementation/AgentRegistry';
import { AgentType, AgentStatus } from '../AgentImplementation/BaseAgent';

/**
 * Simple example script demonstrating how to use the MasterAgent
 */
async function runExample() {
  console.log('Starting TRON example...');
  
  // Create a master agent
  const masterAgent = new MasterAgent({
    name: 'TRON Master Agent',
    type: AgentType.MASTER,
    capabilities: ['master.registerAgent', 'master.findAgents', 'master.getSystemStatus'],
    configuration: {
      heartbeatInterval: 10000, // 10 seconds
      inactiveAgentTimeout: 30000 // 30 seconds
    }
  });
  
  // Initialize and start the master agent
  await masterAgent.initialize();
  await masterAgent.start();
  
  console.log('Master agent started with ID:', masterAgent.getId());
  
  // Manually register some test agents
  const registry = AgentRegistry.getInstance();
  
  // Register a sample domain agent
  registry.registerAgent({
    id: 'workflow-domain-1',
    name: 'Workflow Domain Agent',
    type: AgentType.DOMAIN,
    status: AgentStatus.ACTIVE,
    capabilities: ['domain.workflow.execute', 'domain.workflow.create', 'domain.workflow.manage'],
    endpoint: 'http://localhost:3001/agents/workflow'
  });
  
  // Register a sample worker agent
  registry.registerAgent({
    id: 'worker-1',
    name: 'Task Execution Worker',
    type: AgentType.WORKER,
    status: AgentStatus.ACTIVE,
    capabilities: ['worker.executeTask', 'worker.reportStatus'],
    endpoint: 'http://localhost:3002/agents/worker1'
  });
  
  // Show the system status
  const status = masterAgent.getSystemStatus();
  console.log('System status:', JSON.stringify(status, null, 2));
  
  // Wait for 5 seconds then show status again
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Simulate a domain agent heartbeat
  registry.recordHeartbeat('workflow-domain-1');
  
  // Show the updated system status
  const updatedStatus = masterAgent.getSystemStatus();
  console.log('Updated system status:', JSON.stringify(updatedStatus, null, 2));
  
  // Wait for inactivity detection (the worker will be detected as inactive)
  console.log('Waiting for inactive agent detection...');
  await new Promise(resolve => setTimeout(resolve, 35000));
  
  // Show final system status
  const finalStatus = masterAgent.getSystemStatus();
  console.log('Final system status:', JSON.stringify(finalStatus, null, 2));
  
  // Stop the master agent
  await masterAgent.stop();
  console.log('Master agent stopped');
  
  console.log('TRON example completed');
}

// Run the example
runExample().catch(error => {
  console.error('Error running TRON example:', error);
}); 