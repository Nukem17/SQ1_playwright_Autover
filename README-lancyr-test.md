# De Lancyr-test

De code staat in [test/lancyr-autoverzekering.spec.ts](test/lancyr-autoverzekering.spec.ts). Je start de tests in Chromium, Firefox en WebKit vanuit de projectmap met:

```sh
npm run test:lancyr
```

Het script bouwt de Docker-image, start een tijdelijke container en toont per browser de uitslag in de terminal. Je hoeft `docker run` niet zelf te typen. Standaard gebruikt de test kenteken `88-LSV-7`. Voor een ander goedgekeurd kenteken: `LANCYR_TEST_KENTEKEN=ANDER-KENTEKEN npm run test:lancyr`. Pas dan ook de verwachting `Toyota Prius` in de test aan.

## Wat is geslaagd?

De drie tests controleren het volgende:

1. Op de autopagina zijn de titel, het verplichte kentekenveld en **Bereken Premie** zichtbaar.
2. Een klik op **Bereken Premie** met een leeg kenteken laat je op de autopagina.
3. De funnel loopt via het menu, kenteken, adres, persoonlijke situatie en rijgegevens naar **WA +**, een zichtbaar aanbod en de winkelwagen. De ingevulde waarden en tussenpagina's worden gecontroleerd. Op de aanbodpagina blijven **WA +** en een positieve jaarpremie zichtbaar. In de winkelwagen staan de twee optionele extra dekkingen uit.

Als een controle (`expect`) niet klopt of een stap niet binnen de wachttijd lukt, faalt de test. De test klikt **niet** op **Sluit af**, want dat kan een echte aanvraag starten. Vóór die knop verscheen in de onderzochte route geen apart formulier voor e-mail of telefoon.

Dit is één functionele desktoproute per browser. Mobiele weergave, visuele opmaak, laadsnelheid, de exacte premie en de naam van de verzekeraar worden niet als harde verwachting gecontroleerd. De ingangsdatum wordt automatisch de eerstvolgende 20 september.

## Resultaten bekijken

Elke run blijft in een eigen map `test-runs/<datum-tijd>/` staan:

| Bestand | Wat staat erin? |
| --- | --- |
| `SAMENVATTING.md` | Korte uitslag per test. |
| `html/index.html` | Volledig Playwright-rapport met stappen. |
| `results.json` | Ruwe testdata. |
| `test-results/` | Screenshot en trace als een test faalt. |

Het pad van de nieuwste map verschijnt aan het eind in de terminal. Elke runmap bevat een eigen `SAMENVATTING.md` met de uitslag en tijd in Amsterdam. Runmappen worden lokaal bewaard en niet naar Git gepusht. Het oude bestand `TESTRESULTATEN-lancyr.md` wordt niet meer automatisch aangevuld.

Wil je een HTML-rapport in je browser bekijken? Gebruik `npx playwright show-report test-runs/NAAM-VAN-RUNMAP/html`. Vervang `NAAM-VAN-RUNMAP` door de mapnaam die het script toont en open daarna het adres uit de terminal.

## Screenshot bij een fout zien

```sh
npm run test:screenshot-demo
```

Deze [losse demo-test](test/screenshot-demo.spec.ts) opent de echte Lancyr-autopagina en zoekt bewust naar een kop die daar nog niet staat. Hij faalt expres. Het script toont daarna het pad naar het screenshot en rapport in een eigen map `test-runs/screenshot-demo_<datum-tijd>/`.

## Playwright in deze code

| Feature | Doel |
| --- | --- |
| `test` en `test.step` | Losse tests en leesbare stappen in het rapport. |
| `page.goto`, `.hover`, `.click` | Pagina openen en door de funnel navigeren. |
| `.fill`, `.check`, `.selectOption` | Tekst, datum, radioknoppen en keuzelijsten invullen. |
| `getByRole`, `getByText`, `locator` | Onderdelen van de pagina vinden. |
| `expect(...).toBeVisible()` | Controleren of iets zichtbaar is. |
| `toHaveValue`, `toBeChecked`, `toHaveURL`, `toHaveText`, `toHaveCount`, `toContainText` | Waarden, keuzes, pagina's en aantallen controleren. |
| `test.setTimeout`, `test.skip` | Meer tijd geven aan de lange funnel en die overslaan zonder kenteken. |
| `:visible` | Alleen de zichtbare aanbodknop kiezen; de site heeft ook verborgen opties in de HTML. |

In [playwright.config.ts](playwright.config.ts) staat `screenshot: 'only-on-failure'` en `trace: 'retain-on-failure'`. Daarom verschijnen deze bestanden alleen na een fout. De test is TypeScript; `npx tsc --noEmit` controleert de types zonder bestanden te maken.

## Een fouttrace van de volledige funnel demonstreren

```bash
bash scripts/run-lancyr-browsers.sh funnel-demo
# Of: npm run test:lancyr:funnel-demo
```

Deze aparte demonstratierun gebruikt de bestaande funneltest in Chromium headless, met één worker en zonder retries. Na de zes gewone stappen, bij de winkelwagen, controleert een zevende stap bewust een verkeerde koptekst. De foutmelding vermeldt expliciet dat het een demonstratie is. Er wordt nooit op **Sluit af** geklikt. Zonder deze demonstratiemodus is de extra controle uitgeschakeld.

De run hoort met foutcode 1 te eindigen. Open `test-runs/<datum-tijd>_funnel-demo_<code>/html/index.html` via Live Preview, selecteer de funneltest en open de trace. Je kunt de volledige uitvoering via acties en tijdlijn terugkijken. Controleer dat stap 7 de fout veroorzaakte: een eerdere storing op de live site is geen geslaagde demonstratie van de bedoelde eindcontrole. Screenshots, trace en samenvatting blijven in dezelfde runmap bewaard.
