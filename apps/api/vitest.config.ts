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
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.spec.ts',
        'src/**/*.module.ts',
        'src/**/*.dto.ts',
        'src/**/*.controller.ts',
        'src/main.ts',
        'src/setup-app.ts',
        'src/**/index.ts',
        'src/database/migrations/**',
      ],
      // Pisos mínimos de cobertura global (baseline atual). Ao aumentar a
      // cobertura real, eleve estes valores para evitar regressão.
      thresholds: {
        statements: 50,
        branches: 35,
        functions: 30,
        lines: 53,
      },
    },
  },
});
