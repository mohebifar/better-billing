import { defineBuildConfig } from "unbuild";

export default defineBuildConfig({
  entries: [
    {
      input: "./src/index.ts",
      name: "index",
    },
    {
      input: "./src/adapters/drizzle.ts",
      name: "adapters/drizzle",
    },
    {
      input: "./src/generators/drizzle.ts",
      name: "generators/drizzle",
    },
  ],
  declaration: true,
  clean: true,
  rollup: {
    emitCJS: true,
  },
  externals: ["drizzle-orm"],
  failOnWarn: false,
});
