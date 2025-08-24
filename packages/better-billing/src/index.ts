import { BillingCore } from './core/billing';
import type { BetterBilling, BetterBillingOptions } from './types';

// Main factory function
export function betterBilling(options: BetterBillingOptions): BetterBilling {
  return new BillingCore(options);
}

// Re-export adapters
export { drizzleAdapter } from './adapters/drizzle';
export { prismaAdapter } from './adapters/prisma';

// Re-export providers
export { stripeProvider } from './providers/stripe';
export type { StripeConfig } from './providers/stripe';

export type { BillingEndpoints, BillingRouter } from './api/router';

// Re-export Better Call router
export { createBillingRouter } from './api/router';
// Re-export framework integrations
export { toNextJsHandler } from './integrations/next-js';
export { toNodeHandler } from './integrations/node';
export { toReactStartHandler } from './integrations/react-start';
export { toSolidStartHandler } from './integrations/solid-start';
export { isBillingPath, svelteKitHandler, toSvelteKitHandler } from './integrations/svelte-kit';
// Re-export types
export * from './types';

// Default export
export default betterBilling;
