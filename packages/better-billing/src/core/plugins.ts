import type { BillingPlugin, PaymentProvider } from '../types';
import type { HookManager } from './hooks';

export class PluginManager {
  private plugins: Map<string, BillingPlugin> = new Map();
  private hookManager: HookManager;

  constructor(hookManager: HookManager) {
    this.hookManager = hookManager;
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

    // TODO: Register schema extensions
    // TODO: Register API endpoints
  }

  // Get a plugin by ID
  get(id: string): BillingPlugin | undefined {
    return this.plugins.get(id);
  }

  // Get all plugins
  getAll(): BillingPlugin[] {
    return Array.from(this.plugins.values());
  }

  // Extend a payment provider with all plugin extensions
  extendProvider(provider: PaymentProvider): PaymentProvider {
    let extended = provider;

    this.plugins.forEach((plugin) => {
      if (plugin.extendProvider) {
        extended = plugin.extendProvider(extended);
      }
    });

    return extended;
  }

  // Check if a plugin is registered
  has(id: string): boolean {
    return this.plugins.has(id);
  }

  // Remove a plugin
  remove(id: string): boolean {
    return this.plugins.delete(id);
  }

  // Get plugin API endpoints
  getEndpoints(): Record<string, any> {
    const endpoints: Record<string, any> = {};

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
