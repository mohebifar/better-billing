import type { BillingCore } from '../core/billing';

/**
 * React Start (TanStack Start) handler adapter for Better Billing
 * Converts Better Call router handler to TanStack Start format
 */
export function toReactStartHandler(
  billing:
    | BillingCore
    | {
        handler: (request: Request) => Promise<Response>;
      }
    | ((request: Request) => Promise<Response>)
) {
  const handler = async (request: Request) => {
    if (billing instanceof Object && 'api' in billing) {
      // BillingCore instance
      return (billing as BillingCore).api.router.handler(request);
    } else if ('handler' in billing) {
      // Handler object
      return billing.handler(request);
    } else {
      // Raw handler function
      return billing(request);
    }
  };

  return {
    GET: handler,
    POST: handler,
    PUT: handler,
    DELETE: handler,
    PATCH: handler,
  };
}
