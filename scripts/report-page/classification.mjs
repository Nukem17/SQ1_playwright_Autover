// Explicit annotations are the contract for new pages and flows. These exact filenames
// keep existing reports usable without rewriting historical result files.
export function classifyTest(spec, suite, annotations, runKind) {
  const annotation = type => annotations.find(a => a.type === type && typeof a.description === 'string' && a.description.trim())?.description.trim();
  const file = String(spec.file || suite.file || '').replaceAll('\\', '/').split('/').pop();
  const legacyAuto = file === 'lancyr-autoverzekering.spec.ts';
  const legacyVisual = file === 'lancyr-visual.spec.ts';
  const area = annotation('Onderdeel') || annotation('Funnel') || (legacyAuto || legacyVisual ? 'Autoverzekering' : 'Niet ingedeeld');
  const kind = annotation('Testsoort') || (legacyVisual ? 'Visueel' : runKind);
  const legacyGroup = legacyVisual ? 'Visuele controle' : legacyAuto
    ? spec.title === 'doorloop de funnel tot vlak vóór Sluit af' ? 'Klantreis'
      : ['de ingang van de premieberekening is zichtbaar', 'een leeg kenteken houdt de gebruiker op de autopagina'].includes(spec.title) ? 'Pagina en invoer' : null
    : null;
  return { area, testGroup: annotation('Testgroep') || legacyGroup || 'Overige tests', kind };
}
