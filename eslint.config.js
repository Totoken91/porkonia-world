import globals from 'globals';

// Règles de justesse seulement : pas de mise en forme. Le but est d'attraper une variable non importée,
// un import oublié ou du code mort avant qu'ils ne cassent le jeu au milieu d'une balade.
export default [
  { ignores: ['dist/', 'node_modules/', 'data/', 'bake/'] },
  {
    files: ['src/**/*.js'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: globals.browser },
    rules: {
      'no-undef': 'error',
      'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none', varsIgnorePattern: '^_' }],
      'no-dupe-keys': 'error',
      'no-unreachable': 'error',
      'no-const-assign': 'error',
      'no-import-assign': 'error',
      'no-self-assign': 'error',
      'no-cond-assign': 'error',
      'no-fallthrough': 'error',
      'no-loss-of-precision': 'error',
      'use-isnan': 'error',
      'valid-typeof': 'error',
    },
  },
  { files: ['tools/**/*.{js,mjs}', '*.js'], languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: { ...globals.node, ...globals.browser } }, rules: { 'no-undef': 'error' } },
];
