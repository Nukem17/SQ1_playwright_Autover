import { expect, test } from '@playwright/test';

// Alleen de aparte visual-runner schakelt deze proef in.
test.skip(!process.env.LANCYR_VISUAL_MODE, 'Gebruik scripts/run-lancyr-visual.sh');
test.use({ viewport: { width: 1440, height: 700 }, locale: 'nl-NL', colorScheme: 'light', reducedMotion: 'reduce' });

test('autoverzekering startpagina komt overeen met de referentie', async ({ page }, testInfo) => {
  test.setTimeout(60000);
  await page.goto('https://www.lancyr.nl/prive/autoverzekering/');
  const cookies = page.locator('#cookie-overlay');
  await cookies.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  if (await cookies.isVisible()) {
    await page.getByRole('button', { name: 'Keuze opslaan' }).click();
    await expect(cookies).toBeHidden();
  }

  await expect(page.getByRole('heading', { name: /Autoverzekering\s+afsluiten/i })).toBeVisible();
  const kenteken = page.getByRole('textbox', { name: 'Kenteken Auto' });
  await expect(kenteken).toBeVisible();
  await kenteken.fill('');
  await expect(page.getByText('Bereken Premie', { exact: true })).toBeVisible();
  await kenteken.blur();
  await page.evaluate(async () => {
    window.scrollTo(0, 0);
    await document.fonts.ready;
    const images = Array.from(document.images).filter(image => {
      const rect = image.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight;
    });
    await Promise.all(images.map(image => image.decode()));
  });

  // Alleen deze browserpagina verandert; er wordt niets op de website opgeslagen.
  if (process.env.LANCYR_VISUAL_MODE === 'demo') {
    await kenteken.evaluate(element => element.style.setProperty('transform', 'translateX(60px)', 'important'));
  }

  // Bewaar de actuele afbeelding ook wanneer de vergelijking slaagt.
  const actual = testInfo.outputPath('actueel.png');
  await page.screenshot({ path: actual, animations: 'disabled', caret: 'hide' });
  await testInfo.attach('Actuele screenshot', { path: actual, contentType: 'image/png' });
  await expect(page).toHaveScreenshot('autoverzekering-start.png', {
    animations: 'disabled', caret: 'hide', maxDiffPixels: 0,
  });
});
