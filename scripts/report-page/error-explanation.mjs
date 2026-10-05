// Explain recorded observations only; an assertion does not establish a root cause.
export function explainError(message, step = '') {
  const header = message.split('Call log:')[0];
  const timeout = header.match(/Timeout:\s*(\d+)ms/);
  const wait = timeout ? ` binnen ${Number(timeout[1]) / 1000} seconden` : '';
  const explanation = {
    title: step ? `Stap “${step}” is niet geslaagd.` : 'De test is niet geslaagd; de betreffende stap is niet vastgelegd.',
    step,
    expected: 'De controle in deze teststap slaagt.',
    observed: 'De vastgelegde controle is mislukt. Bekijk de screenshot en technische foutmelding voor meer informatie.',
    cause: 'De oorzaak is met deze foutmelding alleen niet vastgesteld.',
  };
  if (header.includes('toHaveURL')) {
    const expected = header.match(/Expected (?:pattern|string):\s*(.+)/)?.[1] || '';
    const received = header.match(/Received string:\s*"([^"]*)"/)?.[1] || '';
    // Match both the recorded page transition and the named test step.
    if (expected.includes('bereken-autopremie') && received.endsWith('/prive/maak-een-account/') && /Vul adres en persoonlijke situatie in/.test(step)) {
      return { ...explanation,
        title: 'Na “Volgende” werd de pagina voor rijgegevens niet op tijd bereikt.',
        expected: `Na het invullen van adres en persoonlijke situatie opent de pagina voor bestuurder en rijgegevens${wait}.`,
        observed: `De browser stond aan het einde van de controle nog op de pagina voor adres en persoonlijke situatie. De controle op schadevrije jaren was nog niet bereikt.`,
      };
    }
    return { ...explanation,
      title: 'De verwachte pagina werd niet op tijd bereikt.',
      expected: `De browser staat${wait} op het verwachte webadres.`,
      observed: 'Het webadres kwam tijdens de controle niet overeen met de verwachting. De adressen staan in de technische foutmelding.',
    };
  }
  if (header.includes('toBeVisible')) {
    const name = header.match(/Locator: getByRole\('(?:heading|button|link|textbox)',\s*\{\s*name:\s*'([^']+)'/)?.[1];
    return { ...explanation,
      title: name ? `“${name}” werd niet op tijd zichtbaar.` : 'Een verwacht onderdeel van de pagina werd niet op tijd zichtbaar.',
      expected: name ? `“${name}” is${wait} zichtbaar.` : `Het gecontroleerde onderdeel is${wait} zichtbaar.`,
      observed: 'De test kon dit onderdeel niet als zichtbaar bevestigen.',
    };
  }
  if (header.includes('toHaveScreenshot')) {
    return { ...explanation,
      title: 'De visuele controle is niet geslaagd.',
      expected: 'Het uiterlijk van de pagina komt binnen de toegestane marge overeen met de goedgekeurde referentie.',
      observed: 'De screenshotcontrole is mislukt. Bekijk het visuele overzicht en de technische melding om te zien of er een verschil is of de opname niet lukte.',
    };
  }
  return explanation;
}

export function failedStep(steps = []) {
  for (const step of steps) {
    if (step.error) return step.title || '';
    const nested = failedStep(step.steps);
    if (nested) return nested;
  }
  return '';
}

const messageOf = error => String(error?.message || error?.stack || '').replace(/\x1b\[[0-9;]*m/g, '');
const comparableMessage = error => messageOf(error).split(/\n(?:\s*>?\s*\d+\s*\||\s+at\s)/)[0].trim();

function containsError(step, message) {
  return (step.error && comparableMessage(step.error) === message) || (step.steps || []).some(child => containsError(child, message));
}

// Uses recorded steps, including new step names and unknown error types.
// Do not invent the next step: reports usually omit steps that never ran.
export function explainAttempt(result) {
  const errors = result.errors?.length ? result.errors : result.error ? [result.error] : [];
  const failed = ['failed', 'timedOut', 'interrupted'].includes(result.status);
  if (!errors.length && !failed) return [];
  const steps = result.steps || [];
  return (errors.length ? errors : [{}]).map(error => {
    const message = messageOf(error);
    const matches = message ? steps.map((step,index) => containsError(step, comparableMessage(error)) ? index : -1).filter(index => index >= 0) : [];
    const index = matches.length === 1 ? matches[0] : -1;
    // Only associate an error with a step when its recorded message matches.
    const step = index >= 0 ? messageOf({message:steps[index].title}) : '';
    const explanation = explainError(message, step);
    explanation.consequence = index >= 0
      ? index === steps.length - 1
        ? 'Na deze mislukte stap zijn geen volgende teststappen vastgelegd.'
        : 'Er zijn daarna nog teststappen uitgevoerd, maar deze fout blijft onderdeel van het resultaat.'
      : 'Het rapport vermeldt niet bij welke stap deze fout optrad. Het vervolg kan daardoor niet uit deze melding worden afgeleid.';
    if (!message) {
      explanation.title = result.status === 'timedOut' ? 'De beschikbare tijd voor deze testpoging is verstreken.'
        : result.status === 'interrupted' ? 'Deze testpoging is onderbroken.' : 'Deze testpoging is mislukt.';
      explanation.observed = 'Er is geen verdere foutomschrijving opgeslagen.';
    }
    return explanation;
  });
}
