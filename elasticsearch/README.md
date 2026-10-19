# Gegevensstructuur voor de lokale testsuite

Een index is een verzameling documenten, vergelijkbaar met een tabel. Een document is één scenario, pagina, run, testpoging of artefactverwijzing. De definities in `indices/` zijn het contract voor de latere import en resultaatopslag.

| Index | Eén document bevat | Document-ID bij latere import/opslag |
| --- | --- | --- |
| `sq1-autoverzekering-scenarios-v1` | Een funnelscenario met invoer en verwachte uitkomst | `omgeving:suite:scenarioId` |
| `sq1-regressie-scenarios-v1` | Een regressiehandeling met instellingen en paginaverwijzingen | `omgeving:suite:scenarioId` |
| `sq1-regressie-paginas-v1` | Een pagina met verwachte titel, HTTP-status en brongegevens | `omgeving:suite:paginaId` |
| `sq1-testruns-v1` | Eén uitvoering met tijden, aantallen en eindstatus | Unieke `runId` |
| `sq1-testresultaten-v1` | Eén testpoging in één browserproject | `runId:testId:project:poging` |
| `sq1-artefacten-v1` | Metadata en opslaglocatie van een screenshot, trace of rapport | Unieke artefact-ID binnen de run |

Bij samengestelde IDs wordt elk onderdeel met `encodeURIComponent` gecodeerd en daarna met `:` gescheiden. Scenario's bewaren hun bestaande `gegevens.id`; het documentveld `id` bevat de samengestelde document-ID. Dat voorkomt botsingen tussen suites en omgevingen. De lokale import gebruikt omgeving `lokaal` en suites `autoverzekering` en `schade-melden`.

## Testdata

Scenario- en paginadocumenten hebben `id`, `suite`, `omgeving`, `schemaVersie`, `bijgewerktOp` en `gegevens`. `gegevens` volgt de bestaande objecten uit `testdata/scenarios.ts` en `testdata/regressie.ts`, zodat de testcode later dezelfde gegevens kan ontvangen.

- Funnel: kenteken, adres, geboortedatum, bestuurder, dekking, extra dekkingen en verwachte uitkomst.
- Regressiepagina: pad, verwachte titel/hoofdtitel/status en broninformatie.
- Regressiescenario: soort handeling, bron-/doelpagina en instellingen zoals doelpad, antwoordtekst of verwachte pagina.
- Objecten en lijsten staan direct als JSON in de begindata en Elasticsearch. Ontbrekende optionele waarden worden weggelaten of `null`.
- Keuzecodes, huisnummers, schadevrije jaren en kilometrage blijven tekst zoals het huidige testcontract verwacht. Jaarlijkse ingangsmaand en -dag zijn gehele getallen; geboortedatums hebben formaat `YYYY-MM-DD`.

## Runs en resultaten

Een run krijgt een unieke ID, suite, omgeving, trigger (`handmatig` of `schedule`), commit, branch, workers, begin-/eindtijd, duur in milliseconden, exitcode, rapportpad en aantallen. `status` voor een run is `running`, `passed`, `failed` of `interrupted`. Een vroege crash zonder JSON wordt ook als mislukte run vastgelegd. `opslagStatus` is eerst `pending` en wordt pas `complete` nadat alle documenten bevestigd zijn. `foutmelding` bevat eventuele runbrede fouten.

Een resultaat verwijst via `runId` naar de uitvoering. Bewaar test-ID, titel, bestand/regel, browser, Playwright-project, poging (0 voor de eerste poging), worker, starttijd, duur en eventuele foutmelding/stack. `status` volgt de Playwright-poging (`passed`, `failed`, `timedOut`, `skipped`, `interrupted`); `uitkomst` volgt de totale testbeoordeling (`expected`, `unexpected`, `flaky`, `skipped`). Tel voor de run de uiteindelijke testbeoordelingen, niet iedere poging als een aparte test.

`scenarioId`, `scenarioIndex` en eventueel `paginaId` verwijzen naar de gebruikte gegevens. `details` bewaart annotaties, verwachte status, stappen en uitvoer als niet-geïndexeerd object. `testdataSnapshot` bewaart de gebruikte gegevens bij die poging, zodat later gewijzigde scenario's de historie niet onduidelijk maken. Deze snapshot wordt wel opgeslagen, maar niet doorzoekbaar gemaakt; de oorspronkelijke scenariovelden zijn dat wel. Dit voorkomt onbeperkte nieuwe velden bij toekomstige Novulo-processen.

## Artefacten

Bewaar `runId`, eventueel `resultaatId`, soort, opslag (`local`, later `azure-blob`), relatief pad/blobnaam, contenttype, grootte en optioneel SHA-256. Het HTML-rapport is ook een artefact. De automatische resultaatopslag berekent bestandsgrootte en SHA-256 en registreert ook JSON-rapporten en samenvattingen. De bestanden zelf blijven lokaal in `test-runs/`; later kunnen ze naar Azure Blob. Bewaar hier geen tijdelijke toegangstokens of ondertekende downloadlinks.

## Technische afspraken

- `dynamic: strict` weigert onbekende velden, ook in de expliciet beschreven objecten. Zo verdwijnen spelfouten niet ongemerkt in een nieuwe kolom.
- `keyword` is voor exacte selectie en groepering, `text` voor doorzoeken van titels en fouten, `date` voor datums/tijden, `integer`/`long` voor aantallen en duur. Numerieke velden converteren geen tekst automatisch naar getallen.
- Tijdstippen zijn ISO 8601 in UTC; datumvelden voor geboortedatums zijn alleen een kalenderdatum.
- Een mapping maakt velden niet verplicht en controleert geen toegestane statuswaarden of relaties. De gegevenslaag controleert verplichte velden, geldige keuzes en bestaande paginaverwijzingen. Elasticsearch voert geen joins of foreign-keycontroles uit.
- `v1` en `schemaVersie: 1` leggen de eerste structuur vast. Een onverenigbare wijziging vraagt een nieuwe indexversie en gecontroleerde migratie. Het setupscript verwijdert geen bestaande indices.
- Lokaal: één shard en nul replica's per index. Dat past bij één node; het is geen instelling voor beschikbaarheid of back-ups in productie. Bewaartermijnen zijn nog niet ingesteld.

Inrichten: `node scripts/elasticsearch-setup.mjs`. Ontbrekende indices worden leeg aangemaakt. Alleen aanvullende velden toestaan: `node scripts/elasticsearch-setup.mjs --add-fields`.

Testdata importeren: `node scripts/elasticsearch-seed.mjs`. Alleen broncontrole: `--dry-run`; alleen vergelijken met de bestaande bestemming: `--verify`. De import gebruikt de bestaande validatiefuncties voor scenario's en pagina's, controleert de volledige inhoud tegen de mappings en leest alle opgeslagen documenten terug. Details en herhaalgedrag staan in [README-elasticsearch.md](../README-elasticsearch.md). De functionele tests gebruiken inmiddels Elasticsearch via een tijdelijke JSON-snapshot vóór de run. De rapportpagina blijft lokale rapportbestanden lezen.

Bron: [Elastic: een index aanmaken met settings en mappings](https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-create).
