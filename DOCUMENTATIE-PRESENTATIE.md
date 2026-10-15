# Presentatie: uitbreidingen van de testsuite

De sidequest bouwt een herbruikbare basis voor Novulo-tests. Lancyr levert de praktijkvoorbeelden; de definitieve aanvraag valt buiten de test. Uitgebreide projectuitleg staat in [SIDEQUEST-TESTSUITE.md](docs/SIDEQUEST-TESTSUITE.md).

## Slides en demonstraties

| Slide | Kern | Beeld of demo |
| --- | --- | --- |
| Versiebeheer en Docker | Vaste tooling; tijdelijke containers; resultaten blijven lokaal. | Versietabel en image → container → rapport-schema. |
| npm en starten | npm installeert tools en biedt startcommando’s; het menu start Bash rechtstreeks. | Menu openen en een test starten. |
| Headed/live meekijken | noVNC toont het virtuele scherm; één worker voor observatie. | Kort stuk van de klantreis in de viewer. |
| Visuele referentie | Playwright vergelijkt pixels; eigen overzicht toont norm, actueel en verschil. | Drie beelden uit de CSS-demo. |
| Testdata | Gegevens bepalen invoer/verwachting; code bepaalt handelingen. | Twee scenario’s en gegevensstroom. |
| Regressietests/workers | CSV-bron, zes groepen, 74 controles in drie browsers; maximaal twee tests tegelijk. | Testgroepen en een schematische worker-tijdlijn. |
| Rapportage | Uitslag onderzoeken via filters, foutuitleg, screenshots en trace. | Run → groep → controle → browser → foutdetails. |

## Demo starten

```bash
bash scripts/testmenu.sh
```

Voor noVNC: autoverzekering → browser → uitvoermodus **3** → scenario. Wacht op de viewer, open [poort 6080](http://localhost:6080/vnc.html?autoconnect=true&resize=scale) en druk Enter in de terminal.

```bash
bash scripts/run-lancyr-browsers.sh funnel-demo standaard
bash scripts/run-lancyr-visual.sh demo
bash scripts/view-reports.sh
```

De foutdemo’s zijn opzettelijk. Controleer dat de bedoelde stap of screenshotvergelijking faalt. Bewaarde runs zijn bruikbaar voor een presentatie; vermeld hun datum en echte uitslag.

## Uitleg bij Novulo

De kern die meegaat: Docker/tooling, uitvoerscripts, gescheiden gegevenslaag, benoemde stappen, foutbijlagen en HTML-overzicht. Novulo vraagt eigen processen, login/rollen en beheer van testrecords. Elasticsearch en centrale uitvoering zijn gepland, niet gebouwd.

Bij een Novulo-scenario beschrijf je beginsituatie, rol, invoer en verwachte status. De echte order of het dossier staat in Novulo; de testsuite bewaart scenario’s en verwijzingen. Zie [testdata](README-testdata.md).

## Grenzen correct benoemen

- Headed in Docker geeft geen desktopvenster; noVNC maakt live meekijken mogelijk. Traces zijn het belangrijkste hulpmiddel voor onderzoek achteraf.
- Het eerste scherm wordt visueel vergeleken, niet de hele website.
- 74 controles leveren 222 browserresultaten op; twee workers gelden samen over de browsers.
- Een groene run bewijst alleen de gekozen verwachtingen op dat moment. Exacte premies, mobiele dekking en definitieve aanvragen zijn niet volledig getest.
- GitHub Actions controleert linting en types. Een aparte workflow plant de funnel dagelijks om 11:30 Nederlandse tijd; activering vraagt opname op de standaardbranch. Elasticsearch en een centraal teamportaal zijn nog niet ingericht.

Versies, commando’s en installatie: [README](README.md). Testdekking: [autoverzekering](README-lancyr-test.md) en [Schade melden](README-schade-regressie.md).
