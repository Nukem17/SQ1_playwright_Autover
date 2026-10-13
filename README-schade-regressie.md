# Regressietests — Schade melden

Bewaakt pagina’s, navigatie en FAQ van Lancyr. De suite draait onafhankelijk van autoverzekering; zij test geen volledige schadeafhandeling.

```bash
bash scripts/run-schade-regressie.sh                   # headless, alle browsers
bash scripts/run-schade-regressie.sh headless chromium
bash scripts/run-schade-regressie.sh headed all        # virtueel scherm, geen viewer
```

De runner bouwt Docker, initialiseert en valideert SQLite en draait met **twee workers, zonder retries**. Maximaal twee tests tegelijk, over de gekozen browsers samen.

## Bron en dekking

De [Moz-CSV](moz_lancyr_crawl_issues_09302026.csv) bevat 27 meldingen voor 14 URL’s binnen `/schade-melden/`: zeven pagina’s en zeven extra FAQ-varianten. [Bronverwijzingen](testdata/schade-bronmeldingen.md) koppelen ze aan CSV-regels. De CSV is historische broninformatie; de run leest verwachtingen uit SQLite.

| Groep | Controles | Verwachting |
| --- | --- | --- |
| Bereikbaarheid | 14 | HTTP-status, bestemming en herkenbare inhoud. |
| Pagina-inhoud | 42 | Titel, één zichtbare passende H1 en één niet-lege meta-description per URL. |
| Navigatie | 8 | Zes schadeopties en twee externe formulierlinks. |
| FAQ | 2 | Open/dicht/heropenen; volledig antwoord openen en terugkeren. |
| Paginering | 1 | Pagina 1 → 2 → 1, herladen en terug/vooruit. |
| URL-varianten | 7 | Parameters en parametervolgorde behouden de bedoelde vragen/paginastand. |

**74 controles × drie browsers = 222 browserresultaten** met de huidige startdataset. Een eis faalt onafhankelijk van andere eisen: een ontbrekende H1 blokkeert bijvoorbeeld geen aparte navigatietest.

Externe formulieren worden niet geopend of verzonden. Metadata wordt in de browser gecontroleerd; dit vervangt geen volledige SEO-audit. De suite dwingt geen canonical-/indexeringsbeleid af. De FAQ-dichtklapcontrole komt uit aanvullende browserinspectie, niet uit de CSV.

## Gegevens en uitbreiden

`regressie_paginas` bevat paden, titels, status en bron. `regressie_scenarios` bevat actietypen, pagina-ID’s en instellingen. `testdata/regressie.ts` leest en valideert; browserhandelingen staan in `test/schade-melden/`. Gebruikte gegevens komen als rapportbijlage mee.

Voor een uitbreiding:

1. Leg melding, gewenst gedrag en een vast ID vast.
2. Voeg een pagina toe voor de vier bestaande paginacontroles, of een scenario van een bestaand actietype.
3. Voeg bij nieuw gedrag gerichte browsercode toe.
4. Gebruik een nieuwe migratie voor bestaande databases.
5. Geef tests `Onderdeel`, `Testgroep`, `Testsoort` en leesbare `test.step`-namen.

Bekende websitefouten blijven rood totdat het gedrag is hersteld. Pas verwachtingen niet aan om een fout te verbergen.

## Resultaten

Open [de rapportpagina](README-reportpage.md) en kies **Schade melden**. Iedere controle staat één keer met browserresultaten eronder. Zoek op regressie-ID of bronmelding; deze IDs zijn geen testgebruikers.

De opgeslagen run van **5 oktober 2026** duurde circa acht minuten, exclusief build/voorbereiding: 138 geslaagde en 84 gefaalde browserresultaten. De fouten betroffen H1, description en FAQ-dichtklappen. Dit beschrijft die historische run, niet de huidige website.

Technische checks na een build, zonder live website:

```bash
docker run --rm sq1-playwright npx tsc --noEmit
docker run --rm sq1-playwright node --test testdata/scenarios.test.cjs testdata/regressie.test.cjs scripts/report-page/data.test.mjs scripts/report-page/live.test.mjs scripts/report-page/browser-filter.test.mjs
```
