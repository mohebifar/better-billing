import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll } from 'vitest';

let pglite: PGlite;
beforeAll(async () => {
  pglite = new PGlite();
});

afterAll(async () => {
  await pglite.close();
});

export { pglite };
