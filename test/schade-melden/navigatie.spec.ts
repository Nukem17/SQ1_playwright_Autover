import { test, expect, dataset, details, registreer, pagina, url, openPagina, controleerInhoud, sluitCookies, dezelfdeUrl } from './helpers';

// Controleer of bezoekers via de schadeopties op de bedoelde pagina terechtkomen.
// De database bepaalt welke routes en externe verwijzingen we controleren.
test.setTimeout(45000);
for (const scenario of dataset.scenarios.filter(s=>s.type==='navigatie')) {
  test(scenario.naam,details('Navigatie',scenario),async({page},info)=>{
    await registreer(info,scenario);
    const doel = pagina(scenario.doelPaginaId!);
    await openPagina(page,pagina(scenario.bronPaginaId));
    await sluitCookies(page);
    await test.step(`Open ${doel.naam} via de schadeoptie`,async()=>{
      // Sommige knoppen hebben dezelfde tekst. Het webadres bepaalt welke we nodig hebben.
      const target = page.getByRole('main').locator(`a[href=${JSON.stringify(url(doel.pad))}], a[href=${JSON.stringify(doel.pad)}]`);
      await expect(target,'De schadeoptie moet beschikbaar zijn.').toHaveCount(1);
      await expect(target).toBeVisible();
      let bestemming = page;
// Volg de link zoals de website die aanbiedt: in hetzelfde of in een nieuw tabblad.
      if (await target.getAttribute('target') === '_blank') {
        const nieuwTabblad = page.waitForEvent('popup');
        await target.click();
        bestemming = await nieuwTabblad;
        await bestemming.waitForLoadState('domcontentloaded');
      } else {
        await target.click();
      }
      await expect(bestemming,'De schadeoptie moet de juiste pagina openen.').toHaveURL(actual=>dezelfdeUrl(actual.href,url(doel.pad)));
      await controleerInhoud(bestemming,doel);
    });
  });
}
// Controleer alleen de zichtbaarheid en bestemming van externe formulierlinks.
// Deze tests openen, vullen en verzenden geen schadeformulier.
for (const scenario of dataset.scenarios.filter(s=>s.type==='extern-link')) {
  test(scenario.naam,details('Navigatie',scenario),async({page},info)=>{
    await registreer(info,scenario);
    await openPagina(page,pagina(scenario.bronPaginaId));
    await sluitCookies(page);
    await test.step('Controleer de verwijzing naar het externe schadeformulier',async()=>{
      const link = page.getByRole('main').getByRole('link',{name:scenario.instellingen.linkTekst!,exact:true});
      await expect(link).toBeVisible();
      await expect(link,'De link moet naar het afgesproken externe formulier verwijzen.').toHaveAttribute('href',scenario.instellingen.doelUrl!);
    });
  });
}
