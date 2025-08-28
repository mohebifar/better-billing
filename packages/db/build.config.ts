import { defineBuildConfig } from "unbuild";

export default defineBuildConfig({
  entries: [
    "./src/index",
    // DB Adapters
    "./src/adapters/drizzle",
  ],
  declaration: true,
  clean: true,
  rollup: {
    emitCJS: true,
  },
  externals: ["drizzle-orm"],
  failOnWarn: false,
});
