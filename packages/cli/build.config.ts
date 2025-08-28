import { defineBuildConfig } from 'unbuild';

export default defineBuildConfig({
  entries: ['./src/index'],
  declaration: true,
  clean: true,
  rollup: {
    emitCJS: false,
  },
  externals: ['stripe', 'pg', 'mysql2', 'prisma', 'drizzle-orm', '@prisma/client'],
  failOnWarn: false,
});
