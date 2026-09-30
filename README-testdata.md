# Testgegevens uit SQLite

De bestaande autoverzekeringsfunnel haalt invoer en gegevensafhankelijke verwachtingen met SQL uit een lokale database. De twee korte paginatests en de visuele proef hebben deze dataset niet nodig.

| Bestand | Taak |
| --- | --- |
| `testdata/seed.sql` | Tabel en startgegevens voor een eenmalige inrichting. |
| `testdata/local.sqlite` | Lokale database; buiten Git en de Docker-buildcontext. |
| `testdata/scenarios.ts` | SQL-query, validatie en dynamische ingangsdatum. |
| `scripts/init-testdata.mjs` | Maakt alleen een ontbrekende database aan. |
| `testdata/scenarios.test.cjs` | Technische controle met tijdelijke database, zonder websitebezoek. |

De vastgelegde Node-versie bevat `node:sqlite`: geen nieuwe npm-dependency of databaseserver nodig. [Node 24-documentatie](https://nodejs.org/download/release/latest-v24.x/docs/api/sqlite.html).

## Starten

```bash
bash scripts/run-lancyr-browsers.sh
bash scripts/run-lancyr-browsers.sh headed
bash scripts/run-lancyr-browsers.sh visible
bash scripts/run-lancyr-browsers.sh funnel-demo
# Expliciet scenario kiezen als tweede argument:
bash scripts/run-lancyr-browsers.sh headless standaard
```

De runner initialiseert zo nodig SQLite en valideert het scenario voordat browsers starten. Daarna is de datamap alleen-lezen gekoppeld aan de testcontainer. Iedere funneltest haalt de gegevens zelf op met een geparameteriseerde query:

```sql
SELECT * FROM autoverzekering_scenarios WHERE id = ?;
```

Standaard wordt `standaard` gekozen. Het tweede argument heeft voorrang op `LANCYR_TEST_SCENARIO`. De oude override `LANCYR_TEST_KENTEKEN` is vervangen: kenteken en voertuigverwachting moeten bij elkaar passen. Ontbrekende of ongeldige gegevens geven een fout; er is geen terugval naar vaste testwaarden.

## Wat staat in de database?

Kenteken, verwacht voertuig, adres, geboortedatum, persoonlijke keuzes, bestuurder, schadevrije jaren, kilometrage, dekking en de verwachte extra dekkingen. Ook maand en dag van de ingangsdatum staan in de database; de helper kiest het eerstvolgende toekomstige jaar. Voor die jaarlijkse datum ondersteunt de proef geen 29 februari.

Selectors, paginatitels en de controle dat opties uitstaan blijven testlogica. Andere scenario's moeten dezelfde klantreis ondersteunen; deze proef dekt niet automatisch alle varianten van de website.

## Aantonen dat gewijzigde databasewaarden worden gebruikt

Na een image-build voert dit een controle uit zonder live website:

```bash
docker run --rm sq1-playwright node --test testdata/scenarios.test.cjs
```

Deze controle past `schadevrij` in een tijdelijke SQLite-database aan naar `7`. Dezelfde functie die de funnel gebruikt leest vervolgens die nieuwe waarde, zonder de testcode te wijzigen. Ook onbekende scenario's, ongeldige gegevens en de jaarovergang worden gecontroleerd. De echte database blijft ongewijzigd.

Voor een handmatige demonstratie kun je `testdata/local.sqlite` in een SQLite-editor openen en uitvoeren:

```sql
UPDATE autoverzekering_scenarios SET schadevrij = '7' WHERE id = 'standaard';
```

Start daarna de gewone run. Bij de funneltest staat stap **Haal testscenario op uit SQLite**, een scenario-ID en de JSON-bijlage **Gebruikte testdata uit SQLite**. De browserstappen gebruiken die waarden. Wijzig de database niet tijdens een run en herstel desgewenst de oorspronkelijke waarde na de demo.

Een aanpassing in `seed.sql` verandert een bestaande database niet. Nieuwe runs overschrijven dus geen handmatige SQL-wijzigingen. Om opnieuw te beginnen bewaar je de bestaande database elders; de volgende run maakt een nieuwe aan.

## Later een API

`haalTestscenarioOp()` vormt de grens tussen gegevensbron en tests. Later kan een API dezelfde getypeerde structuur leveren. Authenticatie en API-mapping zijn nog niet gebouwd. De lokale dataset reserveert geen unieke records voor parallelle tests.

De beginwaarden staan in het aparte SQL-vulbestand, niet in de testscripts. De gebruikte dataset komt in de lokale rapporten: gebruik geschikte testgegevens en geen credentials. Database en rapporten blijven buiten Git.
