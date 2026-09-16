import { expect, test } from '@playwright/test';

test('demo: maak een screenshot wanneer een controle faalt', async ({ page }) => {
  // Een gewone test-run slaat deze demonstratie over.
  test.skip(process.env.RUN_SCREENSHOT_DEMO !== '1', 'Alleen uitvoeren met npm run test:screenshot-demo');

  // Open de echte autopagina en wacht tot de inhoud zichtbaar is.
  await page.goto('https://www.lancyr.nl/prive/autoverzekering/');
  const cookieMelding = page.locator('#cookie-overlay');
  await cookieMelding.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  if (await cookieMelding.isVisible()) {
    await page.getByRole('button', { name: 'Keuze opslaan' }).click();
  }
  await expect(page.getByRole('heading', { name: /Autoverzekering\s+afsluiten/i })).toBeVisible();

  // Bewust fout: de dekkingkeuze is hier nog niet bereikt.
  // Playwright bewaart een screenshot van de echte Lancyr-pagina op dit moment.
  await expect(page.getByRole('heading', { name: 'Kies je dekking' })).toBeVisible({ timeout: 1000 });
});
