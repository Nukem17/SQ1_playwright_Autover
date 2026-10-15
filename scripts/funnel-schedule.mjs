import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

// Bepaal op basis van de geplande tijd, niet het mogelijk vertraagde startuur.
export function shouldRunFunnel(event, cron, now = new Date()) {
  if (event === 'workflow_dispatch') return true;
  if (event !== 'schedule') return false;
  const utcHour = { '0 10 * * *': 10, '0 11 * * *': 11 }[cron];
  if (utcHour === undefined) throw new Error(`Onbekende funnelplanning: ${cron}`);
  const scheduled = new Date(now);
  scheduled.setUTCHours(utcHour, 0, 0, 0);
  const hour = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Amsterdam', hour: '2-digit', hourCycle: 'h23' }).format(scheduled);
  return hour === '12';
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const run = shouldRunFunnel(process.env.GITHUB_EVENT_NAME, process.env.SCHEDULE_CRON);
  console.error(run ? 'Funnel geselecteerd: 12:00 Nederlandse tijd of handmatige start.' : 'Funnel overgeslagen: deze UTC-planning hoort bij het andere seizoen.');
  console.log(`run=${run}`);
}
