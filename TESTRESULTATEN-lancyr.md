# Testresultaten Lancyr autoverzekering

## Resultaten per run

Resultaten worden uitsluitend bewaard in `test-runs/<runmap>/`. Elke run bevat `SAMENVATTING.md`, een HTML-rapport, JSON-resultaten en eventuele screenshots en traces. Dit document wordt niet automatisch aangevuld.

## Reikwijdte

- Website: https://www.lancyr.nl/prive/autoverzekering/
- Browsers: Playwright Chromium, Firefox en WebKit.
- De geautomatiseerde route loopt van de homepage tot de winkelwagen met gekozen WA+ en a.s.r.-aanbod.
- Een scherm voor gegevens van de verzekeringnemer verscheen in deze route niet vóór **Sluit af**.
- Grens: nooit op **Sluit af** klikken. De test eindigt vóór het versturen van een aanvraag.

## Beoogde funneltest

1. Open de homepage en controleer of de navigatie zichtbaar is.
2. Open via **Privé verzekeren → Auto** de autoverzekeringspagina; controleer de paginatitel en het kentekenveld.
3. Vul het afgesproken testkenteken in; controleer dat het veld de waarde toont en **Bereken Premie** zichtbaar is.
4. Klik op **Bereken Premie** en controleer of de volgende stap zichtbaar wordt.
5. Vul postcode, huisnummer, geboortedatum, ondernemerschap en gezinssamenstelling in. Controleer of het getoonde adres overeenkomt met de opgegeven straat en plaats. Geef akkoord op de privacyverklaring.
6. Vul hoofdbestuurder, schadevrije jaren, jaarafstand en ingangsdatum in. Gebruik de eerstvolgende 20 september in de toekomst (op 16 september 2026: 20 september 2026). Controleer per stap of de gekozen waarde zichtbaar blijft.
7. Klik op **Start berekening**. Controleer dat de dekkingkeuze verschijnt.
8. Kies **WA+** en controleer dat de gekozen dekking zichtbaar is.
9. Controleer dat er een verzekeringsaanbod met premie verschijnt en kies de zichtbare aanbieding. Tijdens de onderzochte run was dit a.s.r.
10. Laat extra risico's uitgeschakeld. Controleer de samenvatting en stop vóór **Sluit af**. Mocht een later gewijzigde route vóór die knop gegevens van de verzekeringnemer vragen, breid de test dan eerst uit met goedgekeurde testgegevens.

Na elke belangrijke overgang komt een zichtbaarheidscontrole. Een exacte premie is geen stabiele verwachting, omdat tarieven en aanbiedingen kunnen veranderen.

## Uitvoeren

Chromium, Firefox en WebKit draaien via Docker. Start en bewaar alles met één opdracht:

```sh
bash scripts/run-lancyr-browsers.sh
```

Het script toont de uitslag in de terminal en bewaart elke run in een eigen map onder `test-runs/`. Die mappen worden niet naar Git gepusht, omdat rapporten en traces gegevens van de live funnel kunnen bevatten.

## Vervolgscenario's

| Scenario | Testgegevens nodig | Verwacht resultaat |
| --- | --- | --- |
| Leeg kenteken | Nee | Duidelijke validatiemelding; funnel gaat niet verder |
| Ongeldig kenteken | Nee | Duidelijke validatiemelding; funnel gaat niet verder |
| Geldig testkenteken | Toegestaan kenteken | Voertuiggegevens en volgende stap verschijnen |
| Dekking kiezen | Toegestane testgegevens | Premie en voorwaarden zijn zichtbaar en consistent |
| Aanvraag afronden | Expliciete toestemming en veilige testomgeving | Pas testen na afstemming |
