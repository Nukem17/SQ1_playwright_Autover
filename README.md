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
| TypeScript | 7.0.2 |
| @types/node | 24.19.0 |

`package-lock.json` legt dependencies vast. `.npmrc` controleert de runtimeversies; `.nvmrc` bevat de Node-versie. De Dockerfile controleert Node/npm en gebruikt basisimages met vaste digests. Playwright en de browserimage hebben dezelfde versie.

Met de afgesproken lokale Node/npm-versies:

```bash
npm ci
npm run typecheck
npm run test:lancyr
```

Werk bij updates de versieconfiguratie, het lockbestand en Docker samen bij. Controleer de build, types en gekozen browsertests. De viewer-image legt drie extra pakketten vast; indirecte apt-dependencies zijn niet afzonderlijk vastgezet. Er is nog geen centrale CI-workflow of teamhosting.

## Documentatie

- [Autoverzekering: controles en foutdemo](README-lancyr-test.md)
- [Visuele vergelijking](README-visual-test.md)
- [Testdata en scenario’s](README-testdata.md)
- [Schade melden: regressiesuite](README-schade-regressie.md)
- [Rapportpagina](README-reportpage.md)
- [Presentatie: slides en demonstraties](DOCUMENTATIE-PRESENTATIE.md)
- [Projectuitleg en voorbereiding op Novulo](docs/SIDEQUEST-TESTSUITE.md)
