# Playwright met Firefox lokaal gebruiken — Oumaima

Met deze stappen kun je de Playwright-tests op je eigen computer in Firefox uitvoeren. Docker is hiervoor niet nodig. Voer alle opdrachten uit in de projectmap, waar `package.json` staat.

## 1. Controleer Node.js en npm

Installeer Node.js 22 of nieuwer als dat nog niet aanwezig is. npm wordt daarbij meegeïnstalleerd. Controleer de installatie in een terminal:

```sh
node --version
npm --version
```

Op Windows kun je **Opdrachtprompt (cmd)** gebruiken; op macOS en Linux een terminal. Je hebt internettoegang nodig om de pakketten en Firefox te downloaden.

## 2. Installeer Playwright en Firefox

Voer vanuit de projectmap deze ene opdrachtregel uit:

```sh
npm ci && npx playwright install --with-deps firefox
```

`npm ci` installeert de exacte pakketversies uit `package-lock.json`. De tweede opdracht installeert de Firefox-versie die bij deze Playwright-versie hoort en, waar ondersteund, de benodigde systeempakketten. Een aparte installatie van Firefox is niet nodig.

Op Linux kan om beheerdersrechten worden gevraagd. De automatische installatie van systeempakketten is bedoeld voor door Playwright ondersteunde Linux-distributies, zoals Ubuntu en Debian; op Fedora werkt deze stap niet automatisch.

## 3. Controleer of Firefox start

Dit werkt ook zolang er nog geen testbestanden zijn:

```sh
node -e "require('@playwright/test').firefox.launch().then(browser => browser.close()).then(() => console.log('Firefox werkt')).catch(error => { console.error(error); process.exit(1); })"
```

Als je `Firefox werkt` ziet, kan Playwright Firefox starten.

## 4. Voer de tests uit

```sh
npx playwright test --project=firefox
```

Gebruik `--headed` als je het browservenster wilt zien:

```sh
npx playwright test --project=firefox --headed
```

Open na een testrun het HTML-rapport met `npx playwright show-report`.

De map `test/` is momenteel leeg. De testopdracht meldt daarom dat er geen tests zijn gevonden totdat er testbestanden zijn toegevoegd.

Meer informatie: [Playwright-browsers installeren](https://playwright.dev/docs/browsers) en [Playwright-projecten uitvoeren](https://playwright.dev/docs/test-projects).
