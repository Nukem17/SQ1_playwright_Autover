import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addBrowserFilter } from './browser-filter.mjs';
import { chromium, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

test('Browsernamen worden veilig en zonder duplicaten in het rapport opgenomen', () => {
  const html = addBrowserFilter('<body class="report"><main>Rapport</main></body>', ['firefox','chromium','firefox','<script>']);
  assert.equal((html.match(/value="firefox"/g)||[]).length, 1);
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(html.includes('<body class="report">'));
  assert.ok(html.includes('<main>Rapport</main>'));
});

test('Browserkeuze behoudt zoeken, volgt navigatie en blijft na herladen staan', async () => {
  const browser=await chromium.launch();
  try {
    const page=await browser.newPage();
    const html=addBrowserFilter('<html><body>Rapport</body></html>', ['chromium','firefox','webkit']);
    await page.route('http://report.test/**', route => route.fulfill({contentType:route.request().url().endsWith('.js')?'text/javascript':'text/html',body:route.request().url().endsWith('.js')?readFileSync(new URL('./browser-filter.js',import.meta.url),'utf8'):html}));
    await page.goto('http://report.test/index.html#?q=s:failed%20hoofdtitel%20p:chromium&testId=voorbeeld');
    const select=page.locator('#report-browser');
    await expect(select).toHaveValue('chromium');
    await select.selectOption('firefox');
    await expect(page).toHaveURL(/p%3A%22firefox%22/);
    let params=new URLSearchParams(new URL(page.url()).hash.slice(2));
    assert.equal(params.get('q'),'s:failed hoofdtitel p:"firefox"');assert.equal(params.has('testId'),false);
    await page.reload();await expect(select).toHaveValue('firefox');
    await select.selectOption('webkit');await expect(select).toHaveValue('webkit');
    await page.goBack();await expect(select).toHaveValue('firefox');
    await select.selectOption('');
    await expect(page).toHaveURL(/q=s%3Afailed\+hoofdtitel$/);
    await page.evaluate(()=>{location.hash='?q=p:chromium%20p:webkit';});
    await expect(select).toHaveValue('__custom__');
    await select.selectOption('firefox');
    await expect(page).toHaveURL(/q=p%3A%22firefox%22$/);
  } finally {await browser.close();}
});
