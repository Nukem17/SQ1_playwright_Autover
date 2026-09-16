# SQ1 Playwright Autover

Playwright-testproject met TypeScript. Gebruik een actuele Node.js-versie uit de 22.x-, 24.x- of 26.x-reeks en npm.

## Installatie

Voor Firefox-tests op een eigen computer zonder Docker: zie [README-oumaima.md](README-oumaima.md).

Voer na het klonen van de repository deze ene opdrachtregel uit in de projectmap:

```sh
npm ci && npx playwright install --with-deps
```

`npm ci` installeert de exacte pakketversies uit `package-lock.json`. De Playwright-opdracht installeert de browsers Chromium, Firefox en WebKit en de benodigde systeempakketten. Op Linux kan voor het installeren van systeempakketten om beheerdersrechten worden gevraagd.

## Tests uitvoeren

```sh
npx playwright test
```

### Met Docker

Met Docker zijn de browsers en systeempakketten al beschikbaar in de Playwright-image. Voer na het klonen van de repository in de projectmap uit:

```sh
docker build -t sq1-playwright .
docker run --rm --init --ipc=host sq1-playwright
```

Voor alleen Chromium:

```sh
docker run --rm --init --ipc=host sq1-playwright npx playwright test --project=chromium
```

De map `test/` is momenteel leeg. Er worden pas tests uitgevoerd wanneer daar testbestanden aan zijn toegevoegd.
