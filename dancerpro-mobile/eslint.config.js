const react = require('eslint-plugin-react');
const reactNative = require('eslint-plugin-react-native');

module.exports = [
  {
    files: ['**/*.js', '**/*.jsx'],
    ignores: ['backend/**', 'node_modules/**'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: {
      react,
      'react-native': reactNative,
    },
    settings: { react: { version: 'detect' } },
    rules: {
      'react-native/no-raw-text': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: 'JSXAttribute[name.name="className"]',
          message:
            'Avoid `className` on React Native components. Use `style` with StyleSheet instead.',
        },
      ],
      'react/react-in-jsx-scope': 'off',
      'react/jsx-uses-react': 'off',
    },
  },
];