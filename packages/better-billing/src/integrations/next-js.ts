import type { Router } from "better-call";

/**
 * Next.js handler adapter for Better Billing
 * Converts Better Call router handler to Next.js API route format
 */
export function toNextJsHandler(router: Router) {
  const handler = async (request: Request) => {
    return router.handler(request);
  };

  return {
    GET: handler,
    POST: handler,
    PUT: handler,
    DELETE: handler,
    PATCH: handler,
  };
}
