# Playwright met Firefox zonder Docker — Oumaima

Je kunt de Lancyr-test lokaal in Firefox draaien. Docker of WSL is daarvoor niet nodig. Open een terminal in de projectmap, waar `package.json` staat.

## Eenmalig installeren

Installeer Node.js met npm en controleer of beide werken:

```sh
node --version
npm --version
```

Installeer daarna de projectpakketten en Playwrights Firefox:

```sh
npm ci
npx playwright install --with-deps firefox
```

`npm ci` gebruikt de versies uit `package-lock.json`. Playwright downloadt zijn eigen Firefox; een losse Firefox-installatie is niet nodig. Op Linux kunnen beheerdersrechten nodig zijn voor systeempakketten.

## De test draaien

De volledige funneltest heeft een testkenteken nodig. In **PowerShell**:

```powershell
$env:LANCYR_TEST_KENTEKEN = '88-LSV-7'
npx playwright test test/lancyr-autoverzekering.spec.ts --project=firefox
```

Op **macOS of Linux**:

```sh
LANCYR_TEST_KENTEKEN=88-LSV-7 npx playwright test test/lancyr-autoverzekering.spec.ts --project=firefox
```

De uitslag staat in de terminal. Open het HTML-rapport met `npx playwright show-report`. Bij een fout staan screenshots en traces in `test-results/`.

De test stopt vóór **Sluit af**. Wat precies gecontroleerd wordt, staat in [README-lancyr-test.md](README-lancyr-test.md). De route is in Firefox binnen Docker getest; op een eigen computer kunnen browserinstellingen of systeemonderdelen verschillen.
