# Lancyr autoverzekering — Playwright

Dit project test de autoverzekeringsfunnel van Lancyr met Playwright en TypeScript. De hoofdtest draait in Chromium en Firefox via Docker en stopt vóór **Sluit af**.

## Snel starten

Je hebt Node.js, npm en een werkende Docker Engine nodig. Open een terminal in deze projectmap en voer uit:

```sh
npm run test:lancyr
```

Dit commando bouwt de image en draait de tests. De uitslag verschijnt in de terminal. Elke run krijgt een eigen map onder `test-runs/` met een korte samenvatting, een HTML-rapport en eventuele screenshots en traces. Het overzicht met datum en tijd staat in [TESTRESULTATEN-lancyr.md](TESTRESULTATEN-lancyr.md).

## Meer informatie

- [Lancyr-test: controles, rapporten en Playwright-features](README-lancyr-test.md)
- [Firefox lokaal zonder Docker installeren — Oumaima](README-oumaima.md)
- [Presentatiedocumentatie: ontwerp, Docker en Git](DOCUMENTATIE-PRESENTATIE.md)

Een fout en het bijbehorende screenshot op de echte Lancyr-site demonstreren? Gebruik `npm run test:screenshot-demo`. Die demo draait niet mee met `npm run test:lancyr`.
