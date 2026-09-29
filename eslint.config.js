import tsParser from '@typescript-eslint/parser';

export default [
  { ignores: ['dist/**', '.astro/**', 'node_modules/**'] },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: { sourceType: 'module', ecmaVersion: 'latest' },
    },
    rules: { 'no-unused-vars': 'off', 'no-constant-condition': 'error' },
  },
];
