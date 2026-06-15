import init from 'eslint-config-metarhia';

export default [
  ...init,
  {
    files: ['**/*.{js,mjs}'],
    languageOptions: {
      sourceType: 'module',
    },
  },
  {
    files: ['static/**/*.mjs'],
    languageOptions: {
      globals: {
        customElements: 'readonly',
      },
    },
    rules: {
      strict: 'off',
    },
  },
];
