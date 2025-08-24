import type { BillingCore } from '../core/billing';

/**
 * Solid Start handler adapter for Better Billing
 * Converts Better Call router handler to Solid Start format
 */
export function toSolidStartHandler(
  billing:
    | BillingCore
    | {
        handler: (request: Request) => Promise<Response>;
      }
    | ((request: Request) => Promise<Response>)
) {
  const handler = async (event: { request: Request }) => {
    if (billing instanceof Object && 'api' in billing) {
      // BillingCore instance
      return (billing as BillingCore).api.router.handler(event.request);
    } else if ('handler' in billing) {
      // Handler object
      return billing.handler(event.request);
    } else {
      // Raw handler function
      return billing(event.request);
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
