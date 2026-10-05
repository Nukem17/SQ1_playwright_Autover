import { test, expect, dataset, details, registreer, openPagina, controleerInhoud, dezelfdeUrl, url } from './helpers';

test.setTimeout(45000);
for (const gegevens of dataset.paginas) {
  test(`${gegevens.naam}: pagina bereikbaar`, details('Bereikbaarheid',gegevens), async ({page}, info) => {
    await registreer(info,gegevens);
    await openPagina(page,gegevens);
    await test.step(`Controleer bestemming en inhoud van ${gegevens.naam}`,async()=>{
      expect(dezelfdeUrl(page.url(),url(gegevens.pad)),'De pagina moet op de afgesproken URL staan.').toBe(true);
      await controleerInhoud(page,gegevens);
    });
  });
  test(`${gegevens.naam}: juiste paginatitel`, details('Pagina-inhoud',gegevens), async ({page}, info) => {
    await registreer(info,gegevens);
    await openPagina(page,gegevens);
    await test.step(`Controleer de paginatitel van ${gegevens.naam}`,async()=>{
      await expect(page,`${gegevens.naam} moet de afgesproken paginatitel hebben.`).toHaveTitle(gegevens.verwachteTitel);
    });
  });
  test(`${gegevens.naam}: één zichtbare hoofdtitel`, details('Pagina-inhoud',gegevens), async ({page}, info) => {
    await registreer(info,gegevens);
    await openPagina(page,gegevens);
    await test.step(`Controleer of ${gegevens.naam} één zichtbare hoofdtitel (H1) heeft`,async()=>{
      const h1 = page.locator('h1');
      await expect(h1,`${gegevens.naam} moet precies één hoofdtitel (H1) hebben.`).toHaveCount(1);
      await expect(h1,'De hoofdtitel moet zichtbaar zijn.').toBeVisible();
      await expect(h1,'De hoofdtitel moet bij deze pagina passen.').toHaveText(gegevens.verwachteHoofdtitel);
    });
  });
  test(`${gegevens.naam}: beschrijving voor zoekmachines`, details('Pagina-inhoud',gegevens), async ({page}, info) => {
    await registreer(info,gegevens);
    await openPagina(page,gegevens);
    await test.step(`Controleer of ${gegevens.naam} een beschrijving voor zoekmachines heeft`,async()=>{
      const description = page.locator('head meta[name="description"]');
      await expect(description,`${gegevens.naam} moet een meta-description hebben.`).toHaveCount(1);
      await expect(description,'De beschrijving voor zoekmachines mag niet leeg zijn.').toHaveAttribute('content',/\S/);
    });
  });
}
