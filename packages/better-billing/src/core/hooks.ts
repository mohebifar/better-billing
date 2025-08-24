import type { BillingHooks, Hook } from '../types';

export class HookManager {
  private hooks: Map<string, Hook<unknown>[]> = new Map();

  // Register a hook
  register<T>(hookName: keyof BillingHooks, handler: Hook<T>) {
    const existing = this.hooks.get(hookName) || [];
    existing.push(handler as Hook<unknown>);
    this.hooks.set(hookName, existing);
  }

  // Register multiple hooks
  registerMany(hooks: Partial<BillingHooks>) {
    (Object.entries(hooks) as Array<[keyof BillingHooks, Hook<unknown> | undefined]>).forEach(
      ([name, handler]) => {
        if (handler) {
          this.register(name, handler);
        }
      }
    );
  }

  // Run all handlers for a hook
  async runHook<T>(hookName: keyof BillingHooks, context: T): Promise<void> {
    const handlers = this.hooks.get(hookName) || [];

    for (const handler of handlers) {
      try {
        await handler(context);
      } catch (error) {
        console.error(`Error in hook ${hookName}:`, error);
        // Continue execution - don't re-throw errors to allow other hooks to run
      }
    }
  }

  // Check if a hook has handlers
  hasHandlers(hookName: keyof BillingHooks): boolean {
    const handlers = this.hooks.get(hookName);
    return handlers ? handlers.length > 0 : false;
  }

  // Clear all hooks (useful for testing)
  clear() {
    this.hooks.clear();
  }

  // Remove specific hook handler
  remove<T>(hookName: keyof BillingHooks, handler: Hook<T>) {
    const handlers = this.hooks.get(hookName);
    if (handlers) {
      const index = handlers.indexOf(handler as Hook<unknown>);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }
}
