# Centrale rapportpagina

```bash
bash scripts/view-reports.sh
```

Open [http://localhost:8070](http://localhost:8070) in je browser of VS Code Simple Browser. Laat de terminal open; Ctrl+C stopt de server. Docker en Bash zijn nodig, lokale Node/npm niet. Het menu hergebruikt een al draaiende rapportserver.

## Een resultaat onderzoeken

1. Kies een **onderdeel**, resultaatstatus of zoekterm.
2. Gebruik **Meer filters** voor testgroep, browser, scenario/gebruiker, testsoort, datum of demo’s.
3. Open **run → testgroep → controle → browserresultaat**. Bij autoverzekering staan tests direct in hun groep.
4. Bekijk foutuitleg en screenshot. Onder technische details staan oorspronkelijke fouten, gebruikte testdata, logs en bijlagen.
5. Open **Stappen en trace bekijken** voor het Playwright-rapport. Kies daar de browser, test en trace.

Een trace hoort bij één uitvoering in één browser. Bij visuele runs opent **Referentie, actueel en verschil** het aparte beeldvergelijkingsoverzicht.

## Tellingen en statussen

- Bovenste aantallen en groepsaantallen volgen de filters; status/aantallen op een run beschrijven de volledige run.
- Bij uitsluitend regressieresultaten telt het overzicht controles per run. De browserresultaten blijven zichtbaar; een fout in één geselecteerde browser maakt de controle rood.
- **Instabiel** betekent dat Playwright het resultaat als flaky heeft aangemerkt, bijvoorbeeld na een geslaagde herhaling.
- Onvolledige of onleesbare resultaten krijgen geen geslaagde status.
- Bewuste foutdemo’s en referentieopnamen hebben labels. Anna’s bekende probleem is een normale testfout; Daan kan slagen bij de verwachte blokkade.

De uitleg beschrijft verwachting, waarneming en de mislukte stap. Zij stelt niet automatisch de oorzaak vast. Ook onbekende fouttypen krijgen een algemene uitleg; oorspronkelijke meldingen blijven beschikbaar.

## Nieuwe resultaten

De pagina leest lokale mappen onder `test-runs/` en controleert elke tien seconden op wijzigingen. Automatisch bijwerken behoudt filters en geopende details. **Resultaten vernieuwen** controleert direct; filters en runlinks staan in de URL.

Definitieve testresultaten verschijnen wanneer `results.json` beschikbaar is, niet na iedere losse browseractie. Fouten vóór de runmap, zoals een buildfout, blijven terminalmeldingen. Ontbrekende bijlagen worden aangegeven. Databasewijzigingen herschrijven historische resultaten niet.

## Nieuwe onderdelen aansluiten

Een runner moet een unieke runmap met **`results.json`** en **`html/`** leveren. Een los Playwright-commando dat elders schrijft, verschijnt niet vanzelf. Geef nieuwe tests labels mee:

```ts
annotation: [
  { type: 'Onderdeel', description: 'Contactpagina' },
  { type: 'Testgroep', description: 'Pagina en invoer' },
  { type: 'Testsoort', description: 'Functioneel' },
]
```

Gebruik consistente namen en `Functioneel` of `Visueel`. Nieuwe onderdelen worden automatisch ontdekt. Oude `Funnel`-labels blijven bruikbaar; `Onderdeel` heeft voorrang. Bekende oude bestandsnamen worden herkend; onbekende tests zonder labels komen onder **Niet ingedeeld / Overige tests**.

Runs met meerdere onderdelen staan onder **Meerdere onderdelen**. `Regressiecase` bevat een pagina-/scenario-ID, geen gebruiker. Het extra browserfilter wordt bij het serveren toegevoegd aan het Playwright-rapport; opgeslagen bestanden blijven intact.

## Techniek en grenzen

| Bestand | Functie |
| --- | --- |
| `data.mjs` | JSON, geneste tests, pogingen en bijlagen verzamelen. |
| `index.html` | Filters en detailweergave. |
| `error-explanation.mjs` | Foutmeldingen uitleggen. |
| `classification.mjs` | Tests indelen op labels en oude rapporten herkennen. |
| `server.mjs` | Overzicht en bestanden binnen de runmap serveren. |
| `browser-filter.mjs` / `.js` | Browserkeuze in het Playwright-rapport. |

Deze bestanden staan onder `scripts/report-page/`. `scripts/view-reports.sh` start Docker met de resultaten alleen-lezen gekoppeld. De viewer start geen tests en verzamelt niet automatisch collega- of CI-runs. Centrale hosting vraagt gedeelde opslag, toegang en bewaartermijnen; grote archieven kunnen paginering vragen.

Checks na een Docker-build:

```bash
docker run --rm sq1-playwright node --test scripts/report-page/data.test.mjs scripts/report-page/live.test.mjs scripts/report-page/browser-filter.test.mjs
```

## Elasticsearch naast de rapportpagina

De runners bewaren runs, testpogingen en artefactverwijzingen ook in Elasticsearch. Deze rapportpagina blijft de lokale bestanden lezen; zij vraagt Elasticsearch niet rechtstreeks op. Bij een mislukte opslag blijven HTML en bijlagen beschikbaar. De runmap bevat de opslagstatus en een exportbestand voor opnieuw opslaan. Zie [Elasticsearch-resultaatopslag](README-elasticsearch.md#runs-en-resultaten-opslaan-stap-5).
