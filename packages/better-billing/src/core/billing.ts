import type { DatabaseAdapter } from '../adapters/types';
import { createBillingRouter } from '../api/router';
import type {
  BetterBilling,
  BetterBillingOptions,
  Customer,
  InferredTypes,
  Invoice,
  PaymentMethod,
  PaymentProvider,
  Subscription,
  Usage,
} from '../types';
import { HookManager } from './hooks';
import { PluginManager } from './plugins';
import { SchemaManager } from './schema';

export class BillingCore implements BetterBilling {
  private readonly options: BetterBillingOptions;
  private readonly db: DatabaseAdapter;
  private readonly provider: PaymentProvider | undefined;
  private readonly schemaManager: SchemaManager;
  private readonly hookManager: HookManager;
  private readonly pluginManager: PluginManager;

  public readonly api: ReturnType<typeof createBillingRouter>;
  public readonly handler: (request: Request) => Promise<Response>;
  public readonly $Infer: InferredTypes;

  constructor(options: BetterBillingOptions) {
    this.options = options;
    this.db = options.database;
    this.provider = options.provider;

    // Initialize managers
    this.schemaManager = new SchemaManager();
    this.hookManager = new HookManager();
    this.pluginManager = new PluginManager(this.hookManager);

    // Load plugins
    if (options.plugins) {
      options.plugins.forEach((plugin) => {
        this.pluginManager.register(plugin);
      });
    }

    // Create Better Call router with endpoints
    this.api = createBillingRouter(this);

    // Create request handler from router
    this.handler = this.api.router.handler;

    // Set up type inference
    this.$Infer = this.createInferredTypes();
  }

  // Core database operations with hooks
  async createCustomer(data: Partial<Customer>): Promise<Customer> {
    await this.hookManager.runHook('beforeCustomerCreate', { data });

    const customer = await this.db.create<Customer>('customer', {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await this.hookManager.runHook('afterCustomerCreate', { customer });

    return customer;
  }

  async getCustomer(where: any): Promise<Customer | null> {
    return await this.db.findOne<Customer>('customer', where);
  }

  async updateCustomer(id: string, data: Partial<Customer>): Promise<Customer> {
    return await this.db.update<Customer>(
      'customer',
      { id },
      {
        ...data,
        updatedAt: new Date(),
      }
    );
  }

  async createSubscription(data: Partial<Subscription>): Promise<Subscription> {
    const customer = await this.getCustomer({ id: data.customerId });
    if (!customer) {
      throw new Error('Customer not found');
    }

    await this.hookManager.runHook('beforeSubscribe', {
      customer,
      priceId: data.priceId,
      quantity: data.quantity,
    });

    const subscription = await this.db.create<Subscription>('subscription', {
      ...data,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await this.hookManager.runHook('afterSubscribe', {
      subscription,
      customer,
    });

    return subscription;
  }

  async getSubscription(where: any): Promise<Subscription | null> {
    return await this.db.findOne<Subscription>('subscription', where);
  }

  async getSubscriptions(where: any): Promise<Subscription[]> {
    return await this.db.findMany<Subscription>('subscription', where);
  }

  async updateSubscription(id: string, data: Partial<Subscription>): Promise<Subscription> {
    return await this.db.update<Subscription>(
      'subscription',
      { id },
      {
        ...data,
        updatedAt: new Date(),
      }
    );
  }

  async cancelSubscription(id: string, immediately = false): Promise<Subscription> {
    const subscription = await this.getSubscription({ id });
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    const customer = await this.getCustomer({ id: subscription.customerId });
    if (!customer) {
      throw new Error('Customer not found');
    }

    await this.hookManager.runHook('beforeCancel', {
      subscription,
      customer,
    });

    const updateData: Partial<Subscription> = {
      canceledAt: new Date(),
      status: 'canceled',
    };

    if (!immediately) {
      updateData.cancelAt = subscription.currentPeriodEnd;
    } else {
      updateData.endedAt = new Date();
    }

    const updatedSubscription = await this.updateSubscription(id, updateData);

    await this.hookManager.runHook('afterCancel', {
      subscription: updatedSubscription,
      customer,
    });

    return updatedSubscription;
  }

  async reportUsage(data: Partial<Usage>): Promise<Usage> {
    const usage = await this.db.create<Usage>('usage', {
      ...data,
      timestamp: data.timestamp || new Date(),
    });

    const customer = await this.getCustomer({ id: data.customerId });
    if (customer) {
      await this.hookManager.runHook('onUsageReported', { usage, customer });
    }

    return usage;
  }

  async getUsage(where: any): Promise<Usage[]> {
    return await this.db.findMany<Usage>('usage', where);
  }

  async getInvoices(where: any): Promise<Invoice[]> {
    return await this.db.findMany<Invoice>('invoice', where);
  }

  async getPaymentMethods(where: any): Promise<PaymentMethod[]> {
    return await this.db.findMany<PaymentMethod>('paymentMethod', where);
  }

  private createInferredTypes(): InferredTypes {
    return {
      Billable: this.options.billable?.model || 'user',
      Products: this.options.products || {},
      Subscription: {} as Subscription,
      Customer: {} as Customer,
    };
  }

  // Expose internal managers for advanced usage
  get schema() {
    return this.schemaManager;
  }

  get hooks() {
    return this.hookManager;
  }

  get plugins() {
    return this.pluginManager;
  }

  get paymentProvider() {
    return this.provider;
  }
}
