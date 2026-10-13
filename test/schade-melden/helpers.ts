import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { haalRegressieSetOp, LANCYR_ORIGIN, type RegressiePagina, type RegressieScenario } from '../../testdata/regressie';
export { test, expect };
// Deze hulpfuncties worden gedeeld door alle schade-melden-tests.
// Lees de pagina’s en scenario’s één keer uit de database bij het verzamelen van de tests.
export const dataset = haalRegressieSetOp();
// Zoek de volledige paginagegevens bij het ID dat in een scenario staat.
export const pagina = (id: string) => {
  const found = dataset.paginas.find(p => p.id === id);
  if (!found) throw new Error(`Regressiepagina ontbreekt: ${id}`);
  return found;
};
// Maak van een pad zoals /schade-melden/ een volledig webadres.
export const url = (pad: string) => new URL(pad, LANCYR_ORIGIN).href;
// Deze labels bepalen de groepering en vindbaarheid in de rapportage.
// Regressiecase is het nummer van de controle, niet de naam van een testgebruiker.
export function details(groep: string, item: RegressiePagina | RegressieScenario) {
  return { annotation: [
    { type:'Onderdeel', description:item.onderdeel },
    { type:'Testgroep', description:groep },
    { type:'Testsoort', description:'Functioneel' },
    { type:'Regressiecase', description:item.id },
    ...('bron' in item ? [{ type:'Bronmelding', description:JSON.stringify(item.bron) }] : []),
  ] };
}
// Bewaar de gebruikte verwachtingen als bijlage, zodat je een uitslag later kunt nakijken.
export async function registreer(info: TestInfo, item: RegressiePagina | RegressieScenario) {
  const gegevens = 'bronPaginaId' in item
    ? { scenario:item, bron:pagina(item.bronPaginaId), doel:item.doelPaginaId ? pagina(item.doelPaginaId) : null }
    : item;
  await info.attach('Gebruikte regressiegegevens', {body:JSON.stringify(gegevens,null,2),contentType:'application/json'});
}
// Open de pagina en controleer of de website antwoord geeft en de inhoud zichtbaar wordt.
// Een benoemde stap maakt in de rapportage duidelijk waar de test eventueel stopt.
export async function openPagina(page: Page, gegevens: RegressiePagina) {
  return test.step(`Open ${gegevens.naam}`, async () => {
    const response = await page.goto(url(gegevens.pad), {waitUntil:'domcontentloaded'});
    expect(response, 'De pagina moet een antwoord van de website krijgen.').not.toBeNull();
    expect(response!.status(), `${gegevens.naam} moet HTTP ${gegevens.verwachteStatus} teruggeven.`).toBe(gegevens.verwachteStatus);
    await expect(page.getByRole('main'), 'De pagina-inhoud moet zichtbaar worden.').toBeVisible();
    return response!;
  });
}
// Sluit de cookiemelding als deze verschijnt, zodat hij geen knoppen bedekt.
// Geen melding binnen twee seconden is toegestaan; andere fouten blijven zichtbaar.
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
// Vergelijk webadressen zonder verschil te maken tussen de volgorde van URL-parameters.
// ?cst&query-11-page=2 betekent hier hetzelfde als ?query-11-page=2&cst.
export function dezelfdeUrl(actual: string, expected: string) {
  const a = new URL(actual), b = new URL(expected);
  a.searchParams.sort(); b.searchParams.sort();
  return a.href === b.href;
}
// Herken de bestemming aan de zichtbare kop. Die kan ook buiten het hoofdgedeelte staan.
// Of deze kop echt een H1 is, wordt in een aparte paginatest gecontroleerd.
export async function controleerInhoud(page: Page, gegevens: RegressiePagina) {
  await expect(page.getByRole('heading',{name:gegevens.verwachteHoofdtitel,exact:true}), 'De verwachte pagina-inhoud moet herkenbaar zijn.').toBeVisible();
}
// Zoek de Lees meer-links die horen bij de vragen in de FAQ.
export const faqLinks = (page: Page) => page.getByRole('main').locator('.wp-block-post-template a.wp-block-read-more');
// Bewaar antwoordlinks en linkteksten om twee vragenlijsten met elkaar te vergelijken.
// Links mogen nog verborgen zijn in een dichtgeklapt antwoord, maar moeten wel bestaan.
export async function faqInhoud(page: Page) {
  const links = faqLinks(page);
  await expect(page.getByRole('main').locator('.wp-block-post-template > li').first(),'De FAQ moet een zichtbare vragenlijst tonen.').toBeVisible();
  await expect(links.first(),'Elke FAQ-vraag moet een antwoordlink bevatten.').toBeAttached();
  return links.evaluateAll(items=>items.map(a=>({url:(a as HTMLAnchorElement).href,tekst:a.textContent?.trim()})));
}
// Het geselecteerde paginanummer en het webadres moeten dezelfde FAQ-pagina aangeven.
// Zonder paginanummer in het adres behandelen we de pagina als pagina 1.
export async function faqPagina(page: Page, nummer: number) {
  await expect(page.getByRole('navigation',{name:'Paginering'}).locator('[aria-current="page"]'),'Het juiste paginanummer moet actief zijn.').toHaveText(String(nummer));
  expect(new URL(page.url()).searchParams.get('query-11-page') ?? '1','Het webadres moet dezelfde FAQ-pagina aangeven.').toBe(String(nummer));
}
