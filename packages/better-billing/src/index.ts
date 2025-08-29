import {
  type DatabaseAdapter,
  type MergeSchemas,
  mergeSchema,
} from "@better-billing/db";
import type { Endpoint } from "better-call";
import { createAPIRouter } from "./api/router";
import type {
  DependencyInjection,
  InferPluginFromFactoryContainerArray,
  PluginFactoryContainer,
} from "./types/main-types";
import type {
  ExtractProvidersFromAllPlugins,
  MergePaymentProviderImplementations,
} from "./types/payment-provider-types";
import type { ExtractSchemaFromPlugins } from "./types/schema-types";

export * from "./plugin-factory";

interface BetterBillingOptions<
  DBAdapter extends DatabaseAdapter<any, any>,
  Plugins extends readonly PluginFactoryContainer<any, any>[]
> {
  adapter: DBAdapter;
  plugins: Plugins;
  basePath?: string;
}

export const betterBilling = <
  DBAdapter extends DatabaseAdapter<any, any>,
  const Plugins extends readonly PluginFactoryContainer<any, any>[]
>(
  options: BetterBillingOptions<DBAdapter, Plugins>
) => {
  const { plugins: pluginFactories } = options;

  const dependencies = {
    db: () => {
      throw new Error("Cannot call db() before plugins are initialized");
    },
    withExtras() {
      return this;
    },
  } as unknown as DependencyInjection<Plugins, any>;

  const plugins = pluginFactories.map((pluginFactory) =>
    pluginFactory.$init(dependencies)
  ) as InferPluginFromFactoryContainerArray<Plugins>;

  const allPluginsSchemas = plugins
    .map((plugin) => plugin.schema)
    .filter((v) => v !== undefined);

  const providers = plugins
    .map((plugin) => plugin.providers)
    .filter((v) => v !== undefined)
    .reduce((acc, curr) => {
      for (const provider of curr) {
        if (!acc[provider.providerId]) {
          acc[provider.providerId] = {};
        }
        Object.assign(acc[provider.providerId], provider.methods);
      }
      return acc;
    }, {}) as unknown as MergePaymentProviderImplementations<
    ExtractProvidersFromAllPlugins<
      InferPluginFromFactoryContainerArray<Plugins>
    >
  >;

  const mergedSchema = mergeSchema(...allPluginsSchemas) as MergeSchemas<
    ExtractSchemaFromPlugins<InferPluginFromFactoryContainerArray<Plugins>>
  >;

  const endpoints = plugins
    .map((plugin) => plugin.endpoints as Record<string, Endpoint> | undefined)
    .filter((v) => v !== undefined)
    .reduce((acc, curr) => {
      for (const [key, value] of Object.entries(curr)) {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, Endpoint>);

  const api = createAPIRouter(endpoints, {
    basePath: options.basePath ?? "/api/billing",
  });

  return {
    getMergedSchema: () => mergedSchema,
    getMergedProviders: () => providers,
    providers: providers,
    api,
  };
};
