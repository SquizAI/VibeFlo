import { AgentType, BaseAgent, AgentConfig, MessageType } from '../BaseAgent';
import { Plugin, PluginManager, PluginMetadata, PluginAPI, PluginHooks } from '../PluginSystem';

/**
 * Mock agent for testing
 */
class MockAgent extends BaseAgent {
  constructor(config: AgentConfig) {
    super(config);
  }
  
  // Expose protected methods for testing
  public exposeRegisterMessageHandler(command: string, handler: any): void {
    this.registerMessageHandler(command, handler);
  }
  
  public exposeUnregisterMessageHandler(command: string): void {
    this.messageHandlers.delete(command);
  }
}

/**
 * Create a test plugin
 */
function createTestPlugin(
  id: string,
  name: string,
  dependencies: string[] = [],
  hooks: Partial<PluginHooks> = {}
): Plugin {
  const metadata: PluginMetadata = {
    id,
    name,
    version: '1.0.0',
    description: `Test plugin ${name}`,
    dependencies,
    agentTypes: [AgentType.MASTER, AgentType.DOMAIN, AgentType.WORKER]
  };
  
  return {
    metadata,
    hooks: hooks as PluginHooks,
    initialize: async (api: PluginAPI) => {
      api.log.info(`Plugin ${name} initialized`);
      api.setState('initialized', true);
    },
    enabled: false,
    state: {},
    config: {
      testSetting: 'default-value'
    }
  };
}

/**
 * Test the PluginSystem functionality
 */
async function testPluginSystem() {
  console.log('Starting PluginSystem test...');
  
  // Create a mock agent
  const agent = new MockAgent({
    name: 'test-agent',
    type: AgentType.MASTER
  });
  
  // Test plugin manager creation
  console.log('\nTesting PluginManager creation...');
  const pluginManager = new PluginManager(agent);
  
  // Test plugin registration
  console.log('\nTesting plugin registration...');
  
  // Create some test plugins
  const pluginA = createTestPlugin('plugin-a', 'Plugin A');
  const pluginB = createTestPlugin('plugin-b', 'Plugin B', ['plugin-a']);
  const pluginC = createTestPlugin('plugin-c', 'Plugin C', ['plugin-b']);
  const pluginD = createTestPlugin('plugin-d', 'Plugin D');
  
  // Register plugins
  pluginManager.registerPlugin(pluginA);
  pluginManager.registerPlugin(pluginB);
  pluginManager.registerPlugin(pluginC);
  pluginManager.registerPlugin(pluginD);
  
  // Verify plugins are registered but not loaded
  const allPlugins = pluginManager.getAllPlugins();
  console.log(`Registered ${allPlugins.length} plugins`);
  
  const loadedPlugins = pluginManager.getLoadedPlugins();
  console.log(`Loaded plugins: ${loadedPlugins.length} (should be 0)`);
  
  if (loadedPlugins.length !== 0) {
    console.error('ERROR: Expected 0 loaded plugins initially');
  }
  
  // Test plugin loading in dependency order
  console.log('\nTesting plugin loading (dependency ordering)...');
  await pluginManager.loadPlugins(['plugin-c', 'plugin-d', 'plugin-a', 'plugin-b']);
  
  // Verify all plugins are loaded
  const loadedPluginsAfter = pluginManager.getLoadedPlugins();
  console.log(`Loaded plugins: ${loadedPluginsAfter.length} (should be 4)`);
  
  if (loadedPluginsAfter.length !== 4) {
    console.error('ERROR: Expected 4 loaded plugins after loading');
  }
  
  // Verify load order respects dependencies
  const pluginCLoaded = pluginManager.getPlugin('plugin-c');
  const pluginBLoaded = pluginManager.getPlugin('plugin-b');
  const pluginALoaded = pluginManager.getPlugin('plugin-a');
  
  if (!pluginALoaded?.enabled || !pluginBLoaded?.enabled || !pluginCLoaded?.enabled) {
    console.error('ERROR: Not all plugins were enabled');
  } else {
    console.log('All plugins enabled successfully');
  }
  
  // Test plugin state and config
  console.log('\nTesting plugin state and config...');
  
  if (pluginALoaded?.state?.initialized !== true) {
    console.error('ERROR: Plugin A was not properly initialized');
  } else {
    console.log('Plugin A state is correctly set');
  }
  
  // Test Plugin API
  console.log('\nTesting Plugin API...');
  
  // Create a plugin with hooks and API usage
  const pluginWithHooks = createTestPlugin('plugin-hooks', 'Plugin With Hooks', [], {
    onLoad: async () => {
      console.log('Plugin onLoad hook called');
    },
    onAgentStart: async (agent: BaseAgent) => {
      console.log(`Plugin onAgentStart hook called for agent ${agent.getName()}`);
    }
  });
  
  pluginManager.registerPlugin(pluginWithHooks);
  await pluginManager.loadPlugin('plugin-hooks');
  
  // Get the plugin and check it's loaded
  const loadedPluginWithHooks = pluginManager.getPlugin('plugin-hooks');
  
  if (!loadedPluginWithHooks?.enabled) {
    console.error('ERROR: Plugin with hooks was not properly loaded');
  } else {
    console.log('Plugin with hooks loaded successfully');
  }
  
  // Test invoking hooks
  console.log('\nTesting hook invocation...');
  await pluginManager.invokeHook('onAgentStart', agent);
  
  // Test hook that modifies messages
  console.log('\nTesting message modification hooks...');
  
  // Create a plugin that modifies messages
  const messageModifierPlugin = createTestPlugin('message-modifier', 'Message Modifier', [], {
    onBeforeMessageSend: async (message) => {
      console.log('Message modifier plugin processing message:', message.id);
      return {
        ...message,
        payload: {
          ...message.payload,
          modified: true
        }
      };
    }
  });
  
  pluginManager.registerPlugin(messageModifierPlugin);
  await pluginManager.loadPlugin('message-modifier');
  
  // Create a test message
  const testMessage = {
    id: 'test-message',
    type: MessageType.COMMAND,
    sender: 'test-sender',
    timestamp: Date.now(),
    payload: {
      parameters: {
        testParam: 'test-value'
      }
    }
  };
  
  // Apply the message hook
  const modifiedMessage = await pluginManager.applyMessageHook('onBeforeMessageSend', testMessage);
  console.log('Original message payload:', testMessage.payload);
  console.log('Modified message payload:', modifiedMessage.payload);
  
  if (!modifiedMessage.payload.modified) {
    console.error('ERROR: Message was not modified by the plugin');
  } else {
    console.log('Message was successfully modified by the plugin');
  }
  
  // Test unloading plugins
  console.log('\nTesting plugin unloading...');
  
  await pluginManager.unloadPlugin('message-modifier');
  const remainingLoadedPlugins = pluginManager.getLoadedPlugins();
  console.log(`Loaded plugins after unloading one: ${remainingLoadedPlugins.length} (should be 5)`);
  
  // Test unloading all plugins
  console.log('\nTesting unloading all plugins...');
  await pluginManager.unloadAllPlugins();
  
  const finalLoadedPlugins = pluginManager.getLoadedPlugins();
  console.log(`Loaded plugins after unloading all: ${finalLoadedPlugins.length} (should be 0)`);
  
  if (finalLoadedPlugins.length !== 0) {
    console.error('ERROR: Not all plugins were unloaded');
  } else {
    console.log('All plugins were successfully unloaded');
  }
  
  // Test plugin state serialization
  console.log('\nTesting plugin state serialization...');
  
  // Load a plugin and set some state
  await pluginManager.loadPlugin('plugin-a');
  const pluginAInstance = pluginManager.getPlugin('plugin-a');
  if (!pluginAInstance || !pluginAInstance.api) {
    console.error('ERROR: Plugin A not loaded properly');
    return;
  }
  
  const api = pluginAInstance.api;
  api.setState('testKey', 'testValue');
  
  // Get serializable state
  const serializedState = pluginManager.getSerializableState();
  console.log('Serialized state:', serializedState);
  
  // Modify the state directly
  api.setState('anotherKey', 'anotherValue');
  
  // Unload the plugin
  await pluginManager.unloadAllPlugins();
  
  // Load the plugin again and restore state
  await pluginManager.loadPlugin('plugin-a');
  pluginManager.setSerializableState(serializedState);
  
  // Check if state was restored
  const restoredPlugin = pluginManager.getPlugin('plugin-a');
  console.log('Restored plugin state:', restoredPlugin?.state);
  
  if (restoredPlugin?.state?.testKey !== 'testValue') {
    console.error('ERROR: Plugin state was not correctly restored');
  } else {
    console.log('Plugin state was successfully restored');
  }
  
  console.log('\nPluginSystem test completed');
}

// Run the test
testPluginSystem().catch(error => {
  console.error('Error running PluginSystem test:', error);
}); 