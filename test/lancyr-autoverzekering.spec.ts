import { expect, test, type Page } from '@playwright/test';

// Playwright geeft elke test een verse 'page': een nieuw browsertabblad.
// Met expect checken we wat de gebruiker echt ziet of heeft ingevuld.

const HOME = 'https://www.lancyr.nl/';
const AUTO = `${HOME}prive/autoverzekering/`;

// Vaste invoer voor deze premiecontrole. De test dient nooit een aanvraag in.
const gegevens = {
  postcode: '1102NN',
  huisnummer: '224',
  straat: 'Haardstee',
  plaats: 'Amsterdam',
  geboortedatum: '2004-04-14', // Een datumveld verwacht jaar-maand-dag.
  schadevrij: '6',
  kilometrage: '20000', // Sitewaarde voor 15.000–20.000 km per jaar.
};

// De cookiebanner is niet altijd aanwezig. Als hij er is, halen we hem weg.
async function sluitCookieMelding(page: Page) {
  const melding = page.locator('#cookie-overlay');
  // Geen banner binnen 5 seconden? Dan kan de test gewoon verder.
  await melding.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  if (await melding.isVisible()) {
    await page.getByRole('button', { name: 'Keuze opslaan' }).click();
  }
}

// Herbruikbare stap: veld zoeken, zichtbaar checken, invullen en waarde checken.
async function vulVeld(page: Page, naam: string, waarde: string) {
  const veld = page.locator(`input[name="${naam}"]`);
  await expect(veld).toBeVisible();
  await veld.fill(waarde);
  await expect(veld).toHaveValue(waarde);
}

// De test blijft bruikbaar na 20 september: dan schuift de datum een jaar op.
function ingangsdatum() {
  const vandaag = new Date();
  const jaar = vandaag.getFullYear();
  const gekozenJaar = vandaag < new Date(jaar, 8, 20) ? jaar : jaar + 1;
  return `${gekozenJaar}-09-20`;
}

test('de ingang van de premieberekening is zichtbaar', async ({ page }) => {
  await page.goto(AUTO);
  await expect(page.getByRole('heading', { name: /Autoverzekering\s+afsluiten/i })).toBeVisible();
  const kenteken = page.getByRole('textbox', { name: 'Kenteken Auto' });
  await expect(kenteken).toBeVisible();
  await expect(kenteken).toHaveAttribute('required', '');
  await expect(page.getByText('Bereken Premie', { exact: true })).toBeVisible();
});

test('een leeg kenteken houdt de gebruiker op de autopagina', async ({ page }) => {
  await page.goto(AUTO);
  await sluitCookieMelding(page);
  await page.getByText('Bereken Premie', { exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Kenteken Auto' })).toHaveValue('');
  await expect(page).toHaveURL(AUTO);
});

test('doorloop de funnel tot vlak vóór Sluit af', async ({ page }) => {
  // De live premieberekening kan langer duren dan een korte paginatest.
  test.setTimeout(120000);
  const kenteken = process.env.LANCYR_TEST_KENTEKEN;
  // Zonder testkenteken starten we geen halve klantreis.
  test.skip(!kenteken, 'Stel LANCYR_TEST_KENTEKEN in op het afgesproken testkenteken');

  await test.step('1. Navigeer via het menu naar Auto', async () => {
    await page.goto(HOME);
    await sluitCookieMelding(page);
    const priveVerzekeren = page.getByRole('link', { name: 'Prive verzekeren' }).first();
    await expect(priveVerzekeren).toBeVisible();
    await priveVerzekeren.hover(); // Hover maakt het submenu zichtbaar.
    await page.getByRole('link', { name: 'Auto', exact: true }).click();
    await expect(page.getByRole('heading', { name: /Autoverzekering\s+afsluiten/i })).toBeVisible();
  });

  await test.step('2. Vul het kenteken in', async () => {
    const veld = page.getByRole('textbox', { name: 'Kenteken Auto' });
    await expect(veld).toBeVisible();
    await veld.fill(kenteken!);
    await expect(veld).toHaveValue(kenteken!);
    // Wacht op de voertuiggegevens voordat Bereken Premie wordt aangeklikt.
    await expect(page.locator('.voertuig_details')).toContainText('Toyota Prius');
    const berekenPremie = page.getByText('Bereken Premie', { exact: true });
    await expect(berekenPremie).toBeVisible();
    await berekenPremie.click();
    await expect(page).toHaveURL(/\/prive\/maak-een-account\/?$/);
  });

  await test.step('3. Vul adres en persoonlijke situatie in', async () => {
    await vulVeld(page, 'postcode', gegevens.postcode);
    await vulVeld(page, 'huisnummer', gegevens.huisnummer);
    await vulVeld(page, 'straat', gegevens.straat);
    await vulVeld(page, 'plaats', gegevens.plaats);
    await vulVeld(page, 'geboortedatum', gegevens.geboortedatum);

    const ondernemer = page.locator('input[name="ondernemend_gezin"][value="Ja"]');
    await expect(ondernemer).toBeVisible();
    await ondernemer.check();
    await expect(ondernemer).toBeChecked();

    // De site heeft een eigen keuzeknop; direct op de radio klikken schakelt hem weer uit.
    const gezin = page.locator('.lancyr_toggle_t1.alleenstaande_zonder_kinderen');
    await expect(gezin).toBeVisible();
    await gezin.click();
    await expect(page.locator('input[name="gezinssamenstelling"][value="alleenstaande_zonder_kinderen"]')).toBeChecked();

    const privacy = page.locator('input[name="radio-4-10"][value="Ja"]');
    await expect(privacy).toBeVisible();
    await privacy.check();
    await expect(privacy).toBeChecked();
    const volgende = page.getByText('Volgende', { exact: true });
    await expect(volgende).toBeVisible();
    await volgende.click();
    await expect(page).toHaveURL(/\/prive\/autoverzekering\/bereken-autopremie\/?$/);
  });

  await test.step('4. Vul rijgegevens en ingangsdatum in', async () => {
    const bestuurder = page.locator('select[name="bestuurder"]');
    await expect(bestuurder).toBeVisible();
    await bestuurder.selectOption('Ikzelf');
    await expect(bestuurder).toHaveValue('Ikzelf');
    await vulVeld(page, 'schadevrij', gegevens.schadevrij);
    const kilometrage = page.locator('select[name="kilometrage"]');
    await expect(kilometrage).toBeVisible();
    await kilometrage.selectOption(gegevens.kilometrage);
    await expect(kilometrage).toHaveValue(gegevens.kilometrage);
    await vulVeld(page, 'ingangsdatum', ingangsdatum());
    const startBerekening = page.getByText('Start berekening', { exact: true });
    await expect(startBerekening).toBeVisible();
    await startBerekening.click();
    await expect(page.getByRole('heading', { name: 'Kies je dekking' })).toBeVisible({ timeout: 60000 });
  });

  await test.step('5. Kies WA + en het zichtbare aanbod', async () => {
    // 'bc' is de waarde die de site gebruikt voor WA + (beperkt casco).
    const waPlus = page.locator('.dekking_bc');
    await expect(waPlus.getByRole('heading', { name: 'WA +' })).toBeVisible();
    const kiesWaPlus = waPlus.locator('button.choose_dekking[value="bc"]');
    await expect(kiesWaPlus).toBeVisible();
    await kiesWaPlus.click();
    await expect(waPlus.locator('.selected_text')).toBeVisible();
    const bekijkAanbod = page.getByText('Bekijk aanbod', { exact: true });
    await expect(bekijkAanbod).toBeVisible();
    await bekijkAanbod.click();
    await expect(page.getByRole('heading', { name: 'Kies je autoverzekering' })).toBeVisible({ timeout: 30000 });
    await expect(page.locator('select[name="dekking"]:visible')).toHaveValue('bc');

    // De site bewaart andere aanbiedingen verborgen in de HTML.
    const aanbod = page.locator('.product_item:visible');
    await expect(aanbod).toHaveCount(1, { timeout: 30000 });
    const jaarpremie = aanbod.locator('.product_header_item').filter({ hasText: 'Per jaar' });
    await expect(jaarpremie).toBeVisible();
    // Check op een bedrag boven nul, zonder een premie vast te zetten die kan wijzigen.
    await expect(jaarpremie).toContainText(/€\s*[1-9]\d*(?:[.,]\d{2})/);
    const kiesAanbod = aanbod.locator('.choose_product');
    await expect(kiesAanbod).toBeVisible();
    await kiesAanbod.click();
  });

  await test.step('6. Controleer de winkelwagen en stop', async () => {
    await expect(page).toHaveURL(/\/prive\/winkelwagen\/?$/, { timeout: 30000 });
    await expect(page.getByRole('heading', { name: 'Jouw keuzes' })).toBeVisible();
    await expect(page.getByText('Schade Voor Inzittenden Basis')).toBeVisible();
    await expect(page.getByText('Rechtsbijstand Motorrijtuigen Basis')).toBeVisible();
    // Een derde vakje staat standaard aan, maar is uitgeschakeld en geen extra dekking.
    await expect(page.locator('input[type="checkbox"]:not(:disabled)')).toHaveCount(2);
    await expect(page.locator('input[type="checkbox"]:not(:disabled):checked')).toHaveCount(0);
    await expect(page.getByText('WA+', { exact: true })).toBeVisible();
    await expect(page.getByText('Sluit af', { exact: true })).toBeVisible();
    // Niet aanklikken: Sluit af kan een echte aanvraag starten.
  });
});
