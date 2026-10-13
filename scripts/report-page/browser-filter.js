(() => {
  const select = document.getElementById('report-browser');
  if (!select) return;
  // Playwright bewaart zoekfilters achter # in het webadres. p: is het browser/projectfilter.
  const parameters = () => new URLSearchParams(location.hash.replace(/^#\??/, ''));
  const projectPattern = /(?:^|\s)p:(?:"[^"]*"|'[^']*'|\S+)/g;
  function sync() {
    const query = parameters().get('q') || '';
    const matches = [...query.matchAll(projectPattern)].map(match => match[0].trim().slice(2).replace(/^(["'])(.*)\1$/, '$2'));
    // Meerdere handmatig gekozen projecten blijven werken, zonder één browser te suggereren.
    let custom = select.querySelector('[data-custom]');
    if (matches.length && (matches.length !== 1 || ![...select.options].some(o => !o.dataset.custom && o.value === matches[0]))) {
      if (!custom) { custom = new Option('Aangepast browserfilter', '__custom__'); custom.dataset.custom = 'true'; select.add(custom); }
      select.value = '__custom__';
    } else {
      custom?.remove();
      select.value = matches[0] || '';
    }
  }
  select.addEventListener('change', () => {
    if (select.value === '__custom__') return;
    const params = parameters();
    // Behoud andere zoekwoorden en statusfilters bij het wisselen van browser.
    const rest = (params.get('q') || '').replace(projectPattern, ' ').trim();
    const project = select.value ? 'p:' + JSON.stringify(select.value) : '';
    const query = [rest, project].filter(Boolean).join(' ');
    if (query) params.set('q', query); else params.delete('q');
    // Ga vanuit testdetails terug naar de lijst met de gekozen browser.
    params.delete('testId');
    location.hash = '?' + params.toString();
  });
  window.addEventListener('hashchange', sync);
  window.addEventListener('popstate', sync);
  sync();
})();
