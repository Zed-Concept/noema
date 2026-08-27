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
    // REVIEW-024 finding 2, narrowed by ruling 28 after REVIEW-025 finding 1
    // to what it enforces. Provider auth state is published through
    // useAuthStatePublisher (auth-state-publisher.ts); THIS rule bars exactly
    // one second-setter shape — a direct named `useState` import from 'react'
    // in auth-provider.tsx. It is a tripwire, not a structural guarantee.
    // The documented bypass (REVIEW-025): a default import destructured
    // under an alias —
    //   import React from 'react';
    //   const { useState: makeState } = React;
    // — mints a setter this rule does not see, with typecheck and the
    // committed source-shape tests staying green. The enumeration test in
    // auth-state-publisher.test.ts pins the CURRENT publishers; neither it
    // nor this rule establishes that no other state channel can exist.
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
