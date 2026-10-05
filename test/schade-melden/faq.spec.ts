import { test, expect, dataset, details, registreer, pagina, url, openPagina, sluitCookies, faqInhoud, faqPagina, dezelfdeUrl } from './helpers';

test.setTimeout(60000);
for (const scenario of dataset.scenarios.filter(s=>s.type==='faq-antwoord')) {
  test(scenario.naam,details('FAQ',scenario),async({page},info)=>{
    await registreer(info,scenario);
    const start = pagina(scenario.bronPaginaId);
    await openPagina(page,start);
    await sluitCookies(page);
    const vragen = await faqInhoud(page);
    await test.step('Klap de gekozen vraag open',async()=>{
      const item = page.getByRole('main').locator('.wp-block-post-template > li').filter({has:page.locator(`a[href=${JSON.stringify(url(scenario.instellingen.doelPad!))}]`)});
      await item.locator('.faq-toggle').click();
      await expect(item.locator('.faq-content')).toBeVisible();
    });
    await test.step('Open het antwoord op de gekozen vraag',async()=>{
      const link=page.getByRole('main').locator(`a.wp-block-read-more[href=${JSON.stringify(url(scenario.instellingen.doelPad!))}]`);
      await expect(link,'De afgesproken vraag moet in de FAQ staan.').toBeVisible();
      await link.click();
      await expect(page).toHaveURL(url(scenario.instellingen.doelPad!));
      await expect(page.getByRole('main').getByRole('heading',{name:scenario.instellingen.verwachteHoofdtitel!,exact:true})).toBeVisible();
      await expect(page.getByRole('main'),'Het antwoord moet de afgesproken uitleg bevatten.').toContainText(scenario.instellingen.antwoordTekst!);
    });
    await test.step('Keer terug naar dezelfde FAQ-vragen',async()=>{
      await page.goBack({waitUntil:'domcontentloaded'});
      await expect(page).toHaveURL(url(start.pad));
      expect(await faqInhoud(page)).toEqual(vragen);
    });
  });
}
for (const scenario of dataset.scenarios.filter(s=>s.type==='paginering')) {
  test(scenario.naam,details('Paginering',scenario),async({page},info)=>{
    await registreer(info,scenario);
    await openPagina(page,pagina(scenario.bronPaginaId));
    await sluitCookies(page);
    await faqPagina(page,1);
    const eerste = await faqInhoud(page);
    let tweede: Awaited<ReturnType<typeof faqInhoud>>;
    await test.step('Ga naar FAQ-pagina 2 en controleer dat andere vragen verschijnen',async()=>{
      await page.getByRole('navigation',{name:'Paginering'}).getByRole('link',{name:'2',exact:true}).click();
      await expect(page).toHaveURL(actual=>dezelfdeUrl(actual.href,url(pagina(scenario.doelPaginaId!).pad)));
      await faqPagina(page,2);
      tweede=await faqInhoud(page);
      expect(tweede,'Pagina 2 moet andere vragen tonen dan pagina 1.').not.toEqual(eerste);
    });
    await test.step('Herlaad pagina 2 zonder de paginastand te verliezen',async()=>{
      await page.reload({waitUntil:'domcontentloaded'});
      await faqPagina(page,2);
      expect(await faqInhoud(page)).toEqual(tweede);
    });
    await test.step('Ga via paginanummer 1 terug naar de eerste vragen',async()=>{
      await page.getByRole('navigation',{name:'Paginering'}).getByRole('link',{name:'1',exact:true}).click();
      await faqPagina(page,1);
      expect(await faqInhoud(page)).toEqual(eerste);
    });
    await test.step('Controleer de terug- en vooruitknoppen van de browser',async()=>{
      await page.goBack({waitUntil:'domcontentloaded'});
      await faqPagina(page,2);
      expect(await faqInhoud(page)).toEqual(tweede);
      await page.goForward({waitUntil:'domcontentloaded'});
      await faqPagina(page,1);
      expect(await faqInhoud(page)).toEqual(eerste);
    });
  });
}
for (const scenario of dataset.scenarios.filter(s=>s.type==='url-variant')) {
  test(scenario.naam,details('URL-varianten',scenario),async({page},info)=>{
    await registreer(info,scenario);
    await openPagina(page,pagina(scenario.bronPaginaId));
    const verwacht = await faqInhoud(page);
    await test.step('Open de URL-variant en controleer dezelfde FAQ-inhoud',async()=>{
      await openPagina(page,pagina(scenario.doelPaginaId!));
      await faqPagina(page,scenario.instellingen.verwachtePagina!);
      expect(await faqInhoud(page),'Een andere parametervolgorde of cst mag de bedoelde vragen niet veranderen.').toEqual(verwacht);
    });
  });
}

for (const scenario of dataset.scenarios.filter(s=>s.type==='faq-uitklappen')) {
  test(scenario.naam,details('FAQ',scenario),async({page},info)=>{
    await registreer(info,scenario);
    await openPagina(page,pagina(scenario.bronPaginaId));
    await sluitCookies(page);
    await test.step('Klap het FAQ-antwoord open, dicht en opnieuw open',async()=>{
      const item = page.getByRole('main').locator('.wp-block-post-template > li').filter({has:page.locator(`a[href=${JSON.stringify(url(scenario.instellingen.doelPad!))}]`)});
      const antwoord=item.locator('.faq-content');
      await expect(item,'De gekozen vraag moet zichtbaar zijn.').toBeVisible();
      await expect(antwoord).toBeHidden();
      await item.locator('.faq-toggle').click();
      await expect(antwoord,'Het antwoord moet na openklappen zichtbaar worden.').toBeVisible();
      await expect(antwoord).toContainText(scenario.instellingen.antwoordTekst!);
      await item.locator('.faq-toggle').click();
      await expect(antwoord,'Het antwoord moet weer dichtgeklapt kunnen worden.').toBeHidden();
      await item.locator('.faq-toggle').click();
      await expect(antwoord).toBeVisible();
    });
  });
}
