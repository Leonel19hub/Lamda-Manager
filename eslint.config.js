import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'node_modules', '.tmp', 'coverage'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    // Core Isolation: Pure Domain layer cannot import react, react-dom, zustand or UI components
    files: ['src/features/**/domain/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react',
              message: 'Core Isolation: Domain files cannot import React.',
            },
            {
              name: 'react-dom',
              message: 'Core Isolation: Domain files cannot import ReactDOM.',
            },
            {
              name: 'zustand',
              message: 'Core Isolation: Domain files cannot import Zustand.',
            },
            {
              name: 'zustand/middleware',
              message: 'Core Isolation: Domain files cannot import Zustand middleware.',
            },
          ],
          patterns: [
            {
              group: ['**/*.tsx', '**/components/**', '**/stores/**'],
              message: 'Core Isolation: Domain files cannot import UI components or stores.',
            },
          ],
        },
      ],
    },
  }
)
