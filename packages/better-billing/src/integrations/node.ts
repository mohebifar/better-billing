import type { IncomingHttpHeaders } from "node:http";
import type { Router } from "better-call";
import { toNodeHandler as toNode } from "better-call/node";

/**
 * Node.js handler adapter for Better Billing
 * Uses Better Call's built-in Node.js adapter
 */
export const toNodeHandler = (router: Router) => {
  return toNode(router.handler);
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
