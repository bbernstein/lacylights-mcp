// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // Base recommended config
  eslint.configs.recommended,

  // TypeScript recommended configs
  ...tseslint.configs.recommended,

  // Global ignores
  {
    ignores: ['dist/', 'node_modules/', 'coverage/', '*.js', '!eslint.config.js'],
  },

  // Main configuration for TypeScript files
  {
    files: ['**/*.ts'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.json',
      },
      globals: {
        node: true,
        jest: true,
        console: true,
        process: true,
        Buffer: true,
        __dirname: true,
        __filename: true,
        module: true,
        require: true,
        exports: true,
      },
    },
    rules: {
      // Make rules less strict initially - can be tightened later
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off', // Too many to fix right now
      '@typescript-eslint/no-inferrable-types': 'off',
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'off', // Too many to fix right now

      // General rules - keep less strict for now
      'prefer-const': 'warn',
      'no-var': 'error',
      'no-console': 'off', // Allow console statements for now
      'eqeqeq': 'warn',
      'no-unused-expressions': 'warn',
      'no-unused-vars': 'off', // Use TypeScript version instead
    },
  },

  // Test file overrides
  {
    files: ['**/*.test.ts', '**/*.spec.ts'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
    },
  },
);
