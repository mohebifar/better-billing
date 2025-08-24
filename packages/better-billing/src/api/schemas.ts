import { z } from 'zod';

// Base schemas
export const CustomerSchema = z.object({
  id: z.string(),
  billableId: z.string(),
  billableType: z.string(),
  providerId: z.string(),
  providerCustomerId: z.string(),
  email: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const SubscriptionSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  providerId: z.string(),
  providerSubscriptionId: z.string(),
  status: z.string(),
  productId: z.string(),
  priceId: z.string(),
  quantity: z.number().optional(),
  currentPeriodStart: z.date(),
  currentPeriodEnd: z.date(),
  cancelAt: z.date().optional(),
  canceledAt: z.date().optional(),
  endedAt: z.date().optional(),
  trialEnd: z.date().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const UsageSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  subscriptionItemId: z.string().optional(),
  productId: z.string(),
  quantity: z.number(),
  timestamp: z.date(),
  metadata: z.record(z.string(), z.any()).optional(),
  idempotencyKey: z.string().optional(),
});

export const InvoiceSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  subscriptionId: z.string().optional(),
  providerId: z.string(),
  providerInvoiceId: z.string(),
  number: z.string(),
  status: z.string(),
  amount: z.number(),
  currency: z.string(),
  paidAt: z.date().optional(),
  dueDate: z.date().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  createdAt: z.date(),
});

export const PaymentMethodSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  providerId: z.string(),
  providerPaymentMethodId: z.string(),
  type: z.string(),
  last4: z.string().optional(),
  brand: z.string().optional(),
  isDefault: z.boolean(),
  metadata: z.record(z.string(), z.any()).optional(),
});

// Request schemas
export const CreateCustomerRequestSchema = z.object({
  billableId: z.string(),
  billableType: z.string().default('user'),
  email: z.string().optional(),
  name: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const GetCustomerRequestSchema = z
  .object({
    customerId: z.string().optional(),
    billableId: z.string().optional(),
  })
  .refine((data) => data.customerId || data.billableId, {
    message: 'Either customerId or billableId must be provided',
  });

export const UpdateCustomerRequestSchema = z.object({
  customerId: z.string(),
  email: z.string().optional(),
  name: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const SubscribeRequestSchema = z.object({
  customerId: z.string(),
  priceId: z.string(),
  quantity: z.number().default(1),
  trialDays: z.number().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const UpdateSubscriptionRequestSchema = z.object({
  subscriptionId: z.string(),
  priceId: z.string().optional(),
  quantity: z.number().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const CancelSubscriptionRequestSchema = z.object({
  subscriptionId: z.string(),
  immediately: z.boolean().default(false),
});

export const ResumeSubscriptionRequestSchema = z.object({
  subscriptionId: z.string(),
});

export const GetSubscriptionsRequestSchema = z.object({
  customerId: z.string(),
  status: z.string().optional(),
});

export const CreateCheckoutRequestSchema = z.object({
  customerId: z.string(),
  priceId: z.string(),
  quantity: z.number().default(1),
  successUrl: z.string(),
  cancelUrl: z.string(),
  mode: z.string().default('subscription'),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const CreatePortalRequestSchema = z.object({
  customerId: z.string(),
  returnUrl: z.string().optional(),
});

export const ReportUsageRequestSchema = z.object({
  subscriptionItemId: z.string(),
  quantity: z.number(),
  timestamp: z.date().optional(),
  idempotencyKey: z.string().optional(),
});

export const GetUsageRequestSchema = z.object({
  subscriptionItemId: z.string(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
});

export const GetInvoicesRequestSchema = z.object({
  customerId: z.string(),
  status: z.string().optional(),
});

export const DownloadInvoiceRequestSchema = z.object({
  invoiceId: z.string(),
});

export const AddPaymentMethodRequestSchema = z.object({
  customerId: z.string(),
  paymentMethodId: z.string(),
  setDefault: z.boolean().default(false),
});

export const RemovePaymentMethodRequestSchema = z.object({
  paymentMethodId: z.string(),
});

export const SetDefaultPaymentMethodRequestSchema = z.object({
  customerId: z.string(),
  paymentMethodId: z.string(),
});

export const GetPaymentMethodsRequestSchema = z.object({
  customerId: z.string(),
});

export const HandleWebhookRequestSchema = z.object({
  body: z.string(),
  signature: z.string(),
});

// Response schemas
export const CheckoutSessionSchema = z.object({
  id: z.string(),
  url: z.string(),
  expiresAt: z.date(),
});

export const PortalSessionSchema = z.object({
  id: z.string(),
  url: z.string(),
});

export const UsageRecordSchema = z.object({
  id: z.string(),
  quantity: z.number(),
  timestamp: z.date(),
});

export const InvoiceDownloadSchema = z.object({
  url: z.string(),
  contentType: z.string(),
});

export const WebhookResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export const SuccessResponseSchema = z.object({
  success: z.boolean(),
});

// Error schema
export const ErrorResponseSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
  code: z.string().optional(),
});
