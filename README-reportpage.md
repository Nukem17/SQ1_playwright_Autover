# Centraal resultatenoverzicht

Start vanuit Fedora/WSL in de projectmap:

```bash
bash scripts/view-reports.sh
```

Open **http://localhost:8070** in je browser of via **Simple Browser: Show** in VS Code. Laat de terminal open; stop met Ctrl+C. Docker is vereist, lokaal Node/npm niet. De pagina is alleen via de lokale computer beschikbaar.

## Resultaten onderzoeken

1. Zoek op testnaam, gebruiker, foutmelding of run. Filter op resultaat, browser, gebruiker, testsoort, datum of bewuste demo’s.
2. Open een run en vervolgens een test. Je ziet de status, duur, browser, scenario, foutmelding, pogingen en beschikbare bijlagen.
3. Open screenshots op volledige grootte, bekijk gebruikte testdata of download een trace. **Stappen en trace bekijken** opent het originele Playwright-rapport; selecteer daar de test en de trace.
4. Bij visuele runs opent **Referentie, actueel en verschil** het bestaande visuele overzicht.

De aantallen bovenaan volgen je filters. De status van een run blijft de uitslag van de volledige run. ‘Instabiel’ betekent dat Playwright de test als flaky heeft aangemerkt, bijvoorbeeld doordat een herhaling wel slaagde. Een ontbrekend of beschadigd resultaatbestand wordt nooit als geslaagd weergegeven.

Bewuste funnel- en CSS-demo’s hebben een apart label. Anna’s fout met nul schadevrije jaren is een gewone testfout en wordt niet als kunstmatige demo aangemerkt. Daan kan slagen wanneer de verwachte blokkade optreedt. Oudere runs worden weergegeven zoals ze destijds zijn vastgelegd; latere databasewijzigingen veranderen historische resultaten niet.

## Nieuwe runs

Voer tests uit met de bestaande Bash-commando’s. De pagina controleert elke tien seconden automatisch op nieuwe en gewijzigde runs. Ook bij terugkeer naar het tabblad wordt bijgewerkt. **Resultaten vernieuwen** controleert direct. Filters en geopende details blijven tijdens het automatisch bijwerken behouden. Een melding toont de laatste succesvolle controle; bij verbindingsproblemen wordt gewaarschuwd dat resultaten verouderd kunnen zijn. Filters blijven in de URL staan en **Link naar deze run** verwijst rechtstreeks naar een run. Bijlagen die niet meer bestaan worden als ontbrekend gemeld.

Alle bestaande functionele modi (headless, headed, visible en funnel-demo) en visuele modi (check, demo en reference) schrijven naar `test-runs` en worden automatisch opgenomen. Ook nieuwe tests binnen deze runs verschijnen automatisch: de pagina heeft geen vaste lijst met testnamen. Nieuwe runners moeten per run een eigen map onder `test-runs` maken, met het Playwright JSON-rapport als `results.json` en het HTML-rapport onder `html/`. Een los `npx playwright test` dat elders uitvoer schrijft, verschijnt niet automatisch.

Tijdens een run kan het JSON-rapport nog ontbreken; de run staat dan als onvolledig/onbekend vermeld, nooit als geslaagd. Definitieve testresultaten verschijnen zodra Playwright het rapport heeft geschreven. Fouten vóór het aanmaken van de runmap (zoals een mislukte Docker-build of ongeldige testdata) blijven terminalmeldingen. De pagina verzamelt lokale runmappen, niet automatisch de runs van collega’s of CI; daarvoor is later gedeelde opslag nodig.

## Opzet en grenzen van de demo

- `scripts/report-page/data.mjs`: verzamelt geneste tests, pogingen, annotaties en bijlagen uit `results.json`.
- `scripts/report-page/index.html`: centrale interface, filters en detailweergave.
- `scripts/report-page/server.mjs`: serveert het overzicht en bestanden binnen `test-runs`.
- `scripts/view-reports.sh`: start de pagina in Docker met de resultatenmap alleen-lezen gekoppeld.

Er worden geen tests gestart, resultaten gewijzigd of gegevens naar een externe dienst gestuurd. De volledige Playwright-rapporten blijven de bron voor gedetailleerde stappen en trace-analyse. De pagina heeft geen accountbeheer en is een lokale demonstratie; centrale teamhosting vereist later toegang, opslag en een bewaartermijn. Alle aanwezige runs worden ingelezen; voor veel grotere archieven kan paginering nodig zijn.

Technische controles zonder live website (na de Docker-build):

```bash
docker run --rm sq1-playwright node --test scripts/report-page/data.test.mjs scripts/report-page/live.test.mjs
```
