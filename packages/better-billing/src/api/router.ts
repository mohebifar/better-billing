import { createRouter, type Endpoint } from "better-call";

export interface CreateAPIRouterOptions {
  basePath?: string;
}

export function createAPIRouter(
  endpoints: Record<string, Endpoint>,
  options: CreateAPIRouterOptions = {}
) {
  const router = createRouter(endpoints, {
    basePath: options.basePath,
    openapi: {
      disabled: false,
      path: "/reference",
      scalar: {
        title: "Better Billing API",
        description:
          "TypeScript-first, provider-agnostic billing infrastructure API",
        theme: "saturn",
      },
    },
    onError: (error: unknown) => {
      console.error("Better Billing API Error:", error);

      const errorObj = error as { message?: string; name?: string };

      // Return structured error response
      return new Response(
        JSON.stringify({
          error: errorObj.message || "Internal Server Error",
          code: errorObj.name || "UNKNOWN_ERROR",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    },
  });

  return router;
}
