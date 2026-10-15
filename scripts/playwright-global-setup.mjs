import { lintSuite } from './lint-suite.mjs';

export default async function globalSetup() {
  // De runners selecteren de suite. Rechtstreeks Playwright starten controleert alle suites.
  await lintSuite(process.env.LANCYR_LINT_SUITE || 'all');
}
