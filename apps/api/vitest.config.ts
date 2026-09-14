import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // Resolve os aliases de caminho declarados no tsconfig.json nativamente.
    tsconfigPaths: true,
  },
  test: {
    globals: true,
    root: './',
    include: ['**/*.spec.ts'],
    setupFiles: ['./test/setup-env.ts'],
  },
});
