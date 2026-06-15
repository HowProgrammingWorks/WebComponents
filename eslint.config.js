import init from 'eslint-config-metarhia';

export default [
  ...init,
  {
    files: ['**/*.js'],
    languageOptions: {
      sourceType: 'module',
    },
  },
  {
    files: ['static/**/*.js'],
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
