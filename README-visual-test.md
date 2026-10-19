# Visuele referentietest

Vergelijkt het eerste scherm van de autoverzekeringspagina met een beoordeelde screenshot. Alleen Chromium headless, één worker en geen retries. Deze proef doet geen premieberekening; de gewone funnelrunner voert hem niet uit.

## Uitvoeren

De runner start Elasticsearch automatisch voor de resultaatopslag; zie [de inrichting](README-elasticsearch.md). De visuele test zelf heeft geen scenariodata nodig.

```bash
bash scripts/run-lancyr-visual.sh check      # bestaande referentie vergelijken
bash scripts/run-lancyr-visual.sh demo       # bewuste afwijking tonen
bash scripts/run-lancyr-visual.sh reference  # referentie maken/vernieuwen
```

De npm-varianten zijn `test:visual`, `test:visual:demo` en `test:visual:reference`.

**Alleen `reference` vernieuwt de norm.** Beoordeel logo, tekst, veld en knop voordat je de PNG accepteert. Bewaar de goedgekeurde referentie samen met de test in Git:

`test/autoverzerkeringsfunnel/lancyr-visual.spec.ts-snapshots/autoverzekering-start-chromium-linux.png`

Een normale check maakt geen ontbrekende referentie aan. De demo verschuift het kentekenveld lokaal 60 pixels naar rechts en hoort op een screenshotverschil te falen. De website en referentie veranderen niet.

## Beelden en rapporten

Open **Referentie, actueel en verschil** via [de rapportpagina](README-reportpage.md), of `VISUEEL-OVERZICHT.html` in de runmap.

| Beeld | Betekenis |
| --- | --- |
| Referentie | Beoordeelde norm. |
| Actueel | Screenshot tijdens deze run, ook bewaard bij succes. |
| Verschil | Door Playwright gemarkeerde afwijkingen; bij succes geen verschilbeeld. |

Playwright levert de vergelijking en verschilbeelden. Het project voegt het HTML-overzicht en de CSS-demo toe. De geselecteerde beelden blijven per run in `overzicht-beelden/` staan, ook na een latere referentie-update. JSON, samenvatting, HTML en fouttraces volgen de gewone runstructuur.

## Vergelijkingsvoorwaarden

Viewport **1440 × 700**, Nederlandse locale, licht thema en leeg kenteken. De test sluit cookies, wacht op lettertypen en zichtbare afbeeldingen, scrollt naar boven en schakelt animaties en de tekstcursor uit bij de opname.

Alleen het eerste scherm wordt vergeleken. `maxDiffPixels: 0` staat geen afwijkende pixels boven Playwrights standaard kleurdrempel toe. Een verschil toont waar het beeld afwijkt, niet automatisch waarom. Gebruik dezelfde browseromgeving en beoordeel wijzigingen voordat je de referentie of tolerantie aanpast.

Bron: [Playwright screenshotvergelijking](https://playwright.dev/docs/test-snapshots).
