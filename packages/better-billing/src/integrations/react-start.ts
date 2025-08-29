import type { Router } from "better-call";

/**
 * React Start (TanStack Start) handler adapter for Better Billing
 * Converts Better Call router handler to TanStack Start format
 */
export function toReactStartHandler(router: Router) {
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
