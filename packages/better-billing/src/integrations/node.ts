import type { IncomingHttpHeaders } from 'node:http';
import { toNodeHandler as toNode } from 'better-call/node';
import type { BetterBilling } from '../types';

/**
 * Node.js handler adapter for Better Billing
 * Uses Better Call's built-in Node.js adapter
 */
export const toNodeHandler = (billing: BetterBilling) => {
  return toNode(billing.api.handler);
};

/**
 * Converts Node.js IncomingHttpHeaders to Web Headers
 */
export function fromNodeHeaders(nodeHeaders: IncomingHttpHeaders): Headers {
  const webHeaders = new Headers();
  for (const [key, value] of Object.entries(nodeHeaders)) {
    if (value !== undefined) {
      if (Array.isArray(value)) {
        value.forEach((v) => {
          webHeaders.append(key, v);
        });
      } else {
        webHeaders.set(key, value);
      }
    }
  }
  return webHeaders;
}
