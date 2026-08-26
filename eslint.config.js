// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier/flat');

module.exports = defineConfig([
  expoConfig,
  // Last: turns off rules that would fight Prettier. Formatting is Prettier's job.
  prettierConfig,
  {
    ignores: ['dist/*', '.expo/*', 'coverage/*'],
  },
  {
    // REVIEW-024 finding 2 — the ONE publication barrier. Provider auth state
    // is published only through useAuthStatePublisher (auth-state-publisher.ts),
    // whose raw setter is a closure variable no other scope can name. This rule
    // makes "the provider cannot mint a second setter" a lint-level fact: no
    // useState in auth-provider.tsx, so no setState exists there to call.
    files: ['src/lib/auth/auth-provider.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react',
              importNames: ['useState'],
              message:
                'Publish auth state through useAuthStatePublisher — the REVIEW-024 finding-2 barrier. A second setter here would be an ungated publication route.',
            },
          ],
        },
      ],
    },
  },
]);
