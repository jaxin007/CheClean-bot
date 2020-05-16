module.exports = {
  env: {
    es6: true,
    node: true,
  },
  extends: ['airbnb-base'],
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly',
  },
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
  },
  rules: {
    "no-unused-vars": "off",
    'camelcase': 'off',
    'class-methods-use-this': 'off',
    'no-console': 'off',
    semi: ['error', 'always'],
  },
};
