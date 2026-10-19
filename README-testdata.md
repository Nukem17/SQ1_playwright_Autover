# Testdata en scenario’s

Elasticsearch bewaart de invoer en verwachtingen buiten de browsercode. Vóór elke functionele run worden de gekozen gegevens opgehaald en gevalideerd. De testcode bepaalt de browserhandelingen.

## Opslag en laden

Richt eerst de lokale server, indices en import in volgens [README-elasticsearch.md](README-elasticsearch.md). De functionele Docker-runners gebruiken daarna Elasticsearch; ze gebruiken geen tweede database.

| Index | Inhoud |
| --- | --- |
| `sq1-autoverzekering-scenarios-v1` | Voertuig, adres, persoonlijke keuzes, bestuurder, dekking en uitkomst. |
| `sq1-regressie-paginas-v1` | Paden, verwachte titels/status en bronmeldingen. |
| `sq1-regressie-scenarios-v1` | Routes, actietypen en FAQ-/navigatieverwachtingen. |

`with-elasticsearch-data.mjs` haalt vóór Playwright de data op. De gedeelde validatiefuncties in `scenarios.ts` en `regressie.ts` controleren de waarden en paginaverwijzingen. Een tijdelijke JSON-snapshot zorgt dat alle workers dezelfde gegevens gebruiken, ook wanneer de tests al bij het verzamelen scenario's nodig hebben. Na afloop wordt die tijdelijke snapshot verwijderd. De Docker-runners bewaren daarnaast `TESTDATA.json` bij de run; gebruikte gegevens blijven ook als rapportbijlage bewaard en komen bij de resultaten in Elasticsearch.

Een verbindingsfout, ontbrekend scenario of ongeldige data stopt de run. Er is geen terugval naar een andere database of naar de JSON-begindata. Technische tests gebruiken JSON-testgevallen en HTTP-vervangers.

## Autoverzekering

Per run kies je één scenario:

```bash
bash scripts/run-lancyr-browsers.sh headless testgebruiker-bram chromium
```

Het tweede argument heeft voorrang op `LANCYR_TEST_SCENARIO`; standaard is `standaard`. De oude losse kentekenoverride wordt geweigerd, omdat kenteken en voertuigverwachting bij elkaar moeten passen.

| Scenario | Bestuurder | Dekking | Extra’s / verwachte uitkomst |
| --- | --- | --- | --- |
| standaard | Ikzelf | WA+ | Geen extra’s; winkelwagen. |
| testgebruiker-anna | Ikzelf | WA | Nul schadevrije jaren; winkelwagen verwacht. |
| testgebruiker-bram | Partner | WA+ | Partnergeboortedatum; inzittendendekking. |
| testgebruiker-celine | Ikzelf | Allrisk | Rechtsbijstand. |
| testgebruiker-daan | Kind-inwonend | Niet bereikt | Bestuurderblokkade verwacht. |
| testgebruiker-emma | Partner | Allrisk | Partnergeboortedatum; beide extra dekkingen. |

Dit zijn uitgangswaarden uit seed/migraties, geen bewijs van de huidige Elasticsearch-inhoud. De scenario’s variëren ook in gezin en kilometrage. Alle gebruiken hetzelfde kenteken; dit is gerichte variatie, geen volledige combinatiedekking.

Het productnummer voorkomt afhankelijkheid van de aanbodvolgorde. De ingangsdatum kiest het eerstvolgende jaar bij de opgeslagen maand/dag; 29 februari wordt niet ondersteund.

Bij Anna is historisch een premie-API-fout met nul schadevrije jaren gevonden. De normale test blijft de correcte route verwachten en faalt zolang het probleem optreedt. Dit is geen opzettelijke demo. Daan kan juist slagen wanneer de verwachte blokkade optreedt.

## Gegevens wijzigen en controleren

Wijzig het betreffende Elasticsearch-document via een geschikte client. Voorbeeld van een gedeeltelijke update met authenticatie via je client:

```http
POST /sq1-autoverzekering-scenarios-v1/_update/lokaal%3Aautoverzekering%3Astandaard?refresh=wait_for
{"doc":{"gegevens":{"schadevrij":"7"}}}
```

De volgende run haalt deze waarde opnieuw op. Een reeds gestarte run blijft zijn eigen snapshot gebruiken. Wijzig samenhangende records buiten een run: de afzonderlijke zoekopdrachten vormen geen transactie over meerdere indices. De import is geen synchronisatie; na een bewuste Elasticsearch-wijziging kan `--verify` terecht een verschil met de gedeelde JSON-begindata melden.

Technische controles gebruiken JSON-testgevallen en HTTP-vervangers, zonder live website:

```bash
node testdata/scenarios.test.cjs
node testdata/regressie.test.cjs
node scripts/elasticsearch-seed.test.mjs
node scripts/with-elasticsearch-data.test.mjs
```

## Voorbereiding op Novulo

`haalTestscenarioOp()` en `haalRegressieSetOp()` vormen de grens tussen opslag en browsercode. De Elasticsearch-koppeling levert de gevalideerde objecten die de browsercode verwacht. De regressieset is vooraf geladen en kan daardoor synchroon gebruikt worden bij het samenstellen van tests.

Deze lokale koppeling bewijst de gegevensroute. Bedrijfstoegang, rechten voor een serviceaccount, centrale hosting en unieke procesrecords voor parallelle Novulo-tests volgen later. Testresultaten worden inmiddels ook naar Elasticsearch geschreven, naast de HTML-rapporten. Zie [de projectuitleg](docs/SIDEQUEST-TESTSUITE.md) en [Schade melden](README-schade-regressie.md).
