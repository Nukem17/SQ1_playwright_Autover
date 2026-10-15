# Lancyr — Playwright-testsuite

Technische proef voor een toekomstige Novulo-testsuite. Test de autoverzekeringsfunnel en **Schade melden** op de live Lancyr-website, in Chromium, Firefox en WebKit. De funnel stopt vóór **Sluit af**.

## Starten

Je hebt de projectbestanden, **Bash en Docker** nodig. Node.js en npm draaien in Docker; lokale installatie is alleen nodig voor npm-commando’s en ontwikkelcontroles.

In VS Code: **Terminal → Run Task → Lancyr: tests starten**. Buiten VS Code:

```bash
bash scripts/testmenu.sh
```

Kies suite, browser, uitvoermodus en bij autoverzekering een scenario. Enter kiest de standaardwaarde; in het hoofdmenu sluit Enter af. **Beide functionele suites** maakt twee afzonderlijke runs en voert de tweede ook na gewone testfouten uit. Visuele tests vergelijken met de bestaande referentie.

| Uitvoering | Werking |
| --- | --- |
| Headless | Zonder browservenster; normaal twee workers. |
| Headed | Met een virtueel scherm in Docker, zonder zichtbaar desktopvenster. |
| Live/noVNC | Meekijken via een browserviewer, met één worker. In het menu alleen bij autoverzekering. |

### Live meekijken

Kies bij autoverzekering uitvoermodus **3. Live meekijken via noVNC**. Wacht op de gereedmelding en open [de viewer](http://localhost:6080/vnc.html?autoconnect=true&resize=scale) in je browser of geschikte VS Code-preview. Verbind, druk in de terminal op Enter om te starten en na afloop op Enter om af te sluiten. De viewer is alleen-lezen en lokaal beschikbaar op poort 6080. Ctrl+C onderbreekt de sessie.

### Losse commando’s

Voer uit vanuit de projectmap:

```bash
bash scripts/run-lancyr-browsers.sh headless standaard all
bash scripts/run-lancyr-browsers.sh headed standaard chromium
bash scripts/run-lancyr-browsers.sh visible standaard chromium
bash scripts/run-schade-regressie.sh headless all
bash scripts/run-lancyr-visual.sh check
```

## Resultaten

Kies de VS Code-taak **Lancyr: rapportage openen** of start:

```bash
bash scripts/view-reports.sh
```

Open [het resultatenoverzicht](http://localhost:8070) en laat de terminal open. Het overzicht leest lokale runmappen en controleert elke tien seconden op wijzigingen.

Iedere run krijgt een eigen map onder `test-runs/` met `SAMENVATTING.md`, `results.json`, `html/` en foutbijlagen in `test-results/`. Tijdelijke testcontainers worden verwijderd; gekoppelde resultaten blijven bewaard. Een gewone testfout verhindert de samenvatting niet en de foutstatus blijft behouden. Buildfouten of ongeldige data vóór de runmap verschijnen alleen in de terminal.

## Tooling en ontwikkeling

| Tool | Projectversie |
| --- | --- |
| Node.js | 24.21.0, LTS-reeks |
| npm | 11.19.0 |
| Playwright | 1.63.0 |
| TypeScript | 6.0.3 |
| ESLint / typescript-eslint | 10.12.0 / 8.71.2 |
| @types/node | 24.19.0 |

`package-lock.json` legt dependencies vast. `.npmrc` controleert de runtimeversies; `.nvmrc` bevat de Node-versie. De Dockerfile controleert Node/npm en gebruikt basisimages met vaste digests. Playwright en de browserimage hebben dezelfde versie.

Met de afgesproken lokale Node/npm-versies:

```bash
npm ci
npm run typecheck
npm run test:lancyr
```

Werk bij updates de versieconfiguratie, het lockbestand en Docker samen bij. Controleer de build, types en gekozen browsertests. De viewer-image legt drie extra pakketten vast; indirecte apt-dependencies zijn niet afzonderlijk vastgezet. GitHub Actions controleert linting en types. Een aparte workflow plant de funnel dagelijks; teamhosting is nog niet ingericht.

## Codekwaliteit

```bash
npm run lint
npm run lint:fix  # past automatisch herstelbare meldingen aan
npm run typecheck
npm run lint:suite -- autoverzekering  # of schade, visueel, all
```

ESLint controleert losse JavaScript- en TypeScript-bestanden met aanbevolen basisregels, TypeScript-regels en Playwright-regels voor de specs. Gegenereerde rapporten en dependencies worden overgeslagen. Inline scripts in HTML en Bash/YAML worden niet door deze ESLint-configuratie gecontroleerd.

**Vóór iedere browseruitvoering** voert Playwright via `globalSetup` ESLint uit. Dit geldt voor het menu, npm, de Bash-runners en toekomstige GitHub-testworkflows die dezelfde configuratie gebruiken. De runner kiest `autoverzekering`, `schade` of `visueel`: de betreffende testcode, helpers en gedeelde configuratie/rapportagescripts worden gecontroleerd. Zonder keuze, bijvoorbeeld bij rechtstreeks `npx playwright test`, worden alle suites gecontroleerd. Fouten én waarschuwingen blokkeren de browsertests; er worden geen automatische fixes uitgevoerd.

De bestandsselectie staat in `scripts/lint-suite.mjs`; werk die bij als een suite nieuwe helpers importeert. `npm run lint` en de codekwaliteit-workflow blijven het hele project controleren. Bash, YAML, SQL en inline HTML-scripts vallen buiten ESLint. `--list` verzamelt alleen tests en voert geen `globalSetup` uit.

TypeScript is op deze branch van 7.0.2 naar **6.0.3** aangepast voor officiële ondersteuning door `typescript-eslint`. Node.js, npm en Playwright zijn gelijk gebleven. Typecontrole blijft een aparte controle naast linting.

[Codekwaliteit](.github/workflows/lint.yml) draait bij pushes en pull requests en kan handmatig worden gestart. De workflow installeert met `npm ci` en voert linting en typecontrole uit; zij start geen browsers of live websiteverkeer. Een lintwaarschuwing laat de controle falen. Na push naar GitHub verschijnt de uitslag onder **Actions** en bij de pull request. Verplichte controles voor samenvoegen moeten apart in de repository-instellingen worden ingesteld.

De scenario-afhankelijke funnel/visuele tests en popupnavigatie hebben gerichte uitzonderingen voor conditionele teststappen. De visuele test mag buiten de visuele runner bewust worden overgeslagen. Deze keuzes zijn toegelicht in `eslint.config.mjs` en de testcode.

## Dagelijkse funnel in GitHub Actions

[De funnelworkflow](.github/workflows/autoverzekering.yml) draait dagelijks om **13:45 Nederlandse tijd**, inclusief zomer-/wintertijd. Er zijn twee UTC-triggers (11:45 en 12:45). Een voorbereidende job selecteert met `Europe/Amsterdam` de juiste voor het seizoen; de andere workflowrun slaat de funnel over. De selectie gebruikt de geplande tijd, zodat een vertraagde start niet op het verkeerde uur wordt afgewezen. Alleen de echte klantreis tot vóór **Sluit af** draait met scenario `standaard` in Chromium, Firefox en WebKit: drie browserresultaten, twee workers en geen retries. Playwright voert eerst de suite-lintcontrole uit. De korte paginatests, schade-suite, visuele test en foutdemo draaien niet mee.

De planning wordt actief zodra de workflow op de standaardbranch staat (doorgaans `main`) en Actions is ingeschakeld. Alleen op `feature/actions` zetten activeert de dagelijkse planning niet. De workflow heeft ook een **Run workflow**-knop. GitHub kan geplande runs vertragen; openbare repositories kunnen hun planning na 60 dagen zonder activiteit verliezen. Zie [GitHub scheduling](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).

Resultaten verschijnen bij **Actions → Autoverzekering — dagelijkse funnel → run**. Het downloadbare artefact bevat de runmap met HTML, JSON, samenvatting en foutbijlagen, en blijft zeven dagen bewaard. Ontbrekende output na een buildfout wordt in de samenvatting gemeld. GitHub-resultaten verschijnen niet automatisch in je lokale rapportpagina; plaats gedownloade runmappen onder `test-runs/` om ze daar te bekijken.

Planning aanpassen: werk de UTC-crons in het workflowbestand en de tijdselectie in `scripts/funnel-schedule.mjs` samen bij. Stoppen: **Disable workflow** in GitHub Actions. Standaard Linux-runners gebruiken het beschikbare Actions-tegoed; bewaakte minuten en artefactopslag blijven van belang.

Dezelfde selectie lokaal starten:

```bash
bash scripts/run-lancyr-browsers.sh funnel standaard all
# Of met lokale Node/npm:
npm run test:lancyr:funnel
```

## Documentatie

- [Autoverzekering: controles en foutdemo](README-lancyr-test.md)
- [Visuele vergelijking](README-visual-test.md)
- [Testdata en scenario’s](README-testdata.md)
- [Schade melden: regressiesuite](README-schade-regressie.md)
- [Rapportpagina](README-reportpage.md)
- [Presentatie: slides en demonstraties](DOCUMENTATIE-PRESENTATIE.md)
- [Projectuitleg en voorbereiding op Novulo](docs/SIDEQUEST-TESTSUITE.md)
