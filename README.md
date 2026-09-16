# SQ1 Playwright Autover

Playwright test project using TypeScript. Use Node.js 22 or newer and npm.

## Install

After cloning the repository, run this single command line from the project directory:

```sh
npm ci && npx playwright install --with-deps
```

`npm ci` installs the exact package versions recorded in `package-lock.json`. The Playwright command installs the Chromium, Firefox, and WebKit browsers and their system dependencies. On Linux, installing system dependencies may ask for administrator access.

## Run tests

```sh
npx playwright test
```

The `test/` directory is currently empty, so no tests run until test files are added.
