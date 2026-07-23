// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const noUnsafeCustomFontLineHeight = require('./eslint-rules/no-unsafe-custom-font-line-height');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    plugins: {
      plogging: {
        rules: {
          'no-unsafe-custom-font-line-height': noUnsafeCustomFontLineHeight,
        },
      },
    },
    rules: {
      'plogging/no-unsafe-custom-font-line-height': 'error',
    },
  },
]);
