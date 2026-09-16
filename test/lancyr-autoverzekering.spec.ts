import { expect, test, type Page } from '@playwright/test';

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

async function sluitCookieMelding(page: Page) {
  const melding = page.locator('#cookie-overlay');
  await melding.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  if (await melding.isVisible()) {
    await page.getByRole('button', { name: 'Keuze opslaan' }).click();
  }
}

async function vulVeld(page: Page, naam: string, waarde: string) {
  const veld = page.locator(`input[name="${naam}"]`);
  await expect(veld).toBeVisible();
  await veld.fill(waarde);
  await expect(veld).toHaveValue(waarde);
}

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
  test.setTimeout(120000);
  const kenteken = process.env.LANCYR_TEST_KENTEKEN;
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
    await page.getByText('Bereken Premie', { exact: true }).click();
    await expect(page).toHaveURL(/\/prive\/maak-een-account\/?$/);
  });

  await test.step('3. Vul adres en persoonlijke situatie in', async () => {
    await vulVeld(page, 'postcode', gegevens.postcode);
    await vulVeld(page, 'huisnummer', gegevens.huisnummer);
    await vulVeld(page, 'straat', gegevens.straat);
    await vulVeld(page, 'plaats', gegevens.plaats);
    await vulVeld(page, 'geboortedatum', gegevens.geboortedatum);

    const ondernemer = page.locator('input[name="ondernemend_gezin"][value="Ja"]');
    await ondernemer.check();
    await expect(ondernemer).toBeChecked();

    // De site heeft een eigen keuzeknop; direct op de radio klikken schakelt hem weer uit.
    await page.locator('.lancyr_toggle_t1.alleenstaande_zonder_kinderen').click();
    await expect(page.locator('input[name="gezinssamenstelling"][value="alleenstaande_zonder_kinderen"]')).toBeChecked();

    const privacy = page.locator('input[name="radio-4-10"][value="Ja"]');
    await privacy.check();
    await expect(privacy).toBeChecked();
    await page.getByText('Volgende', { exact: true }).click();
    await expect(page).toHaveURL(/\/prive\/autoverzekering\/bereken-autopremie\/?$/);
  });

  await test.step('4. Vul rijgegevens en ingangsdatum in', async () => {
    await page.locator('select[name="bestuurder"]').selectOption('Ikzelf');
    await expect(page.locator('select[name="bestuurder"]')).toHaveValue('Ikzelf');
    await vulVeld(page, 'schadevrij', gegevens.schadevrij);
    await page.locator('select[name="kilometrage"]').selectOption(gegevens.kilometrage);
    await expect(page.locator('select[name="kilometrage"]')).toHaveValue(gegevens.kilometrage);
    await vulVeld(page, 'ingangsdatum', ingangsdatum());
    await page.getByText('Start berekening', { exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Kies je dekking' })).toBeVisible({ timeout: 60000 });
  });

  await test.step('5. Kies WA + en het zichtbare aanbod', async () => {
    await expect(page.getByText('WA +', { exact: true })).toBeVisible();
    // De drie knoppen staan in de volgorde WA, WA + en All-risk.
    await page.getByText('Kies deze', { exact: true }).nth(1).click();
    await expect(page.locator('.selected_text:visible')).toHaveText('Gekozen');
    await page.getByText('Bekijk aanbod', { exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Kies je autoverzekering' })).toBeVisible({ timeout: 30000 });
    // Verborgen aanbiedingen staan ook in de HTML; alleen de zichtbare optie kiezen.
    await expect(page.locator('.choose_product:visible')).toHaveCount(1, { timeout: 30000 });
    await page.locator('.choose_product:visible').click();
  });

  await test.step('6. Controleer de winkelwagen en stop', async () => {
    await expect(page).toHaveURL(/\/prive\/winkelwagen\/?$/);
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
