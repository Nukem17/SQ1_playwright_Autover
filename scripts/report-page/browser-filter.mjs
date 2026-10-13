// Voeg de browserkeuze pas bij het tonen toe; opgeslagen Playwright-rapporten blijven intact.
export function addBrowserFilter(html, browsers) {
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const options = [...new Set(browsers)].sort().map(browser => `<option value="${escape(browser)}">${escape(browser)}</option>`).join('');
  return html.replace(/<body([^>]*)>/i, `<body$1><div id="report-browser-toolbar" style="padding:12px 20px;border-bottom:1px solid #888;font:14px system-ui;display:flex;gap:12px;flex-wrap:wrap;align-items:center"><label for="report-browser">Browser </label><select id="report-browser" style="font:inherit;padding:6px;max-width:100%"><option value="">Alle browsers</option>${options}</select><span>Filter de tests en bijbehorende traces op browser.</span></div><script defer src="/report-browser-filter.js"></script>`);
}
