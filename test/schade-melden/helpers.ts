import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { haalRegressieSetOp, LANCYR_ORIGIN, type RegressiePagina, type RegressieScenario } from '../../testdata/regressie';
export { test, expect };
export const dataset = haalRegressieSetOp();
export const pagina = (id: string) => {
  const found = dataset.paginas.find(p => p.id === id);
  if (!found) throw new Error(`Regressiepagina ontbreekt: ${id}`);
  return found;
};
export const url = (pad: string) => new URL(pad, LANCYR_ORIGIN).href;
export function details(groep: string, item: RegressiePagina | RegressieScenario) {
  return { annotation: [
    { type:'Onderdeel', description:item.onderdeel },
    { type:'Testgroep', description:groep },
    { type:'Testsoort', description:'Functioneel' },
    { type:'Regressiecase', description:item.id },
    ...('bron' in item ? [{ type:'Bronmelding', description:JSON.stringify(item.bron) }] : []),
  ] };
}
export async function registreer(info: TestInfo, item: RegressiePagina | RegressieScenario) {
  const gegevens = 'bronPaginaId' in item
    ? { scenario:item, bron:pagina(item.bronPaginaId), doel:item.doelPaginaId ? pagina(item.doelPaginaId) : null }
    : item;
  await info.attach('Gebruikte regressiegegevens', {body:JSON.stringify(gegevens,null,2),contentType:'application/json'});
}
export async function openPagina(page: Page, gegevens: RegressiePagina) {
  return test.step(`Open ${gegevens.naam}`, async () => {
    const response = await page.goto(url(gegevens.pad), {waitUntil:'domcontentloaded'});
    expect(response, 'De pagina moet een antwoord van de website krijgen.').not.toBeNull();
    expect(response!.status(), `${gegevens.naam} moet HTTP ${gegevens.verwachteStatus} teruggeven.`).toBe(gegevens.verwachteStatus);
    await expect(page.getByRole('main'), 'De pagina-inhoud moet zichtbaar worden.').toBeVisible();
    return response!;
  });
}
export async function sluitCookies(page: Page) {
  const overlay = page.locator('#cookie-overlay');
  await overlay.waitFor({state:'visible',timeout:2000}).catch(error => {
    if (error.name !== 'TimeoutError') throw error;
  });
  if (await overlay.isVisible()) {
    await overlay.getByRole('button',{name:'Keuze opslaan'}).click();
    await expect(overlay).toBeHidden();
  }
}
// Compare parsed parameters: their order is not significant.
export function dezelfdeUrl(actual: string, expected: string) {
  const a = new URL(actual), b = new URL(expected);
  a.searchParams.sort(); b.searchParams.sort();
  return a.href === b.href;
}
export async function controleerInhoud(page: Page, gegevens: RegressiePagina) {
  await expect(page.getByRole('heading',{name:gegevens.verwachteHoofdtitel,exact:true}), 'De verwachte pagina-inhoud moet herkenbaar zijn.').toBeVisible();
}
export const faqLinks = (page: Page) => page.getByRole('main').locator('.wp-block-post-template a.wp-block-read-more');
export async function faqInhoud(page: Page) {
  const links = faqLinks(page);
  await expect(page.getByRole('main').locator('.wp-block-post-template > li').first(),'De FAQ moet een zichtbare vragenlijst tonen.').toBeVisible();
  await expect(links.first(),'Elke FAQ-vraag moet een antwoordlink bevatten.').toBeAttached();
  return links.evaluateAll(items=>items.map(a=>({url:(a as HTMLAnchorElement).href,tekst:a.textContent?.trim()})));
}
export async function faqPagina(page: Page, nummer: number) {
  await expect(page.getByRole('navigation',{name:'Paginering'}).locator('[aria-current="page"]'),'Het juiste paginanummer moet actief zijn.').toHaveText(String(nummer));
  expect(new URL(page.url()).searchParams.get('query-11-page') ?? '1','Het webadres moet dezelfde FAQ-pagina aangeven.').toBe(String(nummer));
}
