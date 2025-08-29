import type { Plugin } from "./main-types";

export type ExtractSchemaFromPlugins<
  InputPlugins extends readonly Plugin<any, any, any>[]
> = InputPlugins extends readonly []
  ? []
  : InputPlugins extends readonly [infer First, ...infer Rest]
  ? First extends Plugin<infer S, any, any>
    ? S extends undefined
      ? Rest extends readonly Plugin<any, any, any>[]
        ? ExtractSchemaFromPlugins<Rest>
        : []
      : Rest extends readonly Plugin<any, any, any>[]
      ? [S, ...ExtractSchemaFromPlugins<Rest>]
      : [S]
    : Rest extends readonly Plugin<any, any, any>[]
    ? ExtractSchemaFromPlugins<Rest>
    : []
  : never;
