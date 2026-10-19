# Sidequest: basis voor de Novulo-testsuite

Projectuitleg voor lezers zonder programmeerervaring. Bijgewerkt op **16 oktober 2026**, op basis van de projectcode en opgeslagen resultaten. Dit document onderscheidt de huidige proef van de geplande Novulo-suite.

## Aanleiding en doel

Na een wijziging kunnen eerder werkende onderdelen van een applicatie kapotgaan. Handmatig steeds dezelfde controles uitvoeren kost tijd. Een automatische testsuite herhaalt handelingen en controleert afgesproken uitkomsten.

Deze sidequest bouwt daarvoor een herbruikbare basis. Lancyr is de praktijkomgeving: de tests controleren de autoverzekeringsfunnel en **Schade melden**. De uiteindelijke toepassing is een centrale testsuite voor Novulo-processen.

De basis bestaat uit testcode, een vaste uitvoeromgeving, gescheiden testdata en rapportage. Lancyr-specifieke browserhandelingen worden later vervangen of aangevuld met Novulo-tests.

## Ontwikkeling

Git bewaart wijzigingen als commits. Een merge voegt werk uit een ontwikkeltak samen met de hoofdtak.

| Periode in 2026 | Uitbreiding |
| --- | --- |
| 16–17 september | Basisproject, Lancyr-tests en Docker-workflow. |
| 28 september | Versies vastgelegd; PR #1. |
| 29 september | Headed viewer en WebKit; PR #2 en #3. |
| 30 september | Visuele referentietest; PR #4. |
| 30 september–2 oktober | Eerste gegevenslaag en gebruikersscenario’s; PR #5. |
| 5 oktober | Centrale rapportpagina; PR #6. |
| 5–7 oktober | Schade-regressiesuite, testgroepen, browserfilter en startmenu met live meekijken. |

## Technische basis

**Playwright** bestuurt echte browsers: pagina’s openen, velden invullen en klikken. Na handelingen controleert de test een verwachting. Een klik alleen bewijst niet dat een proces werkt.

**TypeScript** is de taal waarin de tests zijn geschreven. **Node.js** voert de tools uit. **npm** installeert benodigde pakketten en biedt herkenbare startcommando’s. Playwright voert de tests uit; npm is geen testrunner.

| Onderdeel | Projectversie / afspraak |
| --- | --- |
| Node.js | 24.21.0, uit de LTS-reeks voor langdurige ondersteuning. |
| npm | 11.19.0; gecontroleerd tijdens de Docker-build. |
| Playwright | 1.63.0; gelijk aan de browserimage. |
| TypeScript / @types/node | 6.0.3 / 24.19.0. |
| Dependencies | Exact vastgelegd in `package-lock.json`; installatie met `npm ci`. |
| Docker-basisimages | Vaste versies én digests die de image-inhoud identificeren. |

Deze combinatie houdt de omgeving consistent. LTS geldt hier voor Node.js; de andere tools zijn vastgelegde projectversies. Versies kunnen mee als uitgangspunt voor Novulo, maar moeten bewust worden onderhouden.

TypeScript is voor ESLint-ondersteuning aangepast van 7.0.2 naar 6.0.3. Node.js, npm en Playwright blijven gelijk. De GitHub-workflow voert bij pushes en pull requests ESLint en typecontrole uit, zonder browsertests.

## Docker en uitvoering

Een **image** is het voorbereide pakket met tooling, browsers en testcode. Een **container** is een actieve uitvoering daarvan.

```text
Menu of npm → Bash-runner → Docker → Playwright → resultaten → HTML-overzicht
```

De runner bouwt de image en start een tijdelijke testcontainer. De functionele suites halen vooraf hun testdata uit Elasticsearch op en valideren deze. Docker kan ongewijzigde buildlagen hergebruiken. De testcontainer gebruikt een tijdelijke gegevenssnapshot en schrijft rapporten naar een gekoppelde lokale map: een **bind mount**. Runs, resultaten en verwijzingen naar bestanden worden daarnaast in Elasticsearch opgeslagen.

Na afloop verwijdert `--rm` de container. De image en resultaten onder `test-runs/` blijven bestaan. De samenvatting wordt ook na een gewone testfout gemaakt; de foutstatus blijft behouden. Een buildfout of abrupt afgebroken container kan volledige rapportage verhinderen.

De rapportserver draait in een aparte container zolang die openstaat. Hij leest resultaten en start geen tests.

## Starten en meekijken

Collega’s hebben voor het menu **projectbestanden, Bash en Docker** nodig. Node.js en npm zitten in Docker. Alleen lokale npm-commando’s en ontwikkelcontroles vragen lokale installatie.

In VS Code: **Terminal → Run Task → Lancyr: tests starten**. Kies suite, browser, modus en bij autoverzekering één scenario. Beide functionele suites leveren twee afzonderlijke runs op.

| Modus | Gebruik |
| --- | --- |
| Headless | Gewone uitvoering zonder browservenster; normaal twee workers. |
| Headed | Venster op een virtueel scherm in Docker. |
| Visible/noVNC | Live meekijken via een browserviewer; één worker. |

noVNC is een webgebaseerde schermviewer, geen browserextensie. De visible-optie staat in het menu bij autoverzekering. Na de gereedmelding opent de gebruiker poort 6080 en start met Enter in de terminal. De viewer laat alleen meekijken toe.

Headed helpt bij observatie en demonstratie. Voor onderzoek achteraf zijn **traces** vaak informatiever: ze bevatten acties, pagina-inhoud en netwerkgegevens. Een trace is geen gewone video; automatische video-opname is niet ingeschakeld.

## Wat wordt getest?

### Autoverzekering

Drie functionele tests controleren de ingang van de premieberekening, het tegenhouden van een leeg kenteken en de klantreis met een database-scenario. De lange route controleert voertuig, persoonlijke keuzes, bestuurder, dekking, product, extra opties en winkelwagen.

Bij een partner wordt een extra geboortedatum gebruikt. Bij een inwonend kind verwacht de test een blokkade. Drie tests in drie browsers leveren normaal negen browserresultaten op.

De test stopt vóór **Sluit af**; eerdere stappen doen wel serververzoeken. De exacte juistheid van alle premiebedragen, mobiele apparaten en definitieve aanvraag zijn niet afgedekt.

### Schade melden

| Groep | Controles |
| --- | --- |
| Bereikbaarheid | 14: status, bestemming en herkenbare inhoud. |
| Pagina-inhoud | 42: titel, zichtbare H1-hoofdkop en niet-lege beschrijving voor zoekmachines. |
| Navigatie | 8: schadeopties en externe formulierverwijzingen. |
| FAQ | 2: open/dicht/heropenen en antwoord openen/terugkeren. |
| Paginering | 1: pagina’s wisselen, herladen en terug/vooruit. |
| URL-varianten | 7: juiste vragen bij verschillende URL-parameters. |

**74 controles × drie browsers = 222 browserresultaten.** De controles zijn onafhankelijk: een ontbrekende kop voorkomt geen aparte navigatietest. Externe formulieren worden niet geopend of verzonden. De suite test pagina’s en bediening, geen volledige schadeafhandeling of SEO-audit.

Een **worker** is een uitvoerproces. Twee workers voeren maximaal twee tests tegelijk uit, over de gekozen browsers samen. Het zijn niet twee workers per browser. Meer workers vragen capaciteit en onafhankelijke gegevens.

## CSV en regressietests

Het Moz-CSV-bestand bevat 27 geselecteerde meldingen voor 14 schade-URL’s. De bronmeldingen betreffen ontbrekende koppen en descriptions. Pagina’s, verwachtingen en CSV-regelnummers zijn vastgelegd in de database; het CSV-bestand wordt niet tijdens iedere run rechtstreeks gelezen.

Aanvullend zijn navigatie en FAQ-gedrag onderzocht. De dichtklapcontrole komt uit browserinspectie, niet uit de CSV.

Een regressietest herhaalt verwachtingen om achteruitgang te signaleren. De eerste run kan ook bestaande fouten blootleggen. Een bekende fout blijft rood totdat het gedrag klopt; verwachtingen worden niet gewijzigd om fouten te verbergen.

## Gegevens en visuele controles

De **data** bepaalt invoer en verwachte uitkomst; **testcode** bepaalt de handelingen. Elasticsearch bewaart autoverzekeringsscenario’s, regressiepagina’s en actiescenario’s. Vóór iedere functionele run wordt een tijdelijke JSON-snapshot uit Elasticsearch geladen, zodat alle workers dezelfde data gebruiken. De gegevenslaag valideert ze vóór de browsers starten. Gebruikte waarden worden bij het rapport bewaard.

Er zijn één standaardscenario en vijf benoemde gebruikersscenario’s. Ze variëren in bestuurder, gezin, dekking en extra’s. Per autoverzekeringsrun wordt één scenario geselecteerd. Database-updates worden eenmaal via migraties toegepast; volgende runs overschrijven handmatige wijzigingen niet opnieuw.

De visuele proef vergelijkt het eerste autoverzekeringsscherm in Chromium op 1440 × 700 pixels. Alleen een expliciete referentieopname mag de norm vernieuwen; die vraagt menselijke beoordeling.

Playwright levert de screenshotvergelijking en verschilbeelden. Het project voegt een HTML-overzicht met **referentie, actueel en verschil** toe. De demo verschuift lokaal een veld 60 pixels en hoort te falen. Een pixelverschil toont de afwijking, niet automatisch de oorzaak.

## Resultaten onderzoeken

Iedere run krijgt JSON, een samenvatting, een Playwright HTML-rapport en bij fouten screenshots/traces. De eigen centrale pagina op poort 8070 bundelt de lokale runmappen. Ze controleert elke tien seconden op updates.

```text
Onderdeel → run → testgroep → controle → browser → foutdetails → trace
```

Filters helpen zoeken op onderdeel, groep, browser, gebruiker/scenario, status, datum en demo. Bij regressietests staat een controle één keer met browserresultaten eronder. Bovenste tellingen volgen de filters; de runstatus blijft die van de volledige run. Onleesbare resultaten worden niet groen weergegeven.

Het overzicht verklaart verwachting en waarneming. Het originele Playwright-rapport levert de gedetailleerde stappen en trace. Nieuwe onderdelen worden via labels herkend; runners moeten dezelfde rapportstructuur leveren.

De opgeslagen schade-run van **5 oktober 2026** duurde circa acht minuten, exclusief voorbereiding: 138 geslaagde en 84 gefaalde browserresultaten. De fouten betroffen H1, description en FAQ-dichtklappen. Dit is historische meetinformatie. De visible-run van 7 oktober bevat drie geslaagde resultaten. Voor deze documentatie zijn geen nieuwe live runs uitgevoerd.

## Overstap naar Novulo

De kern die meegaat: vaste tooling, Docker, uitvoerscripts, gegevenslaag, browserprojecten, benoemde stappen, foutbijlagen en HTML-overzicht. Lancyr-specifieke routes en locators maken plaats voor Novulo-processen.

Een Novulo-scenario beschrijft bijvoorbeeld een conceptorder, de benodigde rol, een goedkeuringsactie en de verwachte status. De order staat in Novulo; de testsuite bewaart scenario’s en verwijzingen. Dit is een toekomstvoorbeeld, geen gebouwde ordertest.

Elasticsearch bewaart JSON-documenten in indices in plaats van SQL-tabellen. De lokale koppeling haalt scenario’s op, authenticeert en valideert. Een snapshot vóór de run maakt deze data ook beschikbaar bij het samenstellen van regressietests. Runs en testpogingen gaan na afloop naar aparte indices. Screenshots, traces en HTML blijven bestanden; Elasticsearch bewaart hun metadata en locatie. Bij een opslagfout blijft een lokale export beschikbaar voor opnieuw opslaan. Azure Blob en centrale hosting zijn nog niet aangesloten.

Voor centrale inzet zijn ook login/rollen, testomgevingen, veilig credentialbeheer, unieke procesrecords, opruimen en gedeelde rapportopslag nodig. De lokale rapportpagina heeft geen accountbeheer. GitHub Actions controleert linting en types. Een aparte workflow plant alleen de funnel eenmaal per nacht om 02:00 UTC (03:00 wintertijd / 04:00 zomertijd), na opname op de standaardbranch. Gedeelde opslag en centrale teamhosting zijn nog niet ingericht.

De sidequest levert de keten **starten → uitvoeren → controleren → bewaren → onderzoeken**. De volgende stap is deze basis op één afgesproken Novulo-proces toepassen en daarna uitbreiden.

## Bronnen en verdere uitleg

Onderbouwd met de huidige code, eerdere Git-geschiedenis en opgeslagen JSON-rapporten; de lokale Elasticsearch-inrichting en controles zijn op 16 oktober toegevoegd. Details:

- [Starten en versies](../README.md)
- [Autoverzekering](../README-lancyr-test.md), [visuele tests](../README-visual-test.md)
- [Testdata](../README-testdata.md), [Elasticsearch](../README-elasticsearch.md), [Schade melden](../README-schade-regressie.md)
- [Rapportpagina](../README-reportpage.md), [CSV-bronregels](../testdata/schade-bronmeldingen.md)

Officiële achtergrond: [Node.js](https://nodejs.org/en/download), [npm ci](https://docs.npmjs.com/cli/v11/commands/npm-ci/), [Playwright Docker](https://playwright.dev/docs/docker), [screenshotvergelijking](https://playwright.dev/docs/test-snapshots), [traces](https://playwright.dev/docs/trace-viewer) en [Elasticsearch-indices](https://www.elastic.co/docs/manage-data/data-store/index-basics).
