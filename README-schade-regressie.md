# Regressietests — Schade melden

Deze suite bewaakt de pagina’s, navigatie en FAQ van Schade melden op Lancyr. Ze draait onafhankelijk van de autoverzekeringsfunnel en verschijnt onder **Schade melden** in de centrale rapportpagina.

## Starten met Bash en Docker

```bash
bash scripts/run-schade-regressie.sh                    # Chromium, Firefox en WebKit
bash scripts/run-schade-regressie.sh headless chromium  # één browser
bash scripts/run-schade-regressie.sh headed all         # virtueel scherm in Docker
```

Node, npm en Playwright draaien in Docker. De runner bouwt de image, initialiseert en valideert SQLite en start daarna de tests. De testcontainer leest de gegevens alleen-lezen. De bestaande autoverzekeringscommando’s blijven bruikbaar.

## Eerste dekking

De CSV `moz_lancyr_crawl_issues_09302026.csv` bevat **27 meldingen voor 14 verschillende URL’s** binnen `/schade-melden/`: zeven pagina’s en zeven extra FAQ-varianten. Zie [de bronmeldingen en CSV-regelnummers](testdata/schade-bronmeldingen.md).

| Testgroep | Controles |
|---|---|
| Bereikbaarheid | Status, bestemming en herkenbare inhoud voor alle 14 URL’s. |
| Pagina-inhoud | Onafhankelijke tests voor titel, precies één zichtbare passende H1 en één niet-lege meta-description per URL. |
| Navigatie | Zes schadeopties openen via de hoofdpagina, inclusief links met een nieuw tabblad. Twee verwijzingen naar externe schadeformulieren controleren. |
| FAQ | Antwoord openklappen, dichtklappen, opnieuw openen, doorklikken naar het volledige antwoord en browser-terug. |
| Paginering | Pagina 1 → 2 → 1, andere vragen, herladen en browser-terug/vooruit. |
| URL-varianten | `cst`, expliciete pagina 1/2 en beide parametervolgordes leveren dezelfde bedoelde vragen en paginastand. |

Dit zijn **74 controles, uitgevoerd in drie browsers: 222 browserresultaten bij een volledige run**. De centrale rapportpagina toont zes uitklapbare testgroepen. Daaronder staat elke controle één keer, met de resultaten per browser en vervolgens de foutuitleg en bijlagen. Een controle met een fout in één browser wordt als gefaald getoond. De tellers volgen de actieve filters; bij alleen regressieresultaten tellen ze controles per run. De eisen zijn bewust onafhankelijk: een ontbrekende H1 blokkeert de navigatietests niet. Sommige koppen staan buiten `main`; de inhoudscontrole accepteert die locatie, terwijl de aparte H1-test wel het afgesproken headingniveau vereist.

De FAQ-antwoorden zitten in uitklappers; de ‘Lees meer’-link wordt pas daarbinnen zichtbaar. Het doel van links wordt gecontroleerd in het huidige of nieuwe tabblad, zoals de website dat aanbiedt. Externe schadeformulieren worden niet ingevuld, geopend of verzonden; de suite controleert de zichtbare link en de afgesproken bestemming.

Metadata wordt gecontroleerd in de geladen browserpagina. Dit is geen volledige SEO-audit of vervanging van Moz. De zeven FAQ-queryvarianten zijn geen bewezen navigatiefouten alleen omdat ze apart in een crawl staan. Canonical-/indexeringsbeleid en het verplicht verwijderen van `cst` zijn niet vastgesteld en worden daarom niet afgedwongen.

## Gegevens en verwachtingen

De bestaande `testdata/local.sqlite` bevat twee extra tabellen:

- `regressie_paginas`: onderdeel, ID, naam, pad, verwachte titel, hoofdtitel, HTTP-status en bronmelding.
- `regressie_scenarios`: ID, onderdeel, naam, actietype, bron-/doelpagina en scenario-instellingen.

`testdata/migrations/002-schade-regressie.sql` voegt ze eenmaal toe. Handmatige wijzigingen blijven bij latere runs behouden, net als de bestaande autoverzekeringsgegevens. `testdata/regressie.ts` leest met geparameteriseerde queries en valideert de gegevens voordat browsers starten. Ontbrekende of ongeldige gegevens geven een fout.

De CSV dient als herleidbare bron. De verwachte titels zijn vastgelegd op basis van die bron en de pagina-inspectie. De afspraak voor H1 en description is dat ze aanwezig en bruikbaar zijn; hun huidige afwezigheid wordt niet als norm opgeslagen. De exacte toekomstige descriptiontekst ligt niet vast. Voor FAQ-inhoud wordt een stabiele antwoordpassage gebruikt en bij URL-varianten de vragenlijst van dezelfde paginastand vergeleken.

Locators en browserhandelingen staan in `test/schade-melden/`. Ze worden niet als uitvoerbare instructies in de database opgeslagen. Iedere test voegt de werkelijk gebruikte gegevens als JSON-bijlage toe. De `Regressiecase`-annotatie is een test-ID, geen fictieve gebruiker.

## Later uitbreiden

1. Beschrijf de gebruikersmelding, de stappen om de fout te zien en het gewenste gedrag. Geef de melding een vast nummer.
2. Bij een extra pagina: voeg een record toe aan `regressie_paginas`. De vier paginacontroles worden automatisch aangemaakt.
3. Bij een bekende navigatie/FAQ-variant: voeg een scenario met het bestaande actietype toe. Bij nieuw gedrag voeg je gerichte testcode toe.
4. Zet gedeelde aanvullingen in een **nieuwe migratie**; pas een al toegepaste migratie niet aan om bestaande databases te wijzigen.
5. Gebruik `Onderdeel`, `Testgroep`, `Testsoort` en een begrijpelijke `test.step`-naam. De rapportpagina groepeert nieuwe onderdelen automatisch.
6. Laat de test correct gedrag verwachten. Een bekende websitefout blijft rood totdat die is verholpen. Geen `test.fail()` of aangepaste verwachtingen om de run groen te maken.

Voorbeeld van een nieuwe pagina in een toekomstige migratie:

```sql
INSERT INTO regressie_paginas
  (id, onderdeel, naam, pad, verwachteTitel, verwachteHoofdtitel, verwachteStatus, bron)
VALUES
  ('schade-nieuwe-pagina', 'Schade melden', 'Nieuwe schadepagina', '/schade-melden/nieuw/',
   'Goedgekeurde titel - Lancyr', 'Goedgekeurde hoofdtitel', 200,
   '{"melding":"SCH-123: omschrijving van de gebruikersmelding"}');
```

Het voorbeeldpad moet voor gebruik worden vervangen door de echte pagina en afgesproken verwachtingen. Een nieuw scenario kan de bronverwijzing of issue-ID in zijn `instellingen` bewaren; die komt mee in de gegevensbijlage.

## Resultaten en controle

Iedere echte run komt in `test-runs/<datum>_schade-regressie_<uniek>/`, met JSON, HTML, samenvatting en screenshots/traces bij fouten. Open de resultaten via `bash scripts/view-reports.sh` en kies **Schade melden**. Zoeken op een regressie-ID of bronmelding werkt ook.

Een falende controle bewijst welke verwachting niet is gehaald; de onderliggende oorzaak kan nader onderzoek vragen. Een metadataprobleem betekent niet automatisch dat de schadebediening kapot is. Beoordeel de testgroepen afzonderlijk.

Technische controles met tijdelijke databases, zonder websiteverkeer:

```bash
docker build -t sq1-playwright .
docker run --rm sq1-playwright npx tsc --noEmit
docker run --rm sq1-playwright node --test testdata/scenarios.test.cjs testdata/regressie.test.cjs scripts/report-page/data.test.mjs scripts/report-page/live.test.mjs
```

Bij de browserinspectie is aanvullend vastgesteld dat een geopend FAQ-antwoord niet opnieuw dichtklapt. Dit staat als aparte controle `SCH-FAQ-UITKLAPPEN` naast de onafhankelijke doorkliktest. Het is geen melding uit de Moz-CSV.
