# Lokale Elasticsearch-omgeving

Stap 1 t/m 5 van de overstap: een lokale Elasticsearch-server met authenticatie, blijvende opslag, vaste indices en geïmporteerde testdata. De functionele Playwright-runners halen hun testdata nu uit Elasticsearch. Runs, testresultaten en artefactverwijzingen worden daarnaast naar Elasticsearch geschreven.

## Eenvoudig starten via het menu

Gebruik `bash scripts/testmenu.sh` of de VS Code-taak **Lancyr: tests starten**. Tests starten zelf Elasticsearch en vullen ontbrekende indices en begindata aan. Kies **6** om ook Kibana en de zes gegevensweergaven klaar te zetten, **7** voor status en **8** om beide diensten te stoppen. De VS Code-taak **Lancyr: data bekijken (Kibana)** gaat rechtstreeks naar optie 6.

Dit werkt met Bash en Docker; lokale Node.js is voor deze route niet nodig. De voorbereidingscontainers voeren de Node-scripts uit. Bestaande scenario's worden niet teruggezet naar begindata, en extra scenario's blijven behouden. Eigen ongeldige data wordt bij de normale validatie vóór de tests afgewezen.

Losse omgevingsstart: `bash scripts/start-environment.sh --kibana`. De handmatige commando's hieronder blijven beschikbaar voor ontwikkeling en probleemonderzoek.

## Starten

Vereist: Bash, Docker Engine met Docker Compose en voldoende geheugen naast de Playwright-containers. Elasticsearch heeft een containerlimiet van 1 GB; Elastic adviseert voor Docker Desktop minimaal 4 GB beschikbaar Docker-geheugen.

```bash
bash scripts/elasticsearch.sh start
bash scripts/elasticsearch.sh status
bash scripts/elasticsearch.sh check
```

De eerste start downloadt de officiële **Elasticsearch 9.5.5**-image (ook vastgezet met een digest) en maakt een willekeurig wachtwoord aan in `.local/elasticsearch.env`. Dit bestand blijft buiten Git en de testimage. Gebruik je lokale editor om het wachtwoord te bekijken; deel of commit het niet.

Adres: **http://localhost:9200**. Gebruiker: **elastic**. Zonder inloggegevens krijg je HTTP 401; dat is verwacht. Een browser kan om gebruikersnaam en wachtwoord vragen. De beheeraccount is voor deze lokale inrichting; de testkoppeling krijgt later passende rechten.

`check` toont clustergezondheid. Bij een single-node kan `yellow` acceptabel zijn als replica's geen tweede node hebben; `red` is niet gereed.

## Gegevens bekijken met Kibana

Kibana is de lokale webinterface voor Elasticsearch. De versie is **9.5.5**, gelijk aan de server. Het is een aparte container op hetzelfde netwerk, met een geheugenlimiet van 1 GB bovenop Elasticsearch. De test- en GitHub-runners starten Kibana niet automatisch.

```bash
bash scripts/kibana.sh start
bash scripts/kibana.sh status
```

De eerste start downloadt de officiële image, stelt de interne `kibana_system`-account in en bewaart die login met vaste encryptiesleutels in `.local/kibana.env`. Deze account is alleen voor de verbinding tussen de diensten. Het bestand staat buiten Git en de testimage; behoud het bij de Docker-volumes.

Open **[http://localhost:5601](http://localhost:5601)**. Log zelf in als **elastic**, met het bestaande wachtwoord achter `ELASTIC_PASSWORD=` in `.local/elasticsearch.env`. Er is geen Elastic Cloud-account, enrollment-token of nieuw gebruikerswachtwoord nodig. Gebruik `kibana_system` niet om in de webinterface in te loggen.

Maak eenmalig de zes gegevensweergaven aan met de afgesproken lokale Node.js:

```bash
node scripts/kibana-setup.mjs
```

Het script controleert bij herhalen de bestaande weergaven en overschrijft geen aangepaste voorkeuren. De weergaven worden in Elasticsearch bewaard en blijven na opnieuw starten beschikbaar.

Ga in Kibana naar **Discover** (eventueel via de zoekbalk) en kies linksboven:

| Gegevensweergave | Wat je ziet |
| --- | --- |
| Testresultaten | Uitslag, browser, duur, foutmeldingen en gebruikte data per testpoging. |
| Testruns | Uitvoering, totaalaantallen en opslagstatus. |
| Artefactverwijzingen | Locatie, type, grootte en hash van bestanden. |
| Autoverzekering – scenario’s | Invoer en verwachtingen voor de funnel. |
| Regressie – scenario’s | Handelingen en instellingen voor regressietests. |
| Regressie – pagina’s | Pagina's, verwachte inhoud en bronverwijzingen. |

Zet bij resultaten/runs/artefacten de periode rechtsboven bijvoorbeeld op **Last 7 days**; de standaardperiode kan oudere runs verbergen. Scenario's hebben geen tijdfilter. Kies kolommen zoals `browser`, `status`, `duurMs` en `foutmelding` en klap een rij open voor het volledige document. Zoek bijvoorbeeld op `status: failed` of `browser: webkit`. De gegevensweergave **Testruns** gebruikt een runstatus; die is iets anders dan de Playwright-uitkomst per poging.

Kibana toont bij artefacten alleen de metadata. Open screenshots, traces en het HTML-rapport via de bestaande [rapportpagina](README-reportpage.md). Een eigen dashboard kun je later in Kibana samenstellen; er wordt geen dashboard of automatische patroonherkenning voor je aangemaakt.

```bash
bash scripts/kibana.sh check
bash scripts/kibana.sh stop  # alleen de webinterface stoppen
```

`bash scripts/elasticsearch.sh stop` stopt beide diensten en behoudt beide volumes. Kibana is uitsluitend op `127.0.0.1:5601` gepubliceerd. Het gebruikt dezelfde lokale HTTP-ontwikkelomgeving als Elasticsearch; dit is geen centrale bedrijfsinstallatie.

Bronnen: [Kibana in Docker](https://www.elastic.co/docs/deploy-manage/deploy/self-managed/install-kibana-with-docker) en [gegevensweergaven aanmaken](https://www.elastic.co/docs/api/doc/kibana/operation/operation-createdataviewdefaultw).

## Stoppen en opslag

```bash
bash scripts/elasticsearch.sh stop
```

Dit verwijdert de container/netwerk, maar behoudt het benoemde Docker-volume met gegevens. De volgende start gebruikt dezelfde opslag en hetzelfde lokale wachtwoord. Verwijder `.local/elasticsearch.env` niet zolang je het datavolume behoudt: een nieuw bootstrapwachtwoord wijzigt geen bestaand wachtwoord in de database.

Compose-project: `sq1-local-elasticsearch`. Configuratie: [elasticsearch.compose.yml](docker/elasticsearch.compose.yml). Dit is een blijvende lokale dienst naast de tijdelijke Playwright-testcontainers.

## Grenzen en problemen

- Alleen lokaal: poort 9200 is gebonden aan `127.0.0.1`; HTTP-TLS is voor deze ontwikkelomgeving uitgeschakeld. Dit is geen centrale productie-inrichting.
- Kibana is lokaal optioneel beschikbaar; Azure Blob-opslag is nog niet ingericht.
- GitHub-hosted runners kunnen deze lokale computer niet rechtstreeks als Elasticsearch-server gebruiken.
- Bij een bezette poort 9200: controleer eerst welke bestaande dienst die gebruikt.
- Bij startupfouten: controleer Docker-geheugen en containerlogs. Op Linux kan `vm.max_map_count` aanvullende hostconfiguratie vragen; wijzig dat pas op basis van de foutmelding.
- Een volume is blijvende opslag, geen back-up.

## Indexstructuur aanmaken (stap 2)

Met lokale Node.js (de afgesproken projectversie staat in `package.json`):

```bash
node scripts/elasticsearch-setup.mjs
```

Dit gebruikt het lokale wachtwoord zonder het af te drukken. Het maakt alleen ontbrekende indices aan; bestaande documenten worden niet overschreven of verwijderd. Opnieuw uitvoeren controleert bestaande mappings. Bij een afwijkende mapping stopt het script. Een gedeeltelijk mislukte inrichting kun je opnieuw uitvoeren.

Nieuwe velden kun je bewust toevoegen met `node scripts/elasticsearch-setup.mjs --add-fields`. Dit staat uitsluitend aanvullingen toe; bestaande veldtypen kunnen daarmee niet worden gewijzigd of verwijderd. Bij stap 3 is zo `gegevens.instellingen.melding` toegevoegd voor een bestaande toelichting in de regressiedata.

De JSON-definities staan in [elasticsearch/indices](elasticsearch/indices). De inhoud en afspraken staan in [elasticsearch/README.md](elasticsearch/README.md).

## Testdata rechtstreeks inrichten

De gedeelde begindata staat in `testdata/seed.json`: 6 funnelscenario’s, 14 regressiepagina’s en 18 regressiescenario’s. Er is geen extra database of omzetting nodig. De JSON is uitsluitend een versiebeheerd startbestand, geen gegevensbron waar tests bij een storing op terugvallen.

Met de afgesproken lokale Node.js:

```bash
node scripts/elasticsearch-setup.mjs
node scripts/elasticsearch-seed.mjs --dry-run  # valideer de JSON, zonder server
node scripts/elasticsearch-seed.mjs           # maak aan; bestaande inhoud moet gelijk zijn
node scripts/elasticsearch-seed.mjs --verify  # vergelijk de bestemming met de begindata
node scripts/elasticsearch-seed.mjs --missing-only # alleen ontbrekende documenten aanvullen
```

De inrichting controleert vooraf alle scenario’s, gegevenstypen, unieke IDs en paginaverwijzingen. Daarna maakt zij de documenten rechtstreeks in Elasticsearch aan. Gelijke bestaande documenten blijven behouden, inclusief hun oorspronkelijke tijdstip. In de standaard-/controlemodus geven afwijkende inhoud of extra documenten binnen dezelfde suite/omgeving een fout. De automatische voorbereiding gebruikt `--missing-only`: die maakt alleen ontbrekende documenten aan en behoudt bestaande inhoud en extra records. Er wordt niets stil overschreven of verwijderd.

Wijzigingen in `seed.json` veranderen bestaande documenten dus niet automatisch. Voer bewuste wijzigingen rechtstreeks in Elasticsearch uit en houd de gedeelde begindata bij wanneer die ook voor nieuwe omgevingen moet gelden. `--verify` kan na een lokale wijziging terecht verschillen melden. Bij een gedeeltelijk mislukte inrichting kan dezelfde bron opnieuw worden aangeboden.

De tests gebruiken uitsluitend Elasticsearch, via een vooraf geladen JSON-momentopname per run. Resultaten en artefactverwijzingen worden afzonderlijk na de run opgeslagen.

Technische controles, zonder live website:

```bash
node scripts/elasticsearch-seed.test.mjs
node testdata/scenarios.test.cjs
node testdata/regressie.test.cjs
```

## Testdata gebruiken tijdens een run (stap 4)

Start Elasticsearch en gebruik daarna het bestaande menu of de bestaande runners:

```bash
bash scripts/elasticsearch.sh start
bash scripts/run-lancyr-browsers.sh funnel standaard all
bash scripts/run-schade-regressie.sh headless all
```

De testcontainers gebruiken het Compose-netwerk `sq1-local-elasticsearch_default` en serveradres `http://elasticsearch:9200`. De poort op je computer blijft alleen via localhost bereikbaar. De login komt via `--env-file` uit `.local/elasticsearch.env`; dit bestand wordt niet in de image opgenomen. De gegevenswrapper geeft het wachtwoord niet door aan het Playwright-subproces.

De wrapper haalt data op vóór Playwright begint en schrijft een tijdelijke JSON-snapshot met bestandsrechten 0600. Alle workers gebruiken deze snapshot, waarna hij wordt verwijderd. De bestaande rapportbijlagen bewaren de gebruikte waarden. Er wordt geen tweede database aan de testcontainer gekoppeld. Zonder verbinding of geldige data stopt de run.

Met lokale Node.js kun je ook rechtstreeks starten:

```bash
LANCYR_LINT_SUITE=schade node scripts/with-elasticsearch-data.mjs npx playwright test test/schade-melden
LANCYR_LINT_SUITE=autoverzekering node scripts/with-elasticsearch-data.mjs npx playwright test test/autoverzerkeringsfunnel/lancyr-autoverzekering.spec.ts
```

Rechtstreeks `npx playwright test` laadt de gegevens niet vooraf. Gebruik voor functionele tests de wrapper of de runners. Visuele tests hebben geen scenario-opslag nodig. Hun eigen runner gebruikt Elasticsearch wel voor de resultaatopslag.

Instellingen: `LANCYR_TEST_SCENARIO` (standaard `standaard`), `LANCYR_TEST_ENVIRONMENT` (standaard `lokaal`) en `LANCYR_LINT_SUITE` (`autoverzekering`, `schade`, of bij de wrapper standaard `all`). De Docker-helper accepteert desgewenst `ELASTICSEARCH_DOCKER_NETWORK` en `ELASTICSEARCH_URL`. Deze inrichting gebruikt nog de lokale beheeraccount; centrale toegang en passende servicerechten volgen later.

Er geldt voorlopig een limiet van 1000 documenten per indexselectie. De loader weigert grotere of onvolledige datasets expliciet. Gegevens worden niet stil afgekapt. Voor grotere suites moet paginering worden toegevoegd.

### GitHub Actions

De funnelworkflow start een eigen Elasticsearch-container op de tijdelijke runner, maakt de indices aan en schrijft de JSON-begindata uit de repository rechtstreeks naar Elasticsearch. Daarna gebruikt dezelfde Docker-testrunner Elasticsearch. De server wordt na afloop gestopt; de GitHub-runner en zijn opslag zijn tijdelijk. Lokale handmatige wijzigingen in jouw Elasticsearch gaan dus niet mee naar GitHub. Centrale, blijvende opslag is nog niet ingericht. Het cron-tijdstip is niet gewijzigd.

## Runs en resultaten opslaan (stap 5)

Alle drie Docker-runners registreren automatisch de run en schrijven na afloop naar:

| Index | Inhoud |
| --- | --- |
| `sq1-testruns-v1` | Run-ID, suite, omgeving, trigger, commit/branch, tijden, workers, exitcode en totalen. |
| `sq1-testresultaten-v1` | Eén document per testpoging/browser, met uitkomst, duur, fout, gebruikte testdata en aanvullende testdetails. |
| `sq1-artefacten-v1` | Relatieve locatie, type, grootte, SHA-256 en eventueel resultaat-ID van ieder lokaal rapportbestand. |

De oorspronkelijke HTML-/JSON-rapporten, screenshots en traces blijven onder `test-runs/`. Er worden geen screenshot- of tracebestanden naar Elasticsearch geüpload. Inline JSON-testdatabijlagen worden wel als gestructureerde snapshots opgeslagen. `details` bewaart onder meer annotaties, stappen en uitvoer; deze extra inhoud wordt opgeslagen maar niet apart geïndexeerd.

De run begint met `status: running`, `opslagStatus: pending`. Na alle resultaten en artefactverwijzingen volgt de eindstatus (`passed`, `failed` of `interrupted`) met `opslagStatus: complete`. Een geslaagde test kan dus naast een mislukte opslag bestaan. De opslagstatus is niet de testuitslag. Een abrupt afgebroken of hard verwijderde container kan een run op `running/pending` laten staan; automatische herstelbewaking is nog niet gebouwd.

Retries leveren meerdere testpogingen op, maar worden in de totalen niet als extra tests geteld. De uitkomst volgt Playwright (`expected`, `unexpected`, `flaky`, `skipped`). Ook een voorbereidingsfout zonder Playwright-JSON krijgt een mislukte runregistratie zodra opslag mogelijk is.

### Lokale bestanden en opnieuw opslaan

Iedere run bewaart daarnaast:

- `RUN-METADATA.json`: unieke run-ID en startcontext.
- `TESTDATA.json`: bij functionele runs de vooraf opgehaalde gegevens, zonder logininformatie.
- `ELASTICSEARCH-EXPORT.json`: de eindrun, testresultaten en artefactmetadata voor opnieuw opslaan.
- `ELASTICSEARCH-STATUS.json`: `running`, `stored` of `pending`, met een eventuele opslagfout.

De export wordt vóór de netwerkaanroep aangemaakt. Bij een opslagfout blijven de rapporten en export behouden. Een geslaagde browserrun krijgt dan toch een niet-nul exitcode, zodat GitHub Actions een opslagprobleem niet verbergt. Een bestaande testfout behoudt zijn eigen exitcode.

Opnieuw opslaan zonder browsers te starten:

```bash
node scripts/elasticsearch-results.mjs retry test-runs/NAAM-VAN-DE-RUNMAP
```

Gebruik het bestaande exportbestand en behoud de runmap. De IDs blijven gelijk: een herhaalde of gedeeltelijk mislukte publicatie wordt aangevuld/overschreven voor dezelfde run, zonder dubbele resultaten. Bewerk de export niet handmatig. De opslag over meerdere indices is geen transactie; de run wordt pas als compleet gemarkeerd na bevestiging van alle documenten. Voltooiing controleert ook de opgeslagen run opnieuw.

Bij oude indices na stap 4 eerst de aanvullende velden toepassen:

```bash
node scripts/elasticsearch-setup.mjs --add-fields
```

### Grenzen en controles

De automatische opslag geldt voor de Docker-runners via `run-and-summarize.sh`. De losse gegevenswrapper of rechtstreeks Playwright starten maakt op zichzelf geen Elasticsearch-resultaatexport. Buildfouten vóór het starten van deze wrapper hebben nog geen runregistratie.

GitHub gebruikt nog een tijdelijke Elasticsearch-server per workflow. De documenten verdwijnen met die runner. Het downloadbare artefact bewaart de export en lokale bestanden; je kunt die export desgewenst met `retry` in je lokale Elasticsearch opslaan. Voor centrale blijvende historie is later een gedeelde server nodig. Azure Blob blijft een afzonderlijke vervolgstap zodra toegang beschikbaar is.

Technische controles zonder websiteverkeer:

```bash
node scripts/elasticsearch-results.test.mjs
# Ook de echte lokale server controleren; unieke validatierecords worden opgeruimd:
RUN_ELASTICSEARCH_INTEGRATION=1 node scripts/elasticsearch-results.test.mjs
```

De controles behandelen meerdere pogingen, overgeslagen tests, ontbrekende JSON, snapshots, artefactmetadata, gedeeltelijke opslag, opnieuw opslaan en het behoud van rapporten/foutcodes.

## Ketencontrole met de echte funnel (stap 6)

Uitgevoerd op **16 oktober 2026**, met scenario `standaard`, drie browsers, twee workers en zonder retries:

```bash
bash scripts/run-lancyr-browsers.sh funnel standaard all
```

Runmap: `test-runs/2026-10-16_13-06-57_funnel_b8dy4Y/`.
Run-ID: `d3d59035-325a-4b05-97e5-a478bc1983ac`.

| Controle | Uitkomst |
| --- | --- |
| Elasticsearch-testdata laden en suite-linting | Geslaagd |
| Chromium-funnel | Geslaagd |
| Firefox-funnel | Geslaagd |
| WebKit-funnel | Gefaald: na start van de premieberekening verscheen ‘Kies je dekking’ niet binnen 60 seconden |
| Lokale HTML, JSON, samenvatting en gebruikte testdata | Aanwezig |
| WebKit-foutscreenshot en trace | Aanwezig en gekoppeld aan het resultaat |
| Elasticsearch | Eén gefaalde run, drie testresultaten, 30 artefactverwijzingen; inhoud volledig teruggelezen en vergeleken |
| Bestandsmetadata | Alle groottes en SHA-256-hashes gecontroleerd |
| Lokaal rapportoverzicht | Herkent de run en toont twee geslaagde en één gefaalde browsertest |
| Opnieuw opslaan via `retry` | Geen duplicaten; nog steeds drie resultaten en 30 artefactverwijzingen |

De run duurde circa **106 seconden**, exclusief imagebuild. De keten voor gegevens, uitvoering, rapportage en opslag is daarmee gecontroleerd, inclusief echte foutbijlagen. De functionele funnel is in deze run niet in alle browsers geslaagd. De oorzaak van de WebKit-overgang is nog niet vastgesteld; er zijn geen verwachtingen, timeouts of retries aangepast om de test groen te maken. Dit resultaat zegt niets over latere wijzigingen aan de website.

Centrale hosting, passende servicerechten en Azure Blob volgen afzonderlijk.

Bronnen: [Elastic: single-node Docker](https://www.elastic.co/docs/deploy-manage/deploy/self-managed/install-elasticsearch-docker-basic) en [Docker-configuratie](https://www.elastic.co/docs/deploy-manage/deploy/self-managed/install-elasticsearch-docker-configure).
