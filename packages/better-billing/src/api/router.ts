import { createRouter } from 'better-call';
import type { BillingCore } from '../core/billing';
import {
  addPaymentMethodEndpoint,
  cancelSubscriptionEndpoint,
  createCheckoutEndpoint,
  createCustomerEndpoint,
  createPortalEndpoint,
  downloadInvoiceEndpoint,
  getCustomerEndpoint,
  getInvoicesEndpoint,
  getPaymentMethodsEndpoint,
  getSubscriptionsEndpoint,
  getUsageEndpoint,
  handleWebhookEndpoint,
  removePaymentMethodEndpoint,
  reportUsageEndpoint,
  resumeSubscriptionEndpoint,
  setDefaultPaymentMethodEndpoint,
  subscribeEndpoint,
  updateCustomerEndpoint,
  updateSubscriptionEndpoint,
} from './endpoints';

export function createBillingRouter(billing: BillingCore) {
  // Create all endpoints with billing instance
  const endpoints = {
    // Customer endpoints
    createCustomer: createCustomerEndpoint(billing),
    getCustomer: getCustomerEndpoint(billing),
    updateCustomer: updateCustomerEndpoint(billing),

    // Subscription endpoints
    subscribe: subscribeEndpoint(billing),
    getSubscriptions: getSubscriptionsEndpoint(billing),
    updateSubscription: updateSubscriptionEndpoint(billing),
    cancelSubscription: cancelSubscriptionEndpoint(billing),
    resumeSubscription: resumeSubscriptionEndpoint(billing),

    // Checkout & Portal
    createCheckout: createCheckoutEndpoint(billing),
    createPortal: createPortalEndpoint(billing),

    // Usage
    reportUsage: reportUsageEndpoint(billing),
    getUsage: getUsageEndpoint(billing),

    // Invoices
    getInvoices: getInvoicesEndpoint(billing),
    downloadInvoice: downloadInvoiceEndpoint(billing),

    // Payment Methods
    addPaymentMethod: addPaymentMethodEndpoint(billing),
    removePaymentMethod: removePaymentMethodEndpoint(billing),
    setDefaultPaymentMethod: setDefaultPaymentMethodEndpoint(billing),
    getPaymentMethods: getPaymentMethodsEndpoint(billing),

    // Webhooks
    handleWebhook: handleWebhookEndpoint(billing),
  };

  // Create router with Better Call
  const router = createRouter(endpoints, {
    openapi: {
      disabled: false,
      path: '/api/billing/reference',
      scalar: {
        title: 'Better Billing API',
        description: 'TypeScript-first, provider-agnostic billing infrastructure API',
        theme: 'saturn',
      },
    },
    onError: (error: unknown) => {
      console.error('Better Billing API Error:', error);

      const errorObj = error as { message?: string; name?: string };

      // Return structured error response
      return new Response(
        JSON.stringify({
          error: errorObj.message || 'Internal Server Error',
          code: errorObj.name || 'UNKNOWN_ERROR',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    },
  });

  return {
    router,
    handler: router.handler,
    endpoints,
  };
}

// Export types for client
export type BillingRouter = ReturnType<typeof createBillingRouter>['router'];
export type BillingEndpoints = ReturnType<typeof createBillingRouter>['endpoints'];
