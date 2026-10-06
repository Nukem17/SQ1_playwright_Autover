# Centraal resultatenoverzicht

Start vanuit Fedora/WSL in de projectmap:

```bash
bash scripts/view-reports.sh
```

Open **http://localhost:8070** in je browser of via **Simple Browser: Show** in VS Code. Laat de terminal open; stop met Ctrl+C. Docker is vereist, lokaal Node/npm niet. De pagina is alleen via de lokale computer beschikbaar.

## Resultaten onderzoeken

1. Kies bovenaan een **Onderdeel**, of bekijk alle onderdelen. Runs staan per onderdeel bij elkaar. Kies **Alle resultaten**, **Met fouten** of **Geslaagd**, of zoek op testnaam, gebruiker, foutmelding of run. Onder **Meer filters** vind je testgroep, browser, gebruiker, testsoort, datum, bewuste demo’s en overige statussen. Het aantal actieve extra filters blijft zichtbaar.
2. Elke run toont de gebruiker, testsoort, datum en aantallen per status. Open een run: tests staan bij elkaar per onderdeel en testgroep. Groepen met fouten staan bovenaan, en binnen een groep staan de gefaalde tests eerst met een korte foutmelding. Kies **Bekijk fout** voor een uitleg in gewone taal en screenshots. De uitleg beschrijft wat werd verwacht en wat de test vastlegde; een oorzaak wordt niet uit de foutmelding geraden. De oorspronkelijke foutmelding blijft beschikbaar onder **Technische details en bijlagen**. Technische gegevens, console-uitvoer en overige bijlagen staan in uitklapbare onderdelen.
3. Open screenshots op volledige grootte, bekijk gebruikte testdata of download een trace. **Stappen en trace bekijken** opent het originele Playwright-rapport; kies daar bovenaan **Browser** (Alle browsers, Chromium, Firefox of WebKit), selecteer de test en open de trace. Het browserfilter werkt samen met het zoekveld en blijft bij herladen behouden. Het filter staat op het rapport dat via deze lokale rapportserver wordt geopend; een losse trace bevat alleen de opname van die ene browser.
4. Bij visuele runs opent **Referentie, actueel en verschil** het bestaande visuele overzicht.

De aantallen bovenaan volgen je filters, inclusief onderdeel en testgroep. De status en uitslagtelling op elke run blijven die van de volledige run; de vermelding “x van y tests” geeft aan hoeveel tests bij de filters passen. ‘Instabiel’ betekent dat Playwright de test als flaky heeft aangemerkt, bijvoorbeeld doordat een herhaling wel slaagde. Een ontbrekend of beschadigd resultaatbestand wordt nooit als geslaagd weergegeven.

Bewuste funnel- en CSS-demo’s hebben een apart label. Anna’s fout met nul schadevrije jaren is een gewone testfout en wordt niet als kunstmatige demo aangemerkt. Daan kan slagen wanneer de verwachte blokkade optreedt. Oudere runs worden weergegeven zoals ze destijds zijn vastgelegd; latere databasewijzigingen veranderen historische resultaten niet.

## Nieuwe runs

Voer tests uit met de bestaande Bash-commando’s. De pagina controleert elke tien seconden automatisch op nieuwe en gewijzigde runs. Ook bij terugkeer naar het tabblad wordt bijgewerkt. **Resultaten vernieuwen** controleert direct. Filters en geopende details blijven tijdens het automatisch bijwerken behouden. Een melding toont de laatste succesvolle controle; bij verbindingsproblemen wordt gewaarschuwd dat resultaten verouderd kunnen zijn. Filters blijven in de URL staan en **Link naar deze run** verwijst rechtstreeks naar een run. Bijlagen die niet meer bestaan worden als ontbrekend gemeld.

Alle bestaande functionele modi (headless, headed, visible en funnel-demo), visuele modi (check, demo en reference) en de Schade melden-regressierunner schrijven naar `test-runs` en worden automatisch opgenomen. Ook nieuwe tests binnen deze runs verschijnen automatisch: de pagina heeft geen vaste lijst met testnamen. Nieuwe runners moeten per run een eigen map onder `test-runs` maken, met het Playwright JSON-rapport als `results.json` en het HTML-rapport onder `html/`. Een los `npx playwright test` dat elders uitvoer schrijft, verschijnt niet automatisch.

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

## Uitleg bij nieuwe fouten

Iedere opgeslagen testfout krijgt automatisch een uitleg. Ook bij een onbekend fouttype toont de pagina de mislukte stap en of er daarna nog stappen zijn vastgelegd. De stapnaam komt uit het rapport; geef nieuwe stappen daarom een begrijpelijke naam via `test.step`. Een ontbrekende stapnaam, ontbrekende foutomschrijving of onderbroken test krijgt een algemene melding. De pagina verzint geen oorzaak of naam voor een niet-uitgevoerde vervolgstap. Herhalingen krijgen elk hun eigen uitleg; een latere geslaagde poging verandert de eerdere fout niet.

## Pagina’s, flows en testgroepen

Een onderdeel kan een losse pagina, een korte flow of een volledige funnel zijn. Er is geen vaste lijst of verplichte funnelstructuur.

De indeling is **onderdeel → run → testgroep → test per browser**. Bij Autoverzekering gebruiken we **Pagina en invoer**, **Klantreis** en **Visuele controle**. Binnen een klantreistest blijven de benoemde stappen beschikbaar voor foutuitleg en trace-analyse.

Nieuwe tests geven hun indeling mee als Playwright-annotaties, bijvoorbeeld:

```ts
test('de startpagina wordt getoond', {
  annotation: [
    { type: 'Onderdeel', description: 'Contactpagina' },
    { type: 'Testgroep', description: 'Pagina en invoer' },
    { type: 'Testsoort', description: 'Functioneel' },
  ],
}, async ({ page }) => {
  // Teststappen van deze pagina of flow.
});
```

Gebruik `Functioneel` of `Visueel` voor de testsoort. Onderdeel- en testgroepnamen mogen nieuw zijn: de pagina ontdekt ze automatisch in de opgeslagen rapporten. Gebruik overal dezelfde schrijfwijze. Oudere annotaties met de naam `Funnel` blijven leesbaar; `Onderdeel` heeft voorrang als beide aanwezig zijn. Er hoeft geen lijst met onderdelen in de pagina te worden aangepast.

Een run met meerdere onderdelen verschijnt één keer onder **Meerdere onderdelen**. Selecteer een onderdeel om alleen de bijbehorende tests te zien. De runstatus en aantallen op de run blijven de uitslag van de volledige run; de groepsaantallen en totaaltellingen volgen de filters. Onderdeel en testgroep worden ook in de URL bewaard.

Bestaande rapporten van `lancyr-autoverzekering.spec.ts` en `lancyr-visual.spec.ts` worden herkend op hun bestandsnaam. Onbekende tests zonder labels staan onder **Niet ingedeeld / Overige tests**. Een run zonder leesbaar resultaat staat onder **Niet ingedeeld**, totdat de testgegevens beschikbaar zijn. Bestaande resultaatbestanden worden niet herschreven.

De Bash-runners selecteren hun eigen onderdeel: autoverzekering of Schade melden. Voor een nieuwe pagina of flow moeten de tests, eventuele testdata en een passende runner nog worden toegevoegd. De rapportpagina kan de bijbehorende resultaten daarna al verwerken volgens dezelfde rapportstructuur.

De Schade melden-suite gebruikt `Regressiecase` voor pagina- en scenario-ID’s. Deze IDs en bronmeldingen zijn doorzoekbaar; ze verschijnen niet als gebruiker in het gebruikersfilter.
