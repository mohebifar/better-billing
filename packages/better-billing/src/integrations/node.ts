import type { IncomingHttpHeaders } from 'node:http';
import { toNodeHandler as toNode } from 'better-call/node';
import type { BillingCore } from '../core/billing';

/**
 * Node.js handler adapter for Better Billing
 * Uses Better Call's built-in Node.js adapter
 */
export const toNodeHandler = (
  billing:
    | BillingCore
    | {
        handler: (request: Request) => Promise<Response>;
      }
    | ((request: Request) => Promise<Response>)
) => {
  // Import Better Call's Node handler dynamically to avoid TypeScript issues

  if (billing instanceof Object && 'api' in billing) {
    // BillingCore instance
    return toNode((billing as BillingCore).api.router.handler);
  } else if ('handler' in billing) {
    // Handler object
    return toNode(billing.handler);
  } else {
    // Raw handler function
    return toNode(billing);
  }
};

/**
 * Converts Node.js IncomingHttpHeaders to Web Headers
 */
export function fromNodeHeaders(nodeHeaders: IncomingHttpHeaders): Headers {
  const webHeaders = new Headers();
  for (const [key, value] of Object.entries(nodeHeaders)) {
    if (value !== undefined) {
      if (Array.isArray(value)) {
        value.forEach((v) => webHeaders.append(key, v));
      } else {
        webHeaders.set(key, value);
      }
    }
  }
  return webHeaders;
}
