import type { BetterBilling } from '../types';

/**
 * Solid Start handler adapter for Better Billing
 * Converts Better Call router handler to Solid Start format
 */
export function toSolidStartHandler(billing: BetterBilling) {
  const handler = async (event: { request: Request }) => {
    return billing.api.handler(event.request);
  };

  return {
    GET: handler,
    POST: handler,
    PUT: handler,
    DELETE: handler,
    PATCH: handler,
  };
}
