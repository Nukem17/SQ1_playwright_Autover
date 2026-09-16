# Playwright met Firefox lokaal gebruiken — Oumaima

Met deze stappen kun je de Playwright-tests op je eigen computer in Firefox uitvoeren. Docker is hiervoor niet nodig. Voer alle opdrachten uit in de projectmap, waar `package.json` staat.

## 1. Controleer Node.js en npm

Installeer een actuele Node.js-versie uit de ondersteunde 22.x-, 24.x- of 26.x-reeks als dat nog niet aanwezig is. npm wordt daarbij meegeïnstalleerd. Controleer de installatie in een terminal:

```sh
node --version
npm --version
```

Op Windows kun je **Opdrachtprompt (cmd)** gebruiken; op macOS en Linux een terminal. Playwright ondersteunt Windows 11 of nieuwer, macOS 14 of nieuwer, en de genoemde versies van Debian en Ubuntu. Je hebt internettoegang nodig om de pakketten en Firefox te downloaden.

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

De map `test/` is momenteel leeg. Voor een echte websitetest is nog een `.spec.ts`-testbestand in die map nodig, plus toegang tot de website die je wilt testen. De testopdracht meldt tot die tijd dat er geen tests zijn gevonden. Hiervoor hoef je geen extra npm-pakketten te installeren.

Meer informatie: [ondersteunde systemen](https://playwright.dev/docs/intro#system-requirements), [Playwright-browsers installeren](https://playwright.dev/docs/browsers) en [Playwright-projecten uitvoeren](https://playwright.dev/docs/test-projects).
