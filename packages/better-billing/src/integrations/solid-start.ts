import type { Router } from "better-call";

/**
 * Solid Start handler adapter for Better Billing
 * Converts Better Call router handler to Solid Start format
 */
export function toSolidStartHandler(router: Router) {
  const handler = async (event: { request: Request }) => {
    return router.handler(event.request);
  };

  return {
    GET: handler,
    POST: handler,
    PUT: handler,
    DELETE: handler,
    PATCH: handler,
  };
}
