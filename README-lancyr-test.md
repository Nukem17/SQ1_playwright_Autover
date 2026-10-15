# Autoverzekeringstests

[Testcode](test/autoverzerkeringsfunnel/lancyr-autoverzekering.spec.ts) voor de live Lancyr-funnel. De runner selecteert dit bestand; de visuele test draait apart.

```bash
bash scripts/run-lancyr-browsers.sh headless standaard all
# Met lokale Node/npm:
npm run test:lancyr
```

Argumenten: **modus → scenario → browser**. Modi: `headless`, `headed`, `visible`, `funnel`, `funnel-demo`. Browsers: `all`, `chromium`, `firefox`, `webkit`. Per run wordt één scenario gebruikt; zie [testdata](README-testdata.md).

De modus `funnel` selecteert alleen de echte klantreis in de gekozen browsers, zonder retries of bewuste fout. Deze selectie wordt ook eenmaal per nacht om 02:00 UTC (03:00 wintertijd / 04:00 zomertijd) door [GitHub Actions](.github/workflows/autoverzekering.yml) gebruikt, zodra de workflow op de standaardbranch staat.

## Controles

1. De ingang toont de kop, het verplichte kentekenveld en **Bereken Premie**.
2. Een leeg kenteken houdt de bezoeker op de autopagina.
3. De klantreis gebruikt het scenario en controleert de uitkomst.

De klantreis bestaat uit:

- Homepage → Privé verzekeren → Auto.
- Kenteken invoeren en verwachte voertuiggegevens controleren.
- Adres, geboortedatum, gezin, ondernemerschap en privacykeuze invullen.
- Bestuurder en rijgegevens invoeren; bij Partner ook de partnergeboortedatum.
- Dekking, positieve premie en afgesproken product controleren.
- Extra dekkingen kiezen en voertuig/dekking in de winkelwagen controleren.

Bij **Kind-inwonend** controleert de test de verwachte blokkade en stopt vóór de premieberekening. Er wordt nooit op **Sluit af** geklikt. Eerdere stappen doen wel serververzoeken.

Drie tests in drie browsers leveren normaal **negen browserresultaten** op. De exacte premie, alle invoercombinaties, mobiele apparaten en definitieve aanvraag vallen buiten deze suite. De ingangsdatum gebruikt de eerstvolgende jaarlijkse maand/dag uit het scenario.

## Foutonderzoek en demonstratie

`test.step` geeft stappen leesbare namen. Locators vinden velden en knoppen; `expect` controleert de uitkomst. Bij fouten bewaart de configuratie screenshots en traces. De gebruikte funneldata staat als rapportbijlage opgeslagen.

```bash
bash scripts/run-lancyr-browsers.sh funnel-demo standaard
```

De demo draait alleen de klantreis in Chromium, met één worker en zonder retries. Stap 7 verwacht bewust een verkeerde winkelwagenkop. Controleer dat juist deze stap faalt; een eerdere websitefout is geen geslaagde einddemo. Het scenario moet de winkelwagen kunnen bereiken.

Bekijk uitslag, stappen en trace via [de rapportpagina](README-reportpage.md). Visuele opmaak wordt apart getest in [de referentietest](README-visual-test.md).
