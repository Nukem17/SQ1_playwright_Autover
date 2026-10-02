# Testgegevens uit SQLite

De bestaande autoverzekeringsfunnel haalt invoer en gegevensafhankelijke verwachtingen met SQL uit een lokale database. De twee korte paginatests en de visuele proef hebben deze dataset niet nodig.

| Bestand | Taak |
| --- | --- |
| `testdata/seed.sql` | Tabel en startgegevens voor een eenmalige inrichting. |
| `testdata/local.sqlite` | Lokale database; buiten Git en de Docker-buildcontext. |
| `testdata/scenarios.ts` | SQL-query, validatie en dynamische ingangsdatum. |
| `scripts/init-testdata.mjs` | Maakt een ontbrekende database aan en voert nieuwe migraties eenmaal uit. |
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

De runner initialiseert zo nodig SQLite, past nieuwe migraties eenmaal toe en valideert het scenario voordat browsers starten. Daarna is de datamap alleen-lezen gekoppeld aan de testcontainer. Iedere funneltest haalt de gegevens zelf op met een geparameteriseerde query:

```sql
SELECT * FROM autoverzekering_scenarios WHERE id = ?;
```

Standaard wordt `standaard` gekozen. Het tweede argument heeft voorrang op `LANCYR_TEST_SCENARIO`. De oude override `LANCYR_TEST_KENTEKEN` is vervangen: kenteken en voertuigverwachting moeten bij elkaar passen. Ontbrekende of ongeldige gegevens geven een fout; er is geen terugval naar vaste testwaarden.

## Wat staat in de database?

Kenteken, verwacht voertuig, adres, geboortedatum, persoonlijke keuzes, bestuurder, schadevrije jaren, kilometrage, dekking en de verwachte extra dekkingen. Ook maand en dag van de ingangsdatum staan in de database; de helper kiest het eerstvolgende toekomstige jaar. Voor die jaarlijkse datum ondersteunt de proef geen 29 februari.

Selectors en paginatitels blijven testlogica. De partnerroute vraagt een extra geboortedatum. Het scenario met een inwonend kind controleert juist dat verdergaan geblokkeerd wordt. Extra dekkingen worden per scenario ingesteld en gecontroleerd.

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

## Variatie tussen gebruikers

Alle scenario’s gebruiken hetzelfde kenteken. Dit zijn de eenmalige uitgangswaarden; handmatige wijzigingen worden daarna behouden.

| Scenario | Gezin | Bestuurder | Dekking | Kilometrage per jaar | Extra keuzes / uitkomst |
| --- | --- | --- | --- | --- | --- |
| standaard | Alleenstaand zonder kinderen | Ikzelf | WA+ | 15.000–20.000 | Geen extra’s; winkelwagen. |
| testgebruiker-anna | Alleenstaand zonder kinderen | Ikzelf | WA | Minder dan 7.500 | Nul schadevrije jaren; demonstratie van de gevonden fout bij de premieberekening. |
| testgebruiker-bram | Gezin zonder kinderen | Partner | WA+ | 7.500–10.000 | Partnergeboortedatum; inzittendendekking aan. |
| testgebruiker-celine | Alleenstaand met kinderen | Ikzelf | Allrisk | 20.000–25.000 | Rechtsbijstand aan. |
| testgebruiker-daan | Gezin met kinderen | Inwonend kind | Niet bereikt | Niet ingevuld | Melding zichtbaar, berekening geblokkeerd; geen winkelwagen. |
| testgebruiker-emma | Gezin met kinderen | Partner | Allrisk | Meer dan 30.000 | Partnergeboortedatum; beide extra dekkingen aan. |

Bram, Celine, Emma en standaard kiezen product 20566, dat de twee verwachte extra dekkingen biedt. `aanbodProductId` voorkomt dat een andere sorteervolgorde een ander product oplevert. Ontbrekend aanbod laat de test falen; hij kiest niet stilzwijgend een alternatief.

Nieuwe velden: `geboortedatumPartner` (verplicht bij Partner), `verwachteUitkomst` (winkelwagen of bestuurder-geblokkeerd), `aanbodProductId` en `geselecteerdeExtras` (JSON-lijst met te kiezen namen uit extraDekkingen).

De site gebruikt eigen dekkingsknoppen met `data-state`; de test controleert die knoppen. De gewone HTML-checkboxen in de cookiemelding zijn geen verzekeringskeuzes.

De uitbreiding staat in `testdata/migrations/001-variatie.sql`. De initialisatie houdt de versie bij via SQLite `user_version`. Nieuwe databases krijgen na `seed.sql` ook de migratie. Bestaande adressen en persoonsgegevens blijven behouden. Alleen bij de eerste migratie worden de variatie-instellingen van de vijf benoemde gebruikers aangepast; latere runs overschrijven ze niet opnieuw.

Dit is gerichte variatie, geen volledige combinatiedekking. Privacytoestemming blijft Ja. De bewuste funnel-demo is alleen bruikbaar voor scenario’s die de winkelwagen bereiken.

### Bevinding tijdens verificatie

Bij Anna gaf de premie-API met nul schadevrije jaren de melding `Ongeldig aantal schadevrije jaren`, terwijl de pagina geen duidelijke foutmelding toonde en niet doorging naar de dekkingskeuze. Anna blijft bewust op nul schadevrije jaren staan om deze bevinding tijdens de presentatie te kunnen aantonen. De normale funneltest verwacht dat zij kan doorgaan naar de dekkingskeuze en faalt zolang dit probleem optreedt; de test wordt niet als verwachte fout gemarkeerd. Bij een fout worden een screenshot en trace bewaard. Als de website dit oplost, kan de test weer slagen. Gebruik hiervoor de normale run, niet de kunstmatige funnel-demo:

```bash
bash scripts/run-lancyr-browsers.sh headless testgebruiker-anna
```
