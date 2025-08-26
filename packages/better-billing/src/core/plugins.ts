import type { Endpoint } from 'better-call';
import type { BillingPlugin, PaymentProvider } from '../types';
import type { HookManager } from './hooks';
import type { SchemaManager } from './schema';

export class PluginManager {
  private plugins: Map<string, BillingPlugin> = new Map();
  private providers: Map<string, PaymentProvider> = new Map();
  private hookManager: HookManager;
  private schemaManager?: SchemaManager;

  constructor(hookManager: HookManager, schemaManager?: SchemaManager) {
    this.hookManager = hookManager;
    this.schemaManager = schemaManager;
  }

  // Register a plugin
  register(plugin: BillingPlugin) {
    if (this.plugins.has(plugin.id)) {
      throw new Error(`Plugin ${plugin.id} is already registered`);
    }

    this.plugins.set(plugin.id, plugin);

    // Register plugin hooks
    if (plugin.hooks) {
      this.hookManager.registerMany(plugin.hooks);
    }

    // Register schema extensions
    if (plugin.schema && this.schemaManager) {
      this.schemaManager.registerExtension(plugin.id, plugin.schema);
    }

    // Register payment providers
    if (plugin.providers) {
      Object.entries(plugin.providers).forEach(([id, provider]) => {
        this.providers.set(id, provider);
      });
    }

    // API endpoints will be registered by the router
  }

  // Get a plugin by ID
  get(id: string): BillingPlugin | undefined {
    return this.plugins.get(id);
  }

  // Get all plugins
  getAll(): BillingPlugin[] {
    return Array.from(this.plugins.values());
  }

  // Check if a plugin is registered
  has(id: string): boolean {
    return this.plugins.has(id);
  }

  // Remove a plugin
  remove(id: string): boolean {
    return this.plugins.delete(id);
  }

  // Get a payment provider by ID
  getProvider(id: string): PaymentProvider | undefined {
    return this.providers.get(id);
  }

  // Get all available providers
  getAllProviders(): Map<string, PaymentProvider> {
    return this.providers;
  }

  getHookManager() {
    return this.hookManager;
  }

  getSchemaManager() {
    return this.schemaManager;
  }

  // Get plugin API endpoints
  getEndpoints() {
    const endpoints: {
      [key: string]: Endpoint;
    } = {};

    this.plugins.forEach((plugin) => {
      if (plugin.endpoints) {
        Object.entries(plugin.endpoints).forEach(([name, endpoint]) => {
          // Prefix endpoint name with plugin ID to avoid conflicts
          endpoints[`${plugin.id}:${name}`] = endpoint;
        });
      }
    });

    return endpoints;
  }
}
