import { createAPIRouter } from '../api/router';
import { corePlugin } from '../plugins/core-plugin';
import type {
  BetterBilling,
  BetterBillingOptions,
  BillingPlugin,
  BillingPluginFactory,
  DatabaseAdapter,
} from '../types';
import { HookManager } from './hooks';
import { PluginManager } from './plugins';
import { SchemaManager } from './schema';

export const betterBilling = <
  TDatabase extends DatabaseAdapter,
  TPlugins extends readonly BillingPluginFactory<BillingPlugin>[],
>(
  config: BetterBillingOptions<TDatabase, TPlugins>
) => {
  type TBetterBilling = BetterBilling<typeof config>;

  const schemaManager = new SchemaManager();
  const hookManager = new HookManager();
  const pluginManager = new PluginManager(hookManager, schemaManager);

  const getProvider = () => {
    const providerId = config.provider;
    const provider = pluginManager.getProvider(providerId);
    if (!provider) {
      throw new Error(
        `Provider "${providerId}" not found. Make sure the provider plugin is registered.`
      );
    }
    return provider;
  };

  const billing = {
    config,
    methods: {} as TBetterBilling['methods'],
    api: {
      handler: (_request: Request) =>
        Promise.resolve(new Response('Not implemented', { status: 501 })),
    },
    endpoints: {} as TBetterBilling['endpoints'],
    getProvider,
    pluginManager,
  };

  const ref = { current: billing };

  const coreContext = { getProvider, hookManager };
  const basePlugins = [corePlugin(config.database, coreContext)];
  const userPlugins = config.plugins?.map((pluginFactory) => pluginFactory(ref)) ?? [];

  const allPlugins = [...basePlugins, ...userPlugins];

  for (const plugin of allPlugins) {
    pluginManager.register(plugin);

    if (plugin.methods && plugin.id) {
      (billing.methods as any)[plugin.id] = plugin.methods;
    }

    if (plugin.endpoints) {
      billing.endpoints = { ...billing.endpoints, ...plugin.endpoints };
    }
  }

  const apiRouter = createAPIRouter(billing);
  billing.api.handler = apiRouter.handler;

  return billing;
};
