import type { BetterBilling } from '../types';

/**
 * React Start (TanStack Start) handler adapter for Better Billing
 * Converts Better Call router handler to TanStack Start format
 */
export function toReactStartHandler(billing: BetterBilling) {
  const handler = async (request: Request) => {
    return (billing as BetterBilling).api.handler(request);
  };

  return {
    GET: handler,
    POST: handler,
    PUT: handler,
    DELETE: handler,
    PATCH: handler,
  };
}
