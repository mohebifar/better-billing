import type {
  DatabaseAdapter,
  MergeSchemas,
  SchemaDefinition,
} from "@better-billing/db";
import type { Endpoint } from "better-call";
import type {
  MergePaymentProviderImplementations,
  PaymentProviderImplementation,
} from "./payment-provider-types";
import type { ExtractSchemaFromPlugins } from "./schema-types";

export type Plugin<
  S extends SchemaDefinition,
  P extends PaymentProviderImplementation[],
  E extends Record<string, Endpoint>
> = {
  schema?: S;
  providers?: P;
  endpoints?: E;
};

export type DependencyInjection<
  InputPlugins extends readonly PluginFactoryContainer<any, any>[],
  ExtraSchema extends SchemaDefinition | undefined = undefined,
  _ExtraProviders extends PaymentProviderImplementation[] = [],
  _ExtraEndpoints extends Record<string, Endpoint> = {}
> = {
  db: DatabaseAdapter<
    MergeSchemas<
      [
        ...ExtractSchemaFromPlugins<
          InferPluginFromFactoryContainerArray<InputPlugins>
        >,
        ...(ExtraSchema extends undefined ? [] : [ExtraSchema])
      ]
    >,
    any
  >;
  providers: MergePaymentProviderImplementations<
    InferPluginFromFactoryContainerArray<InputPlugins>
  >;
  // endpoints: ExtractEndpointsFromPlugins<InputPlugins>;
  withExtras: <
    PFC extends PluginFactoryContainer<any, any>
  >() => PFC extends PluginFactoryContainer<any, infer PF>
    ? PF extends PluginFactory<any, infer P>
      ? P extends Plugin<infer S, infer P, infer E>
        ? DependencyInjection<InputPlugins, S, P, E>
        : never
      : never
    : never;
};

export type PluginFactory<
  InputPlugins extends readonly PluginFactoryContainer<any, any>[],
  SelfPlugin extends Plugin<any, any, any>
> = (deps: DependencyInjection<InputPlugins, undefined>) => SelfPlugin;

export interface PluginFactoryContainer<
  InputPlugins extends readonly PluginFactoryContainer<any, any>[],
  PF extends PluginFactory<InputPlugins, Plugin<any, any, any>>
> {
  $init: PF;
  $dependsOn: InputPlugins;
}

export type InferPlugin<Factory extends PluginFactory<any, any>> =
  Factory extends PluginFactory<any, infer P> ? P : never;

export type InferPluginFromFactoryContainerArray<
  T extends readonly PluginFactoryContainer<any, any>[]
> = T extends readonly [infer First, ...infer Rest]
  ? First extends PluginFactoryContainer<any, any>
    ? Rest extends readonly PluginFactoryContainer<any, any>[]
      ? [
          InferPluginFromFactoryContainer<First>,
          ...InferPluginFromFactoryContainerArray<Rest>
        ]
      : [InferPluginFromFactoryContainer<First>]
    : never
  : [];

export type InferPluginFromFactoryContainer<
  T extends PluginFactoryContainer<any, any>
> = T extends PluginFactoryContainer<any, infer PF> ? InferPlugin<PF> : never;
