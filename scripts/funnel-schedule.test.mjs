import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shouldRunFunnel } from './funnel-schedule.mjs';

test('Zomer, winter en omschakeldagen selecteren precies de UTC-planning voor 13:45 Nederland', () => {
  for (const [date, summer] of [['2026-10-15', true], ['2026-10-25', false], ['2026-12-15', false], ['2027-03-28', true]]) {
    // Controle blijft juist als GitHub de workflow pas een uur later start.
    const now = new Date(`${date}T14:15:00Z`);
    assert.equal(shouldRunFunnel('schedule', '45 11 * * *', now), summer);
    assert.equal(shouldRunFunnel('schedule', '45 12 * * *', now), !summer);
  }
});

test('Handmatig starten blijft mogelijk; andere events starten geen funnel', () => {
  assert.equal(shouldRunFunnel('workflow_dispatch', ''), true);
  assert.equal(shouldRunFunnel('push', ''), false);
  assert.throws(() => shouldRunFunnel('schedule', 'onbekend'), /Onbekende funnelplanning/);
});
