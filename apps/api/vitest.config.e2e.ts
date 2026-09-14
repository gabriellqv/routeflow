import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    setupFiles: ['./test/setup-env.ts'],
    // Os testes e2e compartilham o mesmo banco; executá-los em sequência
    // evita corridas entre migrações e operações de limpeza.
    fileParallelism: false,
  },
});
