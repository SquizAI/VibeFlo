import { WorkflowDomainAgent } from '../WorkflowDomainAgent';
import { MessageType, AgentStatus, AgentType } from '../BaseAgent';

/**
 * Simple test script for WorkflowDomainAgent
 */
async function testWorkflowDomainAgent() {
  console.log('Starting WorkflowDomainAgent test...');
  
  // Create a workflow domain agent
  const workflowAgent = new WorkflowDomainAgent({
    name: 'Test Workflow Domain Agent',
    type: AgentType.DOMAIN,
    domain: 'workflow',
    maxConcurrentWorkflows: 5
  });
  
  // Initialize the agent
  await workflowAgent.initialize();
  console.log('Workflow domain agent initialized');
  
  // Start the agent
  await workflowAgent.start();
  console.log('Workflow domain agent started');
  
  // Test agent status
  console.log(`Agent status: ${workflowAgent.getStatus()}`);
  console.log(`Agent domain: ${workflowAgent.getDomain()}`);
  
  // Create a test workflow
  const createWorkflowMessage = {
    id: 'test-message-1',
    type: MessageType.COMMAND,
    command: 'workflow.create',
    sender: 'test-client',
    timestamp: Date.now(),
    payload: {
      parameters: {
        name: 'Test Workflow',
        description: 'A test workflow for testing the domain agent',
        nodes: [
          {
            id: 'node1',
            type: 'start',
            name: 'Start Node',
            position: { x: 100, y: 100 }
          },
          {
            id: 'node2',
            type: 'action',
            name: 'Action Node',
            data: { action: 'test-action' },
            position: { x: 200, y: 100 }
          },
          {
            id: 'node3',
            type: 'end',
            name: 'End Node',
            position: { x: 300, y: 100 }
          }
        ],
        edges: [
          {
            id: 'edge1',
            source: 'node1',
            target: 'node2',
            type: 'standard'
          },
          {
            id: 'edge2',
            source: 'node2',
            target: 'node3',
            type: 'standard'
          }
        ],
        metadata: {
          category: 'test',
          tags: ['test', 'example']
        }
      }
    }
  };
  
  // Send the create workflow message
  console.log('Sending create workflow message...');
  const createResponse = await workflowAgent.handleMessage(createWorkflowMessage);
  console.log('Create workflow response:', createResponse);
  
  if (createResponse && 'correlationId' in createResponse && createResponse.status === 'SUCCESS') {
    // Extract the workflow ID from the response
    const workflowId = createResponse.payload.result.workflow.id;
    
    // Get the workflow
    const getWorkflowMessage = {
      id: 'test-message-2',
      type: MessageType.COMMAND,
      command: 'workflow.get',
      sender: 'test-client',
      timestamp: Date.now(),
      payload: {
        parameters: {
          workflowId
        }
      }
    };
    
    console.log('Sending get workflow message...');
    const getResponse = await workflowAgent.handleMessage(getWorkflowMessage);
    console.log('Get workflow response:', getResponse);
    
    // List workflows
    const listWorkflowsMessage = {
      id: 'test-message-3',
      type: MessageType.COMMAND,
      command: 'workflow.list',
      sender: 'test-client',
      timestamp: Date.now(),
      payload: {
        parameters: {}
      }
    };
    
    console.log('Sending list workflows message...');
    const listResponse = await workflowAgent.handleMessage(listWorkflowsMessage);
    console.log('List workflows response:', listResponse);
    
    // Execute the workflow
    const executeWorkflowMessage = {
      id: 'test-message-4',
      type: MessageType.COMMAND,
      command: 'workflow.execute',
      sender: 'test-client',
      timestamp: Date.now(),
      payload: {
        parameters: {
          workflowId,
          parameters: {
            testParam: 'test-value'
          }
        }
      }
    };
    
    console.log('Sending execute workflow message...');
    const executeResponse = await workflowAgent.handleMessage(executeWorkflowMessage);
    console.log('Execute workflow response:', executeResponse);
    
    if (executeResponse && 'correlationId' in executeResponse && executeResponse.status === 'SUCCESS') {
      // Extract the instance ID from the response
      const instanceId = executeResponse.payload.result.instanceId;
      
      // Wait for a bit to let the workflow execute
      console.log('Waiting for workflow execution...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Get the workflow status
      const getStatusMessage = {
        id: 'test-message-5',
        type: MessageType.COMMAND,
        command: 'workflow.getStatus',
        sender: 'test-client',
        timestamp: Date.now(),
        payload: {
          parameters: {
            instanceId
          }
        }
      };
      
      console.log('Sending get workflow status message...');
      const statusResponse = await workflowAgent.handleMessage(getStatusMessage);
      console.log('Get workflow status response:', statusResponse);
    }
    
    // Update the workflow
    const updateWorkflowMessage = {
      id: 'test-message-6',
      type: MessageType.COMMAND,
      command: 'workflow.update',
      sender: 'test-client',
      timestamp: Date.now(),
      payload: {
        parameters: {
          workflowId,
          name: 'Updated Test Workflow',
          metadata: {
            updated: true,
            updatedAt: Date.now()
          }
        }
      }
    };
    
    console.log('Sending update workflow message...');
    const updateResponse = await workflowAgent.handleMessage(updateWorkflowMessage);
    console.log('Update workflow response:', updateResponse);
    
    // Get workflow stats
    const stats = workflowAgent.getWorkflowStats();
    console.log('Workflow stats:', stats);
    
    // Delete the workflow
    const deleteWorkflowMessage = {
      id: 'test-message-7',
      type: MessageType.COMMAND,
      command: 'workflow.delete',
      sender: 'test-client',
      timestamp: Date.now(),
      payload: {
        parameters: {
          workflowId
        }
      }
    };
    
    console.log('Sending delete workflow message...');
    const deleteResponse = await workflowAgent.handleMessage(deleteWorkflowMessage);
    console.log('Delete workflow response:', deleteResponse);
  }
  
  // Stop the agent
  await workflowAgent.stop();
  console.log('Workflow domain agent stopped');
  
  console.log('WorkflowDomainAgent test completed');
}

// Run the test
testWorkflowDomainAgent().catch(error => {
  console.error('Error running WorkflowDomainAgent test:', error);
}); 