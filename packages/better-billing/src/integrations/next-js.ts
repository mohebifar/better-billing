import type { BetterBilling } from '../types';

/**
 * Next.js handler adapter for Better Billing
 * Converts Better Call router handler to Next.js API route format
 */
export function toNextJsHandler(billing: BetterBilling) {
  const handler = async (request: Request) => {
    return billing.api.handler(request);
  };

  return {
    GET: handler,
    POST: handler,
    PUT: handler,
    DELETE: handler,
    PATCH: handler,
  };
}
