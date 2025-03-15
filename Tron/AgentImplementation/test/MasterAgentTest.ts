import { MasterAgent } from '../MasterAgent';
import { AgentRegistry } from '../AgentRegistry';
import { AgentType, MessageType, AgentStatus } from '../BaseAgent';

/**
 * Simple test script for MasterAgent
 */
async function testMasterAgent() {
  console.log('Starting MasterAgent test...');
  
  // Clear the agent registry to start fresh
  AgentRegistry.getInstance().clear();
  
  // Create a master agent
  const masterAgent = new MasterAgent({
    name: 'Test Master Agent',
    type: AgentType.MASTER,
    heartbeatInterval: 5000, // 5 seconds for testing
    inactiveAgentTimeout: 15000 // 15 seconds for testing
  });
  
  // Initialize the agent
  await masterAgent.initialize();
  console.log('Master agent initialized');
  
  // Start the agent
  await masterAgent.start();
  console.log('Master agent started');
  
  // Create a test message to register a test agent
  const registerMessage = {
    id: 'test-message-1',
    type: MessageType.COMMAND,
    command: 'master.registerAgent',
    sender: 'test-client',
    timestamp: Date.now(),
    payload: {
      parameters: {
        agentInfo: {
          id: 'test-agent-1',
          name: 'Test Domain Agent',
          type: AgentType.DOMAIN,
          status: AgentStatus.ACTIVE,
          capabilities: ['domain.workflow.execute', 'domain.workflow.create'],
          endpoint: 'http://localhost:3001/agents/test-agent-1'
        }
      }
    }
  };
  
  // Send the register message to the master agent
  console.log('Sending register agent message...');
  const registerResponse = await masterAgent.handleMessage(registerMessage);
  console.log('Register agent response:', registerResponse);
  
  // Get system status
  const statusMessage = {
    id: 'test-message-2',
    type: MessageType.COMMAND,
    command: 'master.getSystemStatus',
    sender: 'test-client',
    timestamp: Date.now(),
    payload: {
      parameters: {}
    }
  };
  
  console.log('Sending get system status message...');
  const statusResponse = await masterAgent.handleMessage(statusMessage);
  console.log('System status response:', statusResponse);
  
  // Find agents by type
  const findMessage = {
    id: 'test-message-3',
    type: MessageType.COMMAND,
    command: 'master.findAgents',
    sender: 'test-client',
    timestamp: Date.now(),
    payload: {
      parameters: {
        type: AgentType.DOMAIN
      }
    }
  };
  
  console.log('Sending find agents message...');
  const findResponse = await masterAgent.handleMessage(findMessage);
  console.log('Find agents response:', findResponse);
  
  // Find agents by capability
  const findByCapabilityMessage = {
    id: 'test-message-4',
    type: MessageType.COMMAND,
    command: 'master.findAgents',
    sender: 'test-client',
    timestamp: Date.now(),
    payload: {
      parameters: {
        capabilities: ['domain.workflow.execute']
      }
    }
  };
  
  console.log('Sending find agents by capability message...');
  const capabilityResponse = await masterAgent.handleMessage(findByCapabilityMessage);
  console.log('Find by capability response:', capabilityResponse);
  
  // Send heartbeat
  const heartbeatMessage = {
    id: 'test-message-5',
    type: MessageType.COMMAND,
    command: 'master.heartbeat',
    sender: 'test-agent-1',
    timestamp: Date.now(),
    payload: {
      parameters: {
        agentId: 'test-agent-1'
      }
    }
  };
  
  console.log('Sending heartbeat message...');
  const heartbeatResponse = await masterAgent.handleMessage(heartbeatMessage);
  console.log('Heartbeat response:', heartbeatResponse);
  
  // Wait for a bit to see inactive agent detection
  console.log('Waiting for inactive agent detection...');
  await new Promise(resolve => setTimeout(resolve, 20000));
  
  // Get system status again to see if agent was marked inactive
  console.log('Sending get system status message again...');
  const finalStatusResponse = await masterAgent.handleMessage(statusMessage);
  console.log('Final system status response:', finalStatusResponse);
  
  // Stop the master agent
  await masterAgent.stop();
  console.log('Master agent stopped');
  
  console.log('MasterAgent test completed');
}

// Run the test
testMasterAgent().catch(error => {
  console.error('Error running MasterAgent test:', error);
}); 