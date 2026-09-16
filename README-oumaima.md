# Firefox-tests lokaal uitvoeren — Oumaima

Deze handleiding is voor het uitvoeren van de Playwright-tests op je eigen computer, zonder Docker.

## 1. Benodigdheden

- Git om de repository te klonen.
- Node.js 22 of nieuwer, inclusief npm. Controleer dit met `node --version` en `npm --version`.
- Een door Playwright ondersteund besturingssysteem. Op Windows kun je de opdrachten hieronder uitvoeren in **Opdrachtprompt (cmd)**; op macOS of Linux in een terminal. Voor Linux werkt de automatische installatie van systeempakketten op ondersteunde distributies zoals Ubuntu en Debian. Op Fedora werkt die stap niet automatisch.
- Internettoegang voor het downloaden van npm-pakketten en de Playwright-versie van Firefox.

## 2. Repository klonen

Voer deze opdrachten uit in de map waar je het project wilt bewaren:

```sh
git clone https://github.com/Nukem17/SQ1_playwright_Autover.git
cd SQ1_playwright_Autover
```

Wil je de gezamenlijke werkbranch gebruiken, schakel dan over naar `test-zion`:

```sh
git switch test-zion
```

## 3. Afhankelijkheden en Firefox installeren

Voer vanuit de projectmap deze ene opdrachtregel uit:

```sh
npm ci && npx playwright install --with-deps firefox
```

`npm ci` installeert de pakketversies uit `package-lock.json`. De tweede opdracht installeert de Firefox-versie die bij Playwright hoort en, waar ondersteund, de benodigde systeempakketten. Op Linux kan om beheerdersrechten worden gevraagd. Je hoeft Firefox niet apart via een browserwebsite te installeren.

## 4. Tests uitvoeren

```sh
npx playwright test --project=firefox
```

Wil je tijdens het testen het Firefox-venster zien, gebruik dan:

```sh
npx playwright test --project=firefox --headed
```

Na een testrun kun je het HTML-rapport openen met:

```sh
npx playwright show-report
```

De map `test/` bevat momenteel nog geen testbestanden. Zolang er geen tests aan de branch zijn toegevoegd, meldt Playwright dat er geen tests zijn gevonden. Haal nieuwe tests later op met `git pull` en voer de testopdracht opnieuw uit.

Meer informatie: [Playwright-browsers installeren](https://playwright.dev/docs/browsers) en [Playwright-projecten uitvoeren](https://playwright.dev/docs/test-projects).
