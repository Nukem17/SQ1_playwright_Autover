# Testresultaten Lancyr autoverzekering

## Nieuwste runs

Voer `npm run test:lancyr` uit. Elke run krijgt een eigen map met een kort `SAMENVATTING.md`, een HTML-rapport en eventuele screenshots en traces. De nieuwste run komt bovenaan deze tabel. De volledige runmappen blijven lokaal in `test-runs/`; dit overzicht kan met Git worden bewaard.

| Tijd (Amsterdam) | Uitslag | Lokale samenvatting | Opmerking |
| --- | --- | --- | --- |
| 29-09-2026, 12:16:31 – 29-09-2026, 12:17:22 | 3 geslaagd, 0 gefaald, 0 instabiel, 0 overgeslagen | `test-runs/2026-09-29_12-16-31_visible_1AzRgE/SAMENVATTING.md` | Alle uitgevoerde controles geslaagd. |
| 28-09-2026, 16:05:16 – 28-09-2026, 16:06:02 | 6 geslaagd, 0 gefaald, 0 instabiel, 0 overgeslagen | `test-runs/2026-09-28_16-05-16_headed_vEmI51/SAMENVATTING.md` | Alle uitgevoerde controles geslaagd. |
| 25-09-2026, 16:35:53 – 25-09-2026, 16:36:38 | 6 geslaagd, 0 gefaald, 0 instabiel, 0 overgeslagen | `test-runs/2026-09-25_16-35-53_ljKCkl/SAMENVATTING.md` | Alle uitgevoerde controles geslaagd. |
| 25-09-2026, 10:43:03 – 25-09-2026, 10:47:02 | 4 geslaagd, 2 gefaald, 0 instabiel, 0 overgeslagen | `test-runs/2026-09-25_10-43-03_NVK1fk/SAMENVATTING.md` | Bekijk de fout in het rapport en de trace. |
| 25-09-2026, 09:11:48 – 25-09-2026, 09:12:45 | 6 geslaagd, 0 gefaald, 0 instabiel, 0 overgeslagen | `test-runs/2026-09-25_09-11-48_45saQ5/SAMENVATTING.md` | Alle uitgevoerde controles geslaagd. |
| 17-09-2026, 13:20:32 – 17-09-2026, 13:21:16 | 6 geslaagd, 0 gefaald, 0 instabiel, 0 overgeslagen | `test-runs/2026-09-17_13-20-32_oVK5tL/SAMENVATTING.md` | Alle uitgevoerde controles geslaagd. |
| 17-09-2026, 13:07:05 – 17-09-2026, 13:07:55 | 6 geslaagd, 0 gefaald, 0 instabiel, 0 overgeslagen | `test-runs/2026-09-17_13-07-05_7wHD2A/SAMENVATTING.md` | Alle uitgevoerde controles geslaagd. |
| 17-09-2026, 12:52:07 – 17-09-2026, 12:52:52 | 6 geslaagd, 0 gefaald, 0 instabiel, 0 overgeslagen | `test-runs/2026-09-17_12-52-07_68jB9P/SAMENVATTING.md` | Alle uitgevoerde controles geslaagd. |
| 17-09-2026, 09:45:22 – 17-09-2026, 09:46:12 | 6 geslaagd, 0 gefaald, 0 instabiel, 0 overgeslagen | `test-runs/2026-09-17_09-45-22_lYv4mf/SAMENVATTING.md` | Alle uitgevoerde controles geslaagd. |
| 17-09-2026, 09:26:36 – 17-09-2026, 09:27:29 | 6 geslaagd, 0 gefaald, 0 instabiel, 0 overgeslagen | `test-runs/2026-09-17_09-26-36_MPVdqb/SAMENVATTING.md` | Alle uitgevoerde controles geslaagd. |
| 17-09-2026, 09:08:12 – 17-09-2026, 09:08:53 | 2 geslaagd, 1 gefaald, 0 instabiel, 0 overgeslagen | `test-runs/2026-09-17_09-08-12_w5r314/SAMENVATTING.md` | Bekijk de fout in het rapport en de trace. |
| 16-09-2026, 15:39:57 – 16-09-2026, 15:40:27 | 3 geslaagd, 0 gefaald, 0 instabiel, 0 overgeslagen | `test-runs/2026-09-16_15-39-57_fdSdVu/SAMENVATTING.md` | Alle uitgevoerde controles geslaagd. |
| 16-09-2026, 15:21:41 – 16-09-2026, 15:22:12 | 3 geslaagd, 0 gefaald, 0 instabiel, 0 overgeslagen | `test-runs/2026-09-16_15-21-41_Qk69t3/SAMENVATTING.md` | Alle uitgevoerde controles geslaagd. |
| 16-09-2026, 15:07:25 – 16-09-2026, 15:07:57 | 3 geslaagd, 0 gefaald, 0 instabiel, 0 overgeslagen | `test-runs/2026-09-16_15-07-25_47VO1u/SAMENVATTING.md` | Alle uitgevoerde controles geslaagd. |

## Reikwijdte

- Website: https://www.lancyr.nl/prive/autoverzekering/
- Browsers voor nieuwe runs: Playwright Chromium en Firefox. Eerdere handmatige runs hieronder waren alleen in Chromium.
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

In deze WSL-omgeving draaien Chromium en Firefox via Docker. Start en bewaar alles met één opdracht:

```sh
npm run test:lancyr
```

Het script toont de uitslag in de terminal en bewaart elke run in een eigen map onder `test-runs/`. Die mappen worden niet naar Git gepusht, omdat rapporten en traces gegevens van de live funnel kunnen bevatten. De tabel hierboven wordt automatisch bijgewerkt. Commit `TESTRESULTATEN-lancyr.md` als dit overzicht ook voor collega's in Git bewaard moet worden.

## Eerdere handmatige runs

| Datum/tijd | Omgeving | Commit | Resultaat | Bevindingen |
| --- | --- | --- | --- | --- |
| 2026-09-16 13:36 CEST | Docker, Playwright 1.63.0, Chromium | Werkboom vanaf `24b327e` | 1/1 geslaagd | De autoverzekeringspagina, het verplichte kentekenveld en “Bereken Premie” waren zichtbaar. |
| 2026-09-16 13:38 CEST | Docker, Playwright 1.63.0, Chromium | Werkboom vanaf `24b327e` | 1/2 geslaagd | De extra kliktest liep vast doordat de cookiebanner de knop afdekte. De test is aangepast om de noodzakelijke cookies te kiezen, maar de aangepaste versie is nog niet opnieuw uitgevoerd. |
| 2026-09-16 | Docker, Playwright 1.63.0, Chromium | Werkboom op `test-zion` | 1/1 geslaagd | Met ingangsdatum 20 september 2026 kwam de funnel op **Kies je dekking**; **WA +** was zichtbaar. De eerdere controle zocht ten onrechte naar `WA+` zonder spatie. Het datumverschil is daarom niet als oorzaak vastgesteld. |
| 2026-09-16 | Docker, Playwright 1.63.0, Chromium | Werkboom op `test-zion` | Verkennende route 1/1 geslaagd | Via WA+ verscheen één zichtbaar a.s.r.-aanbod. Na keuze stond de winkelwagen met twee uitgevinkte extra dekkingen en een samenvatting. Gestopt vóór **Sluit af**. Een afzonderlijk scherm voor verzekeringnemergegevens kwam niet in beeld. |
| 2026-09-16 | Docker, Playwright 1.63.0, Chromium | Werkboom op `test-zion` | 3/3 geslaagd | De vaste tests controleren de ingang, leeg kenteken en de volledige route tot de winkelwagen. Op de winkelwagen bleken twee optionele vakjes uitgevinkt; een ander vakje is standaard aangevinkt en uitgeschakeld. De test raakt **Sluit af** niet aan. |
| 2026-09-16 | Docker, Playwright 1.63.0, Chromium | Werkboom op `test-zion` | 3/3 geslaagd | De vereenvoudigde test met genummerde stappen is opnieuw uitgevoerd; de volledige route eindigde vóór **Sluit af**. |

De tweede run toont een fout in de testopzet; hiermee is nog geen defect in de Lancyr-funnel vastgesteld.

## Vervolgscenario's

| Scenario | Testgegevens nodig | Verwacht resultaat |
| --- | --- | --- |
| Leeg kenteken | Nee | Duidelijke validatiemelding; funnel gaat niet verder |
| Ongeldig kenteken | Nee | Duidelijke validatiemelding; funnel gaat niet verder |
| Geldig testkenteken | Toegestaan kenteken | Voertuiggegevens en volgende stap verschijnen |
| Dekking kiezen | Toegestane testgegevens | Premie en voorwaarden zijn zichtbaar en consistent |
| Aanvraag afronden | Expliciete toestemming en veilige testomgeving | Pas testen na afstemming |
