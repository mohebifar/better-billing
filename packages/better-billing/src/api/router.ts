import { createRouter } from 'better-call';
import type { BetterBilling } from '../types';

export function createAPIRouter(billing: BetterBilling) {
  const router = createRouter(billing.endpoints, {
    openapi: {
      disabled: false,
      path: '/api/billing/reference',
      scalar: {
        title: 'Better Billing API',
        description: 'TypeScript-first, provider-agnostic billing infrastructure API',
        theme: 'saturn',
      },
    },
    onError: (error: unknown) => {
      console.error('Better Billing API Error:', error);

      const errorObj = error as { message?: string; name?: string };

      // Return structured error response
      return new Response(
        JSON.stringify({
          error: errorObj.message || 'Internal Server Error',
          code: errorObj.name || 'UNKNOWN_ERROR',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    },
  });

  return {
    router,
    handler: router.handler,
    endpoints: billing.endpoints,
  };
}

// Export types for client
export type BillingRouter = ReturnType<typeof createAPIRouter>['router'];
export type BillingEndpoints = ReturnType<typeof createAPIRouter>['endpoints'];
