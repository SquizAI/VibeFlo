import { TaskWorkerAgent, TaskStatus } from '../TaskWorkerAgent';
import { MessageType, AgentType } from '../BaseAgent';

/**
 * Simple test script for TaskWorkerAgent
 */
async function testTaskWorkerAgent() {
  console.log('Starting TaskWorkerAgent test...');
  
  // Create a task worker agent with echo and delay task types
  const taskAgent = new TaskWorkerAgent({
    name: 'Test Task Worker Agent',
    type: AgentType.WORKER,
    supportedTaskTypes: ['echo', 'delay']
  });
  
  // Register a delay task handler
  taskAgent.registerTaskHandler('delay', async (task) => {
    const ms = task.parameters.ms || 1000;
    console.log(`Delay task ${task.id} started: waiting for ${ms}ms`);
    await new Promise(resolve => setTimeout(resolve, ms));
    return { waited: ms };
  });
  
  // Initialize the agent
  await taskAgent.initialize();
  console.log('Task worker agent initialized');
  
  // Start the agent
  await taskAgent.start();
  console.log('Task worker agent started');
  
  // Test agent status
  console.log(`Agent status: ${taskAgent.getStatus()}`);
  
  // Execute an echo task
  const echoTaskMessage = {
    id: 'test-message-1',
    type: MessageType.COMMAND,
    command: 'task.execute',
    sender: 'test-client',
    timestamp: Date.now(),
    payload: {
      parameters: {
        type: 'echo',
        parameters: {
          message: 'Hello, World!',
          number: 42,
          nested: {
            value: true
          }
        }
      }
    }
  };
  
  console.log('Sending echo task message...');
  const echoResponse = await taskAgent.handleMessage(echoTaskMessage);
  console.log('Echo task response:', echoResponse);
  
  if (echoResponse && 'correlationId' in echoResponse && echoResponse.status === 'SUCCESS') {
    // Extract the task ID from the response
    const echoTaskId = echoResponse.payload.result.taskId;
    
    // Wait a bit for the task to complete
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Get the task status
    const echoStatusMessage = {
      id: 'test-message-2',
      type: MessageType.COMMAND,
      command: 'task.getStatus',
      sender: 'test-client',
      timestamp: Date.now(),
      payload: {
        parameters: {
          taskId: echoTaskId
        }
      }
    };
    
    console.log('Sending get echo task status message...');
    const echoStatusResponse = await taskAgent.handleMessage(echoStatusMessage);
    console.log('Echo task status response:', echoStatusResponse);
  }
  
  // Execute a delay task
  const delayTaskMessage = {
    id: 'test-message-3',
    type: MessageType.COMMAND,
    command: 'task.execute',
    sender: 'test-client',
    timestamp: Date.now(),
    payload: {
      parameters: {
        type: 'delay',
        parameters: {
          ms: 2000
        }
      }
    }
  };
  
  console.log('Sending delay task message...');
  const delayResponse = await taskAgent.handleMessage(delayTaskMessage);
  console.log('Delay task response:', delayResponse);
  
  if (delayResponse && 'correlationId' in delayResponse && delayResponse.status === 'SUCCESS') {
    // Extract the task ID from the response
    const delayTaskId = delayResponse.payload.result.taskId;
    
    // Get the task status immediately
    const delayStatus1Message = {
      id: 'test-message-4',
      type: MessageType.COMMAND,
      command: 'task.getStatus',
      sender: 'test-client',
      timestamp: Date.now(),
      payload: {
        parameters: {
          taskId: delayTaskId
        }
      }
    };
    
    console.log('Sending get delay task status message (should be RUNNING)...');
    const delayStatus1Response = await taskAgent.handleMessage(delayStatus1Message);
    console.log('Delay task status response 1:', delayStatus1Response);
    
    // Wait for task to complete
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    // Get the task status again
    const delayStatus2Message = {
      id: 'test-message-5',
      type: MessageType.COMMAND,
      command: 'task.getStatus',
      sender: 'test-client',
      timestamp: Date.now(),
      payload: {
        parameters: {
          taskId: delayTaskId
        }
      }
    };
    
    console.log('Sending get delay task status message (should be COMPLETED)...');
    const delayStatus2Response = await taskAgent.handleMessage(delayStatus2Message);
    console.log('Delay task status response 2:', delayStatus2Response);
  }
  
  // List all tasks
  const listTasksMessage = {
    id: 'test-message-6',
    type: MessageType.COMMAND,
    command: 'task.list',
    sender: 'test-client',
    timestamp: Date.now(),
    payload: {
      parameters: {}
    }
  };
  
  console.log('Sending list tasks message...');
  const listResponse = await taskAgent.handleMessage(listTasksMessage);
  console.log('List tasks response:', listResponse);
  
  // Get task stats
  const stats = taskAgent.getTaskStats();
  console.log('Task stats:', stats);
  
  // Stop the agent
  await taskAgent.stop();
  console.log('Task worker agent stopped');
  
  console.log('TaskWorkerAgent test completed');
}

// Run the test
testTaskWorkerAgent().catch(error => {
  console.error('Error running TaskWorkerAgent test:', error);
}); 