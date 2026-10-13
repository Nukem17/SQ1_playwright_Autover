# Testdata en scenario’s

SQLite bewaart de invoer en verwachtingen buiten de browsercode. De gegevenslaag haalt ze op en valideert ze. De testcode bepaalt hoe pagina’s worden bediend en gecontroleerd.

## Opslag

| Bestand/tabel | Functie |
| --- | --- |
| `testdata/local.sqlite` | Lokale database, buiten Git en de Docker-image. |
| `testdata/seed.sql` | Startgegevens voor een nieuwe database. |
| `testdata/migrations/` | Eenmalige uitbreidingen; versie via SQLite `user_version`. |
| `autoverzekering_scenarios` | Voertuig, adres, persoonlijke keuzes, bestuurder, dekking en uitkomst. |
| `regressie_paginas` | Paden, verwachte titels/status en bronmeldingen. |
| `regressie_scenarios` | Routes, actietypen en FAQ-/navigatieverwachtingen. |

De runners initialiseren en migreren de database vóór de tests. Bestaande handmatige wijzigingen blijven bij volgende runs behouden. Wijzigingen aan `seed.sql` veranderen een bestaande database niet. Nieuwe gedeelde aanvullingen horen in een **nieuwe migratie**.

De testcontainer krijgt de data alleen-lezen. `scenarios.ts` en `regressie.ts` gebruiken geparameteriseerde SQL en weigeren ontbrekende of ongeldige gegevens. Elke gegevensafhankelijke test bewaart de gebruikte waarden als JSON-bijlage.

## Autoverzekering

Per run kies je één scenario:

```bash
bash scripts/run-lancyr-browsers.sh headless testgebruiker-bram chromium
```

Het tweede argument heeft voorrang op `LANCYR_TEST_SCENARIO`; standaard is `standaard`. De oude losse kentekenoverride wordt geweigerd, omdat kenteken en voertuigverwachting bij elkaar moeten passen.

| Scenario | Bestuurder | Dekking | Extra’s / verwachte uitkomst |
| --- | --- | --- | --- |
| standaard | Ikzelf | WA+ | Geen extra’s; winkelwagen. |
| testgebruiker-anna | Ikzelf | WA | Nul schadevrije jaren; winkelwagen verwacht. |
| testgebruiker-bram | Partner | WA+ | Partnergeboortedatum; inzittendendekking. |
| testgebruiker-celine | Ikzelf | Allrisk | Rechtsbijstand. |
| testgebruiker-daan | Kind-inwonend | Niet bereikt | Bestuurderblokkade verwacht. |
| testgebruiker-emma | Partner | Allrisk | Partnergeboortedatum; beide extra dekkingen. |

Dit zijn uitgangswaarden uit seed/migraties, geen bewijs van de huidige lokale database. De scenario’s variëren ook in gezin en kilometrage. Alle gebruiken hetzelfde kenteken; dit is gerichte variatie, geen volledige combinatiedekking.

Het productnummer voorkomt afhankelijkheid van de aanbodvolgorde. De ingangsdatum kiest het eerstvolgende jaar bij de opgeslagen maand/dag; 29 februari wordt niet ondersteund.

Bij Anna is historisch een premie-API-fout met nul schadevrije jaren gevonden. De normale test blijft de correcte route verwachten en faalt zolang het probleem optreedt. Dit is geen opzettelijke demo. Daan kan juist slagen wanneer de verwachte blokkade optreedt.

## Gegevens wijzigen en controleren

Wijzig met een SQLite-editor, buiten een actieve run, bijvoorbeeld:

```sql
UPDATE autoverzekering_scenarios SET schadevrij = '7' WHERE id = 'standaard';
```

De volgende run gebruikt die waarde en bewaart haar bij het resultaat. Technische controles gebruiken tijdelijke databases:

```bash
docker build -t sq1-playwright .
docker run --rm sq1-playwright node --test testdata/scenarios.test.cjs testdata/regressie.test.cjs
```

## Voorbereiding op Novulo

`haalTestscenarioOp()` vormt de grens tussen opslag en browsercode. De geplande Elasticsearch-koppeling moet dezelfde gevalideerde scenariostructuur leveren. Bij regressietests wordt de set nu synchroon verzameld; ophalen via een netwerk vraagt aanvullende voorbereiding, bijvoorbeeld een dataset vóór de run.

De koppeling, authenticatie en unieke procesrecords voor parallelle tests zijn nog niet gebouwd. Zie [de projectuitleg](docs/SIDEQUEST-TESTSUITE.md). Voor schadegegevens en uitbreiden: [Schade melden](README-schade-regressie.md).
