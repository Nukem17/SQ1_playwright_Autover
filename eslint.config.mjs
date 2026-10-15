import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import playwright from 'eslint-plugin-playwright';

export default defineConfig(
  {
    ignores: ['node_modules/**', 'test-runs/**', 'test-results/**', 'playwright-report/**', 'blob-report/**'],
  },
  {
    files: ['**/*.{js,mjs,cjs,ts}'],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['**/*.ts'],
    extends: [tseslint.configs.recommended],
    languageOptions: { parserOptions: { tsconfigRootDir: import.meta.dirname } },
  },
  {
    // Deze Node-tests voeren ook functies in de browser uit.
    files: ['scripts/report-page/browser-filter.js', 'scripts/report-page/browser-filter.test.mjs', 'scripts/report-page/live.test.mjs'],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['test/**/*.spec.ts'],
    extends: [playwright.configs['flat/recommended']],
  },
  {
    files: ['test/autoverzerkeringsfunnel/*.spec.ts', 'test/schade-melden/navigatie.spec.ts'],
    // Scenario's kiezen bewust een route; navigatie volgt target=_blank.
    rules: { 'playwright/no-conditional-in-test': 'off' },
  },
  {
    files: ['test/autoverzerkeringsfunnel/*.spec.ts'],
    // Partner, blokkade, extra dekkingen en demo hebben eigen verwachtingen.
    rules: { 'playwright/no-conditional-expect': 'off' },
  },
);
