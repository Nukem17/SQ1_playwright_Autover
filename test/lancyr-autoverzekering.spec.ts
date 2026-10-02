import { expect, test, type Page } from '@playwright/test';
import { haalTestscenarioOp, bepaalIngangsdatum } from '../testdata/scenarios';

// Playwright geeft elke test een verse 'page': een nieuw browsertabblad.
// Met expect checken we wat de gebruiker echt ziet of heeft ingevuld.

const HOME = 'https://www.lancyr.nl/';
const AUTO = `${HOME}prive/autoverzekering/`;

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

test('doorloop de funnel tot vlak vóór Sluit af', async ({ page }, testInfo) => {
  // De live premieberekening kan langer duren dan een korte paginatest.
  test.setTimeout(120000);
  const gegevens = await test.step('0. Haal testscenario op uit SQLite', () => haalTestscenarioOp());
  testInfo.annotations.push({ type: 'Testdata', description: `SQLite-scenario: ${gegevens.id}` });
  await testInfo.attach('Gebruikte testdata uit SQLite', {
    body: JSON.stringify(gegevens, null, 2), contentType: 'application/json',
  });

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
    await veld.fill(gegevens.kenteken);
    await expect(veld).toHaveValue(gegevens.kenteken);
    // Wacht op de voertuiggegevens voordat Bereken Premie wordt aangeklikt.
    await expect(page.locator('.voertuig_details')).toContainText(gegevens.verwachtVoertuig);
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

    const ondernemer = page.locator(`input[name="ondernemend_gezin"][value="${gegevens.ondernemer}"]`);
    await expect(ondernemer).toBeVisible();
    await ondernemer.check();
    await expect(ondernemer).toBeChecked();

    // De site heeft een eigen keuzeknop; direct op de radio klikken schakelt hem weer uit.
    const gezin = page.locator(`.lancyr_toggle_t1.${gegevens.gezin}`);
    await expect(gezin).toBeVisible();
    await gezin.click();
    await expect(page.locator(`input[name="gezinssamenstelling"][value="${gegevens.gezin}"]`)).toBeChecked();

    const privacy = page.locator(`input[name="radio-4-10"][value="${gegevens.privacy}"]`);
    await expect(privacy).toBeVisible();
    await privacy.check();
    await expect(privacy).toBeChecked();
    const volgende = page.getByText('Volgende', { exact: true });
    await expect(volgende).toBeVisible();
    await volgende.click();
    await expect(page).toHaveURL(/\/prive\/autoverzekering\/bereken-autopremie\/?$/);
  });

  await test.step('4. Controleer bestuurder en vul rijgegevens in', async () => {
    const bestuurder = page.locator('select[name="bestuurder"]');
    await expect(bestuurder).toBeVisible();
    await bestuurder.selectOption(gegevens.bestuurder);
    await expect(bestuurder).toHaveValue(gegevens.bestuurder);
    if (gegevens.verwachteUitkomst === 'bestuurder-geblokkeerd') {
      await expect(page.getByText(/Gaat jouw kind of iemand anders dan jij of je partner/)).toBeVisible();
      await expect(page.getByText('Start berekening', { exact: true })).toBeHidden();
      await expect(page.locator('input[name="schadevrij"]')).toBeHidden();
      await expect(page).toHaveURL(/\/prive\/autoverzekering\/bereken-autopremie\/?$/);
      return;
    }
    if (gegevens.bestuurder === 'Partner') {
      await vulVeld(page, 'geboortedatum_partner', gegevens.geboortedatumPartner!);
    }
    await vulVeld(page, 'schadevrij', gegevens.schadevrij);
    const kilometrage = page.locator('select[name="kilometrage"]');
    await expect(kilometrage).toBeVisible();
    await kilometrage.selectOption(gegevens.kilometrage);
    await expect(kilometrage).toHaveValue(gegevens.kilometrage);
    await vulVeld(page, 'ingangsdatum', bepaalIngangsdatum(gegevens));
    const startBerekening = page.getByText('Start berekening', { exact: true });
    await expect(startBerekening).toBeVisible();
    await startBerekening.click();
    await expect(page.getByRole('heading', { name: 'Kies je dekking' })).toBeVisible({ timeout: 60000 });
  });

  if (gegevens.verwachteUitkomst === 'bestuurder-geblokkeerd') {
    testInfo.annotations.push({ type: 'Verwachte uitkomst', description: 'Berekening geblokkeerd voor inwonend kind; geen winkelwagen verwacht.' });
    return;
  }

  await test.step('5. Kies de dekking uit de database en het zichtbare aanbod', async () => {
    const dekking = page.locator(`.dekking_${gegevens.dekking}`);
    await expect(dekking.getByRole('heading', { name: gegevens.dekkingTitel })).toBeVisible();
    const kiesDekking = dekking.locator(`button.choose_dekking[value="${gegevens.dekking}"]`);
    await expect(kiesDekking).toBeVisible();
    await kiesDekking.click();
    await expect(dekking.locator('.selected_text')).toBeVisible();
    const bekijkAanbod = page.getByText('Bekijk aanbod', { exact: true });
    await expect(bekijkAanbod).toBeVisible();
    await bekijkAanbod.click();
    await expect(page.getByRole('heading', { name: 'Kies je autoverzekering' })).toBeVisible({ timeout: 30000 });
    await expect(page.locator('select[name="dekking"]:visible')).toHaveValue(gegevens.dekking);

    // De site bewaart andere aanbiedingen verborgen in de HTML.
    // Kies het afgesproken product; volgorde en aantal aanbiedingen kunnen verschillen.
    const aanbod = page.locator('.product_item:visible').filter({
      has: page.locator(`.choose_product[product_id="${gegevens.aanbodProductId}"]`),
    });
    await expect(aanbod).toBeVisible({ timeout: 30000 });
    const jaarpremie = aanbod.locator('.product_header_item').filter({ hasText: 'Per jaar' });
    await expect(jaarpremie).toBeVisible();
    // Check op een bedrag boven nul, zonder een premie vast te zetten die kan wijzigen.
    await expect(jaarpremie).toContainText(/€\s*[1-9]\d*(?:[.,]\d{2})/);
    const kiesAanbod = aanbod.locator('.choose_product');
    await expect(kiesAanbod).toBeVisible();
    await kiesAanbod.click();
  });

  await test.step('6. Kies extra dekkingen uit de database en controleer de winkelwagen', async () => {
    await expect(page).toHaveURL(/\/prive\/winkelwagen\/?$/, { timeout: 30000 });
    await expect(page.getByRole('heading', { name: 'Jouw keuzes' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 3 }).filter({ hasText: gegevens.verwachtVoertuig })).toBeVisible({ timeout: 30000 });
    const extraKnoppen = page.locator('.type_dekking_check [data-state]');
    await expect(extraKnoppen).toHaveCount(gegevens.extraDekkingen.length);
    for (const extra of gegevens.extraDekkingen) {
      const blok = page.locator('.type_dekking_l_blok_content').filter({
        has: page.getByText(extra, { exact: true }),
      });
      const knop = blok.locator('[data-state]');
      await expect(knop).toBeVisible();
      await expect(knop).toHaveAttribute('data-state', 'unchecked');
      if (gegevens.geselecteerdeExtras.includes(extra)) {
        await knop.click();
        await expect(knop).toHaveAttribute('data-state', 'checked');
        // De gekozen extra moet ook in het verzekeringsoverzicht terechtkomen.
        await expect(page.getByText(extra, { exact: true })).toHaveCount(2);
      }
    }
    await expect(page.locator('.type_dekking_check [data-state="checked"]')).toHaveCount(gegevens.geselecteerdeExtras.length);
    await expect(page.getByText(gegevens.dekkingWinkelwagen, { exact: true })).toBeVisible();
    await expect(page.getByText('Sluit af', { exact: true })).toBeVisible();
    // Niet aanklikken: Sluit af kan een echte aanvraag starten.
  });

  if (process.env.LANCYR_FUNNEL_DEMO === '1') {
    await test.step('7. DEMO — bewust verkeerde verwachting om de fouttrace te tonen', async () => {
      await expect(page.getByRole('heading', { name: 'Jouw keuzes' }),
        'DEMO: bewust verkeerde koptekst; dit is geen echte fout in de website',
      ).toHaveText('DEMO — deze koptekst hoort niet in de winkelwagen', { timeout: 1000 });
    });
  }
});
