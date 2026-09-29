# Lancyr autoverzekering — Playwright

Dit project test de autoverzekeringsfunnel van Lancyr met Playwright en TypeScript. De hoofdtest draait in Chromium en Firefox via Docker en stopt vóór **Sluit af**.

## Snel starten

Voor uitvoering via de shellscripts heb je Bash en een werkende Docker Engine nodig. Tests en samenvattingen worden in dezelfde container uitgevoerd:

```sh
bash scripts/run-lancyr-browsers.sh          # headless
bash scripts/run-lancyr-browsers.sh headed   # headed
```

De runmap en `TESTRESULTATEN-lancyr.md` worden gekoppeld aan de container, zodat de rapporten op je computer blijven staan. `scripts/run-and-summarize.sh` maakt de samenvatting ook na een testfout en behoudt de test-exitcode. Als alleen de rapportverwerking faalt, eindigt de run eveneens met een fout. Als Docker zelf niet start, kan er geen samenvatting worden gemaakt.

Voor de npm-commando's en lokale typecontrole heb je Node.js **24.21.0** en npm **11.19.0** nodig. Met nvm kies je de vastgelegde Node-versie via `nvm install` en `nvm use` in deze projectmap. Nvm zelf is optioneel.

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

## Headless en headed uitvoeren

`npm run test:lancyr` blijft standaard headless. Gebruik voor headed:

```sh
npm run test:lancyr:headed
```

Beide commando's gebruiken `scripts/run-lancyr-browsers.sh` en dezelfde testcode in `test/`. Chromium en Firefox draaien met twee workers, dezelfde testdata en dezelfde rapportage-instellingen. Headed gebruikt `xvfb-run -a` en `--headed` in Docker. Xvfb is al aanwezig in de Playwright-image; extra dependencies zijn niet nodig. Het browservenster draait op een virtueel scherm en verschijnt niet op je desktop.

Uitvoer blijft onder `test-runs/`, met de modus in de mapnaam, bijvoorbeeld `2026-09-28_14-30-00_headed_XXXXXX/`. Elke run bevat `results.json`, `SAMENVATTING.md`, `html/` en `test-results/`. De samenvatting vermeldt de browsermodus. Bestaande runmappen blijven bruikbaar.

Dit voegt headed uitvoering toe, nog geen automatische CPU- of geheugenvergelijking. De JSON-rapportage bevat de testduur; voor een betrouwbare vergelijking zijn meerdere runs onder gelijke omstandigheden nodig.

## Live meekijken via noVNC

Start in een interactieve terminal:

```sh
bash scripts/run-lancyr-browsers.sh visible
# Of met lokale npm:
npm run test:lancyr:visible
```

De runner bouwt eerst `sq1-playwright` en daarna `sq1-playwright-viewer` via `docker/Dockerfile.viewer`. Beide krijgen je actuele tests en scripts. De eerste viewer-build downloadt extra Ubuntu-pakketten.

Open na de melding in de terminal <http://localhost:6080/vnc.html?autoconnect=true&resize=scale>. Verbind en druk in de terminal op Enter om te starten. Chromium draait headed met één worker, op normale snelheid. Je kijkt alleen mee: muis- en toetsenbordinvoer vanuit de viewer zijn uitgeschakeld. Na afloop druk je opnieuw op Enter om af te sluiten. Browservensters sluiten na iedere test; rapporten blijven bewaard. Ctrl+C stopt de sessie.

`scripts/start-viewer.sh` beheert Xvfb, x11vnc en websockify. De rapportverwerking blijft in Docker. Poort 6080 wordt alleen op `127.0.0.1` gepubliceerd; VNC-poort 5900 blijft intern. Deze variant heeft geen wachtwoord en is uitsluitend bedoeld voor lokaal gebruik. Stop bij een bezette poort eerst de andere viewer. In WSL open je het adres in de Windows-browser; localhost-doorsturen vanuit WSL moet beschikbaar zijn.

De drie extra pakketten zijn exact vastgelegd in de viewer-Dockerfile. Indirecte Ubuntu-dependencies worden door apt opgelost en zijn niet afzonderlijk vastgezet. Gebruik voor distributie van exact dezelfde complete viewer-image de digest van de gebouwde image. De standaardimage bevat geen viewersoftware. Gebruik visible niet als directe benchmark tegen headless: browserselectie, workers en extra viewer-processen verschillen.

## Versiebeheer van tooling



Node en npm zijn exact vastgelegd in `package.json`; `.npmrc` laat npm bij een afwijkende runtimeversie stoppen tijdens installatie. `.nvmrc` legt Node vast voor nvm. `packageManager` documenteert de npm-versie, maar installeert die niet automatisch.

Directe dependencies staan met exacte versies in `package.json`; `package-lock.json` legt ook indirecte dependencies vast. Gebruik lokaal en in CI `npm ci`. De Dockerfile gebruikt images met vaste digests en controleert Node en npm tijdens de build. Playwright blijft op 1.63.0, passend bij de browserimage.

Updates gebeuren bewust in een aparte branch bij beveiligingsproblemen, aflopende ondersteuning, relevante bugfixes of benodigde functionaliteit. Werk bij een runtime-update `.nvmrc`, `package.json`, het lockbestand en de Dockerfile samen bij. Controleer daarna een schone Docker-build, `npm run typecheck` en de tests in alle drie de browsers. Controleer ondersteuning en beveiligingsupdates periodiek; vastzetten vervangt onderhoud niet.

## Meer informatie

- [Lancyr-test: controles, rapporten en Playwright-features](README-lancyr-test.md)
- [Firefox lokaal zonder Docker installeren — Oumaima](README-oumaima.md)
- [Presentatiedocumentatie: ontwerp, Docker en Git](DOCUMENTATIE-PRESENTATIE.md)

Een fout en het bijbehorende screenshot op de echte Lancyr-site demonstreren? Gebruik `npm run test:screenshot-demo`. Die demo draait niet mee met `npm run test:lancyr`.
