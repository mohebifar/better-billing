import type { BillingCore } from '../core/billing';

export interface BillingOptions {
  baseURL?: string;
  basePath?: string;
}

/**
 * SvelteKit handler adapter for Better Billing
 * Converts Better Call router handler to SvelteKit format
 */
export const toSvelteKitHandler = (
  billing:
    | BillingCore
    | {
        handler: (request: Request) => Promise<Response>;
        options?: BillingOptions;
      }
) => {
  const handler =
    billing instanceof Object && 'api' in billing
      ? (billing as BillingCore).api.router.handler
      : billing.handler;

  return (event: { request: Request }) => handler(event.request);
};

/**
 * SvelteKit middleware handler for Better Billing
 * Handles billing routes automatically in SvelteKit hooks
 */
export const svelteKitHandler = async ({
  billing,
  event,
  resolve,
  building,
}: {
  billing: {
    handler: (request: Request) => Promise<Response>;
    options?: BillingOptions;
  };
  event: { request: Request; url: URL };
  resolve: (event: any) => any;
  building: boolean;
}) => {
  if (building) {
    return resolve(event);
  }
  const { request, url } = event;
  if (isBillingPath(url.toString(), billing.options)) {
    return billing.handler(request);
  }
  return resolve(event);
};

/**
 * Checks if the URL path is a billing API path
 */
export function isBillingPath(url: string, options?: BillingOptions) {
  const _url = new URL(url);
  const baseURL = new URL(
    `${options?.baseURL || _url.origin}${options?.basePath || '/api/billing'}`
  );
  if (_url.origin !== baseURL.origin) return false;
  if (
    !_url.pathname.startsWith(
      baseURL.pathname.endsWith('/') ? baseURL.pathname : `${baseURL.pathname}/`
    )
  )
    return false;
  return true;
}
