# Lancyr autoverzekering — Playwright

Dit project test de autoverzekeringsfunnel van Lancyr met Playwright en TypeScript. De hoofdtest draait in Chromium en Firefox via Docker en stopt vóór **Sluit af**.

## Snel starten

Je hebt Node.js **24.21.0**, npm **11.19.0** en een werkende Docker Engine nodig. Met nvm kies je de vastgelegde Node-versie via `nvm install` en `nvm use` in deze projectmap. Nvm zelf is optioneel.

Installeer lokaal de vastgelegde dependencies en controleer TypeScript:

```sh
npm ci
npm run typecheck
```

Start daarna de tests:

```sh
npm run test:lancyr
```

Dit commando bouwt de image en draait de tests. De uitslag verschijnt in de terminal. Elke run krijgt een eigen map onder `test-runs/` met een korte samenvatting, een HTML-rapport en eventuele screenshots en traces. Het overzicht met datum en tijd staat in [TESTRESULTATEN-lancyr.md](TESTRESULTATEN-lancyr.md).

## Versiebeheer van tooling

Node en npm zijn exact vastgelegd in `package.json`; `.npmrc` laat npm bij een afwijkende runtimeversie stoppen tijdens installatie. `.nvmrc` legt Node vast voor nvm. `packageManager` documenteert de npm-versie, maar installeert die niet automatisch.

Directe dependencies staan met exacte versies in `package.json`; `package-lock.json` legt ook indirecte dependencies vast. Gebruik lokaal en in CI `npm ci`. De Dockerfile gebruikt images met vaste digests en controleert Node en npm tijdens de build. Playwright blijft op 1.63.0, passend bij de browserimage.

Updates gebeuren bewust in een aparte branch bij beveiligingsproblemen, aflopende ondersteuning, relevante bugfixes of benodigde functionaliteit. Werk bij een runtime-update `.nvmrc`, `package.json`, het lockbestand en de Dockerfile samen bij. Controleer daarna een schone Docker-build, `npm run typecheck` en de tests in alle drie de browsers. Controleer ondersteuning en beveiligingsupdates periodiek; vastzetten vervangt onderhoud niet.

## Meer informatie

- [Lancyr-test: controles, rapporten en Playwright-features](README-lancyr-test.md)
- [Firefox lokaal zonder Docker installeren — Oumaima](README-oumaima.md)
- [Presentatiedocumentatie: ontwerp, Docker en Git](DOCUMENTATIE-PRESENTATIE.md)

Een fout en het bijbehorende screenshot op de echte Lancyr-site demonstreren? Gebruik `npm run test:screenshot-demo`. Die demo draait niet mee met `npm run test:lancyr`.
