/**
 * Configuração do commitlint.
 *
 * Valida as mensagens de commit no padrão Conventional Commits, garantindo
 * histórico consistente e geração de CHANGELOG a partir de `feat`/`fix`.
 */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'subject-case': [2, 'never', ['sentence-case', 'start-case', 'pascal-case', 'upper-case']],
    'header-max-length': [2, 'always', 100],
  },
};
