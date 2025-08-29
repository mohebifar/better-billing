import { defineBuildConfig } from "unbuild";

export default defineBuildConfig({
  entries: [
    "./src/index.ts",

    // Plugins
    "./src/plugins/core/index.ts",
    "./src/plugins/stripe/index.ts",

    // Integrations
    "./src/integrations/next-js.ts",
    "./src/integrations/node.ts",
    "./src/integrations/react-start.ts",
    "./src/integrations/solid-start.ts",
    "./src/integrations/svelte-kit.ts",
  ],
  declaration: true,
  clean: true,
  rollup: {
    emitCJS: true,
  },
  externals: ["stripe"],
  failOnWarn: false,
});
