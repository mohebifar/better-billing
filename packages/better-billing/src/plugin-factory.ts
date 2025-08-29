import type { SchemaDefinition } from "@better-billing/db";
import type { Endpoint } from "better-call";
import type {
  Plugin,
  PluginFactory,
  PluginFactoryContainer,
} from "./types/main-types";
import type { PaymentProviderImplementation } from "./types/payment-provider-types";

export const createPlugin = <
  InputPlugins extends PluginFactoryContainer<
    PluginFactoryContainer<any, any>[],
    any
  >[],
  S extends SchemaDefinition,
  P extends PaymentProviderImplementation[],
  E extends Record<string, Endpoint>,
  PF extends PluginFactory<InputPlugins, Plugin<S, P, E>>
>(
  init: PF,
  config: {
    dependsOn: InputPlugins;
  }
): PluginFactoryContainer<InputPlugins, PF> => {
  return {
    $init: init,
    $dependsOn: config.dependsOn,
  };
};
