import { MessageBus } from '../MessageBus';
import { Message, MessageType, CommandMessage, EventMessage, ResponseMessage } from '../BaseAgent';

/**
 * Test the MessageBus functionality
 */
async function testMessageBus() {
  console.log('Starting MessageBus test...');
  
  // Get the message bus instance
  const messageBus = MessageBus.getInstance();
  
  // Clear any existing subscriptions (in case the test was run before)
  messageBus.clear();
  
  // Create test messages
  const testCommand: CommandMessage = {
    id: 'cmd-1',
    type: MessageType.COMMAND,
    command: 'test.command',
    sender: 'test-sender',
    timestamp: Date.now(),
    payload: {
      parameters: {
        value: 'test-value'
      }
    }
  };
  
  const testEvent: EventMessage = {
    id: 'evt-1',
    type: MessageType.EVENT,
    event: 'test.event',
    sender: 'test-sender',
    timestamp: Date.now(),
    payload: {
      data: {
        value: 'test-data'
      }
    }
  };
  
  // Test results (will be populated by handlers)
  const results: any[] = [];
  
  // Create subscriptions for different message types and commands
  console.log('Creating subscriptions...');
  
  // Subscribe to all messages
  const allMessagesSubscription = messageBus.subscribe(
    'test-subscriber-1',
    {},
    async (message: Message) => {
      console.log('Received message (all):', message.id);
      results.push({
        subscription: 'all',
        message
      });
    }
  );
  
  // Subscribe to a specific command
  const commandSubscription = messageBus.subscribe(
    'test-subscriber-2',
    { command: 'test.command' },
    async (message: Message) => {
      console.log('Received command:', message.id);
      results.push({
        subscription: 'command',
        message
      });
    }
  );
  
  // Subscribe to a specific event
  const eventSubscription = messageBus.subscribe(
    'test-subscriber-3',
    { event: 'test.event' },
    async (message: Message) => {
      console.log('Received event:', message.id);
      results.push({
        subscription: 'event',
        message
      });
    }
  );
  
  // Subscribe to messages from a specific sender
  const senderSubscription = messageBus.subscribe(
    'test-subscriber-4',
    { agentId: 'test-sender' },
    async (message: Message) => {
      console.log('Received message from sender:', message.id);
      results.push({
        subscription: 'sender',
        message
      });
    }
  );
  
  // Test publishing messages
  console.log('Publishing test command...');
  await messageBus.publish(testCommand);
  
  console.log('Publishing test event...');
  await messageBus.publish(testEvent);
  
  // Test request-response pattern
  const responsePromise = messageBus.request(testCommand);
  
  // Send a response to the request
  setTimeout(async () => {
    // Create and publish a response message
    const responseMessage: ResponseMessage = {
      id: 'resp-1',
      type: MessageType.RESPONSE,
      correlationId: testCommand.id,
      status: 'SUCCESS',
      sender: 'test-responder',
      timestamp: Date.now(),
      payload: {
        result: {
          value: 'response-value'
        }
      }
    };
    
    console.log('Publishing response message...');
    await messageBus.publish(responseMessage);
  }, 100);
  
  try {
    console.log('Waiting for response...');
    const response = await responsePromise;
    console.log('Received response:', response);
    results.push({
      subscription: 'request-response',
      message: response
    });
  } catch (error) {
    console.error('Error in request-response test:', error);
  }
  
  // Wait a bit to ensure all messages are processed
  console.log('Waiting for all messages to be processed...');
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Get message bus stats
  const stats = messageBus.getStats();
  console.log('MessageBus stats:', stats);
  
  // Validate test results
  console.log('\nTest results:');
  console.log(`Total messages received: ${results.length}`);
  
  // The 'all' subscription should receive both messages
  const allMessages = results.filter(r => r.subscription === 'all');
  console.log(`All subscription received ${allMessages.length} messages (expected 2)`);
  
  // The 'command' subscription should receive only the command message
  const commandMessages = results.filter(r => r.subscription === 'command');
  console.log(`Command subscription received ${commandMessages.length} messages (expected 1)`);
  
  // The 'event' subscription should receive only the event message
  const eventMessages = results.filter(r => r.subscription === 'event');
  console.log(`Event subscription received ${eventMessages.length} messages (expected 1)`);
  
  // The 'sender' subscription should receive both messages
  const senderMessages = results.filter(r => r.subscription === 'sender');
  console.log(`Sender subscription received ${senderMessages.length} messages (expected 2)`);
  
  // The request-response pattern should receive the response message
  const responseMessages = results.filter(r => r.subscription === 'request-response');
  console.log(`Request-response received ${responseMessages.length} messages (expected 1)`);
  
  // Test unsubscribing
  console.log('\nTesting unsubscribe...');
  messageBus.unsubscribe(commandSubscription);
  console.log('Unsubscribed from command subscription');
  
  // Should not receive this message on the command subscription
  const testCommand2: CommandMessage = {
    id: 'cmd-2',
    type: MessageType.COMMAND,
    command: 'test.command',
    sender: 'test-sender',
    timestamp: Date.now(),
    payload: {
      parameters: {
        value: 'test-value-2'
      }
    }
  };
  
  // Clear results
  results.length = 0;
  
  // Publish second command message
  console.log('Publishing second test command...');
  await messageBus.publish(testCommand2);
  
  // Wait a bit to ensure all messages are processed
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Validate test results after unsubscribe
  console.log('\nTest results after unsubscribe:');
  console.log(`Total messages received: ${results.length}`);
  
  // The 'all' subscription should still receive the message
  const allMessages2 = results.filter(r => r.subscription === 'all');
  console.log(`All subscription received ${allMessages2.length} messages (expected 1)`);
  
  // The 'command' subscription should not receive the message anymore
  const commandMessages2 = results.filter(r => r.subscription === 'command');
  console.log(`Command subscription received ${commandMessages2.length} messages (expected 0)`);
  
  // Clean up
  console.log('\nCleaning up...');
  messageBus.unsubscribeAll('test-subscriber-1');
  messageBus.unsubscribeAll('test-subscriber-3');
  messageBus.unsubscribeAll('test-subscriber-4');
  
  console.log('MessageBus test completed');
}

// Run the test
testMessageBus().catch(error => {
  console.error('Error running MessageBus test:', error);
}); 