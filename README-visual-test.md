# Visuele vergelijking van de Lancyr-autopagina

Deze aparte proef controleert het uiterlijk van het eerste scherm van de autoverzekeringsfunnel, met een leeg kentekenveld. Hij draait alleen in Chromium headless in de bestaande `sq1-playwright`-image. De gewone funnelrunner voert deze test niet uit. De test doet geen premieberekening of aanvraag.

## Demonstreren

Voer vanuit de projectmap uit; Docker en Bash zijn nodig, lokale Node/npm niet.

1. Maak een voorgestelde referentie:

   ```bash
   bash scripts/run-lancyr-visual.sh reference
   ```

   Bekijk `test/autoverzerkeringsfunnel/lancyr-visual.spec.ts-snapshots/autoverzekering-start-chromium-linux.png`. Controleer zelf logo, tekst, kentekenveld en knop. Een succesvolle opname bewijst nog niet dat het ontwerp juist is. Dit commando vernieuwt ook een bestaande referentie; gebruik het alleen voor een bewust beoordeelde wijziging. Bewaar de goedgekeurde PNG samen met de test in Git.

2. Vergelijk de actuele pagina met de referentie:

   ```bash
   bash scripts/run-lancyr-visual.sh
   ```

   De vergelijking hoort te slagen wanneer de pagina gelijk is. Een ontbrekende referentie geeft een fout; deze run maakt of vervangt geen referentie.

3. Toon een zichtbare afwijking:

   ```bash
   bash scripts/run-lancyr-visual.sh demo
   ```

   Deze modus verschuift het kentekenveld 60 pixels naar rechts, uitsluitend in de tijdelijke testbrowser. Dezelfde screenshotvergelijking hoort nu te falen. De foutcode blijft behouden. Er verandert niets aan de website of referentie. Controleer in het rapport dat de fout daadwerkelijk een screenshotverschil is, geen laad- of netwerkfout.

4. Voer de gewone vergelijking opnieuw uit om te laten zien dat de wijziging tijdelijk was.

De overeenkomstige npm-commando's zijn `npm run test:visual:reference`, `npm run test:visual` en `npm run test:visual:demo`.

## Resultaten

Open eerst `VISUEEL-OVERZICHT.html` in de runmap. Dit overzicht werkt rechtstreeks in je browser en toont **Zo hoort het**, **Zo ziet het er nu uit** en **Dit wijkt af** naast elkaar. Klik op een afbeelding voor de volledige grootte. Bij succes staat bij het derde paneel dat er geen verschil is gevonden. De drie geselecteerde beelden worden in `overzicht-beelden/` bewaard, zodat het overzicht ook na een latere referentie-update bij deze run blijft horen. De overige screenshots zijn alleen nodig voor technisch onderzoek.

Iedere uitvoering krijgt een eigen `test-runs/<datum-tijd>_visual-<modus>_<code>/` met:

- `SAMENVATTING.md`: uitslag en modus.
- `results.json` en `html/index.html`: machineleesbaar en HTML-rapport.
- `test-results/`: `actueel.png` per test, ook bij succes; bij visuele afwijkingen daarnaast de verwachte screenshot, actuele screenshot en verschilafbeelding van Playwright. Bij fouten blijft ook een trace beschikbaar.

De actuele screenshot is als bijlage aan het HTML-rapport gekoppeld. Bij een afwijking kun je daar de vergelijking bekijken. Referenties staan bewust buiten de runmappen: ze zijn testinvoer en horen bij versiebeheer.

## Vaste omstandigheden

De test gebruikt een viewport van 1440 × 700, een lichte kleurmodus, Nederlandse locale en een lege invoer. Hij sluit de cookiemelding, wacht op lettertypen en zichtbare afbeeldingen, zet de scrollpositie bovenaan en schakelt animaties tijdens de opname uit. Alleen het eerste browserbeeld wordt vergeleken, niet de volledige pagina onder de vouw. De klantreviews onder het formulier vallen zo buiten deze proef.

Er zijn nul afwijkende pixels toegestaan volgens Playwrights pixelvergelijking (de standaard kleurdrempel blijft van toepassing). Verhoog de tolerantie niet zomaar om een onverwachte fout te verbergen. De live site kan veranderen; beoordeel dan de verschillen voordat je de referentie vernieuwt. Gebruik voor opname en vergelijking dezelfde Docker-omgeving, browser en modus.

Bronnen: [Playwright visual comparisons](https://playwright.dev/docs/test-snapshots) en [toHaveScreenshot](https://playwright.dev/docs/api/class-pageassertions#page-assertions-to-have-screenshot-1).
