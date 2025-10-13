module.exports = {
  root: true,
  env: { es6: true, node: true, browser: true },
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  plugins: ['react', 'react-native'],
  extends: ['eslint:recommended', 'plugin:react/recommended'],
  settings: { react: { version: 'detect' } },
  rules: {
    // Prevent raw text outside of <Text> in React Native
    'react-native/no-raw-text': 'error',
    // Disallow web-only className prop usage in RN JSX
    'no-restricted-syntax': [
      'error',
      {
        selector: 'JSXAttribute[name.name="className"]',
        message:
          'Avoid `className` on React Native components. Use `style` with StyleSheet instead.',
      },
    ],
  },
  overrides: [
    {
      files: ['**/*.js', '**/*.jsx'],
      excludedFiles: ['backend/**', 'node_modules/**'],
    },
  ],
};