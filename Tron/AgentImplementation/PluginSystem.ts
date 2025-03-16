import { BaseAgent, MessageHandler, Message, AgentType, getErrorMessage } from './BaseAgent';

/**
 * Plugin metadata
 */
export interface PluginMetadata {
  id: string;
  name: string;
  version: string;
  description: string;
  author?: string;
  dependencies?: string[];
  tags?: string[];
  agentTypes?: AgentType[];
}

/**
 * Plugin lifecycle hooks
 */
export interface PluginHooks {
  onLoad?: () => Promise<void> | void;
  onUnload?: () => Promise<void> | void;
  onAgentStart?: (agent: BaseAgent) => Promise<void> | void;
  onAgentStop?: (agent: BaseAgent) => Promise<void> | void;
  onBeforeMessageSend?: (message: Message) => Promise<Message> | Message;
  onAfterMessageReceive?: (message: Message) => Promise<Message> | Message;
  onAgentStateChange?: (agent: BaseAgent, oldState: any, newState: any) => Promise<void> | void;
}

/**
 * Plugin configuration options
 */
export interface PluginConfig {
  [key: string]: any;
}

/**
 * Plugin API exposed to plugins
 */
export interface PluginAPI {
  registerMessageHandler: (commandOrEvent: string, handler: MessageHandler) => void;
  unregisterMessageHandler: (commandOrEvent: string) => void;
  addCapability: (capability: string) => void;
  removeCapability: (capability: string) => void;
  getConfig: <T>(key: string) => T | undefined;
  setConfig: <T>(key: string, value: T) => void;
  getState: <T>(key: string) => T | undefined;
  setState: <T>(key: string, value: T) => void;
  getPlugin: (pluginId: string) => Plugin | undefined;
  log: {
    debug: (message: string, ...args: any[]) => void;
    info: (message: string, ...args: any[]) => void;
    warn: (message: string, ...args: any[]) => void;
    error: (message: string, ...args: any[]) => void;
  };
}

/**
 * Plugin interface
 */
export interface Plugin {
  metadata: PluginMetadata;
  hooks: PluginHooks;
  initialize: (api: PluginAPI) => Promise<void> | void;
  api?: PluginAPI;
  enabled: boolean;
  state: Record<string, any>;
  config: PluginConfig;
}

/**
 * Plugin loading error
 */
export class PluginError extends Error {
  constructor(pluginId: string, message: string) {
    super(`Plugin Error (${pluginId}): ${message}`);
    this.name = 'PluginError';
  }
}

/**
 * Plugin dependency conflict
 */
export class PluginDependencyError extends PluginError {
  constructor(pluginId: string, dependencyId: string) {
    super(pluginId, `Missing dependency: ${dependencyId}`);
    this.name = 'PluginDependencyError';
  }
}

/**
 * Manager for TRON plugins
 */
export class PluginManager {
  private plugins: Map<string, Plugin> = new Map();
  private loadOrder: string[] = [];
  private agent: BaseAgent;
  private pluginState: Map<string, Record<string, any>> = new Map();
  private pluginConfig: Map<string, PluginConfig> = new Map();
  
  /**
   * Create a new plugin manager for an agent
   */
  constructor(agent: BaseAgent) {
    this.agent = agent;
  }
  
  /**
   * Register a plugin with the manager
   */
  public registerPlugin(plugin: Plugin): void {
    if (this.plugins.has(plugin.metadata.id)) {
      throw new PluginError(plugin.metadata.id, 'Plugin with this ID is already registered');
    }
    
    // Check agent type compatibility
    if (plugin.metadata.agentTypes && 
        !plugin.metadata.agentTypes.includes(this.agent.getType())) {
      throw new PluginError(
        plugin.metadata.id, 
        `Plugin is not compatible with agent type ${this.agent.getType()}`
      );
    }
    
    // Initialize plugin state and config
    this.pluginState.set(plugin.metadata.id, {});
    this.pluginConfig.set(plugin.metadata.id, plugin.config || {});
    
    // Register the plugin
    plugin.enabled = false;
    plugin.state = {};
    this.plugins.set(plugin.metadata.id, plugin);
  }
  
  /**
   * Load a plugin
   */
  public async loadPlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    
    if (!plugin) {
      throw new PluginError(pluginId, 'Plugin not found');
    }
    
    if (plugin.enabled) {
      return; // Already loaded
    }
    
    // Check dependencies
    if (plugin.metadata.dependencies) {
      for (const dependencyId of plugin.metadata.dependencies) {
        const dependency = this.plugins.get(dependencyId);
        
        if (!dependency) {
          throw new PluginDependencyError(pluginId, dependencyId);
        }
        
        if (!dependency.enabled) {
          // Load dependency first
          await this.loadPlugin(dependencyId);
        }
      }
    }
    
    try {
      // Create plugin API
      const api = this.createPluginAPI(plugin);
      plugin.api = api;
      
      // Initialize the plugin
      await plugin.initialize(api);
      
      // Call the onLoad hook
      if (plugin.hooks.onLoad) {
        await plugin.hooks.onLoad();
      }
      
      // Mark as enabled
      plugin.enabled = true;
      this.loadOrder.push(pluginId);
      
      console.log(`Plugin ${plugin.metadata.name} (${pluginId}) loaded successfully`);
    } catch (error: unknown) {
      throw new PluginError(pluginId, `Failed to load plugin: ${getErrorMessage(error)}`);
    }
  }
  
  /**
   * Load multiple plugins in dependency order
   */
  public async loadPlugins(pluginIds: string[]): Promise<void> {
    // Build a dependency graph and sort
    const pluginsToLoad = this.sortPluginsByDependency(pluginIds);
    
    // Load each plugin in order
    for (const pluginId of pluginsToLoad) {
      await this.loadPlugin(pluginId);
    }
  }
  
  /**
   * Sort plugins by dependency order
   */
  private sortPluginsByDependency(pluginIds: string[]): string[] {
    // Map of plugin ID to dependencies
    const dependencyMap = new Map<string, Set<string>>();
    const result: string[] = [];
    const visited = new Set<string>();
    const processing = new Set<string>();
    
    // Build dependency map
    for (const pluginId of pluginIds) {
      const plugin = this.plugins.get(pluginId);
      
      if (plugin) {
        const dependencies = new Set<string>();
        
        if (plugin.metadata.dependencies) {
          plugin.metadata.dependencies.forEach(depId => {
            // Only add dependencies that are in our list
            if (pluginIds.includes(depId)) {
              dependencies.add(depId);
            }
          });
        }
        
        dependencyMap.set(pluginId, dependencies);
      }
    }
    
    // Depth-first traversal function
    const visit = (pluginId: string) => {
      if (visited.has(pluginId)) return;
      if (processing.has(pluginId)) {
        throw new PluginError(pluginId, 'Circular dependency detected');
      }
      
      processing.add(pluginId);
      
      const dependencies = dependencyMap.get(pluginId);
      if (dependencies) {
        for (const depId of dependencies) {
          visit(depId);
        }
      }
      
      processing.delete(pluginId);
      visited.add(pluginId);
      result.push(pluginId);
    };
    
    // Visit each plugin
    for (const pluginId of pluginIds) {
      if (!visited.has(pluginId)) {
        visit(pluginId);
      }
    }
    
    return result;
  }
  
  /**
   * Unload a plugin
   */
  public async unloadPlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    
    if (!plugin) {
      throw new PluginError(pluginId, 'Plugin not found');
    }
    
    if (!plugin.enabled) {
      return; // Already unloaded
    }
    
    // Check if other plugins depend on this one
    for (const [id, p] of this.plugins.entries()) {
      if (!p.enabled) continue;
      
      if (p.metadata.dependencies?.includes(pluginId)) {
        throw new PluginError(pluginId, `Cannot unload plugin because ${id} depends on it`);
      }
    }
    
    try {
      // Call the onUnload hook
      if (plugin.hooks.onUnload) {
        await plugin.hooks.onUnload();
      }
      
      // Mark as disabled
      plugin.enabled = false;
      this.loadOrder = this.loadOrder.filter(id => id !== pluginId);
      
      console.log(`Plugin ${plugin.metadata.name} (${pluginId}) unloaded successfully`);
    } catch (error: unknown) {
      throw new PluginError(pluginId, `Failed to unload plugin: ${getErrorMessage(error)}`);
    }
  }
  
  /**
   * Unload all plugins in reverse load order
   */
  public async unloadAllPlugins(): Promise<void> {
    // Unload in reverse order of loading
    const reverseOrder = [...this.loadOrder].reverse();
    
    for (const pluginId of reverseOrder) {
      await this.unloadPlugin(pluginId);
    }
  }
  
  /**
   * Get a plugin by ID
   */
  public getPlugin(pluginId: string): Plugin | undefined {
    return this.plugins.get(pluginId);
  }
  
  /**
   * Get all loaded plugins
   */
  public getLoadedPlugins(): Plugin[] {
    return Array.from(this.plugins.values()).filter(p => p.enabled);
  }
  
  /**
   * Get all registered plugins
   */
  public getAllPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }
  
  /**
   * Create the API for a plugin
   */
  private createPluginAPI(plugin: Plugin): PluginAPI {
    const pluginId = plugin.metadata.id;
    
    return {
      registerMessageHandler: (commandOrEvent: string, handler: MessageHandler) => {
        // Prefix with plugin ID to avoid collisions
        const handlerId = `plugin:${pluginId}:${commandOrEvent}`;
        (this.agent as any).registerMessageHandler(handlerId, handler);
      },
      
      unregisterMessageHandler: (commandOrEvent: string) => {
        const handlerId = `plugin:${pluginId}:${commandOrEvent}`;
        (this.agent as any).unregisterMessageHandler(handlerId);
      },
      
      addCapability: (capability: string) => {
        this.agent.addCapability(`${pluginId}:${capability}`);
      },
      
      removeCapability: (capability: string) => {
        this.agent.removeCapability(`${pluginId}:${capability}`);
      },
      
      getConfig: <T>(key: string): T | undefined => {
        const config = this.pluginConfig.get(pluginId);
        return config ? config[key] as T : undefined;
      },
      
      setConfig: <T>(key: string, value: T): void => {
        const config = this.pluginConfig.get(pluginId) || {};
        config[key] = value;
        this.pluginConfig.set(pluginId, config);
      },
      
      getState: <T>(key: string): T | undefined => {
        const state = this.pluginState.get(pluginId);
        return state ? state[key] as T : undefined;
      },
      
      setState: <T>(key: string, value: T): void => {
        const state = this.pluginState.get(pluginId) || {};
        state[key] = value;
        this.pluginState.set(pluginId, state);
        
        // Update the plugin's local state for convenience
        plugin.state = state;
      },
      
      getPlugin: (otherPluginId: string): Plugin | undefined => {
        return this.getPlugin(otherPluginId);
      },
      
      log: {
        debug: (message: string, ...args: any[]) => {
          console.debug(`[Plugin:${plugin.metadata.name}] ${message}`, ...args);
        },
        info: (message: string, ...args: any[]) => {
          console.info(`[Plugin:${plugin.metadata.name}] ${message}`, ...args);
        },
        warn: (message: string, ...args: any[]) => {
          console.warn(`[Plugin:${plugin.metadata.name}] ${message}`, ...args);
        },
        error: (message: string, ...args: any[]) => {
          console.error(`[Plugin:${plugin.metadata.name}] ${message}`, ...args);
        }
      }
    };
  }
  
  /**
   * Invoke a hook on all loaded plugins
   */
  public async invokeHook<T extends keyof PluginHooks>(
    hook: T,
    ...args: Parameters<NonNullable<PluginHooks[T]>>
  ): Promise<void> {
    for (const pluginId of this.loadOrder) {
      const plugin = this.plugins.get(pluginId);
      
      if (!plugin || !plugin.enabled) continue;
      
      const hookFn = plugin.hooks[hook];
      if (hookFn) {
        try {
          // @ts-ignore - We can't easily type this correctly
          await hookFn(...args);
        } catch (error: unknown) {
          console.error(`Error invoking ${hook} hook on plugin ${pluginId}: ${getErrorMessage(error)}`);
        }
      }
    }
  }
  
  /**
   * Apply a middleware-like hook to a message
   */
  public async applyMessageHook<T extends 'onBeforeMessageSend' | 'onAfterMessageReceive'>(
    hook: T,
    message: Message
  ): Promise<Message> {
    let result = message;
    
    for (const pluginId of this.loadOrder) {
      const plugin = this.plugins.get(pluginId);
      
      if (!plugin || !plugin.enabled) continue;
      
      const hookFn = plugin.hooks[hook];
      if (hookFn) {
        try {
          // @ts-ignore - We can't easily type this correctly
          const nextMessage = await hookFn(result);
          if (nextMessage) {
            result = nextMessage;
          }
        } catch (error: unknown) {
          console.error(`Error applying ${hook} hook on plugin ${pluginId}: ${getErrorMessage(error)}`);
        }
      }
    }
    
    return result;
  }
  
  /**
   * Save plugin state
   */
  public getSerializableState(): Record<string, any> {
    const state: Record<string, any> = {};
    
    for (const [pluginId, pluginState] of this.pluginState.entries()) {
      state[pluginId] = pluginState;
    }
    
    return state;
  }
  
  /**
   * Load plugin state
   */
  public setSerializableState(state: Record<string, any>): void {
    for (const pluginId of Object.keys(state)) {
      const plugin = this.plugins.get(pluginId);
      
      if (plugin) {
        this.pluginState.set(pluginId, state[pluginId] || {});
        plugin.state = state[pluginId] || {};
      }
    }
  }
  
  /**
   * Save plugin configuration
   */
  public getSerializableConfig(): Record<string, any> {
    const config: Record<string, any> = {};
    
    for (const [pluginId, pluginConfig] of this.pluginConfig.entries()) {
      config[pluginId] = pluginConfig;
    }
    
    return config;
  }
  
  /**
   * Load plugin configuration
   */
  public setSerializableConfig(config: Record<string, any>): void {
    for (const pluginId of Object.keys(config)) {
      const plugin = this.plugins.get(pluginId);
      
      if (plugin) {
        this.pluginConfig.set(pluginId, config[pluginId] || {});
        plugin.config = config[pluginId] || {};
      }
    }
  }
} 