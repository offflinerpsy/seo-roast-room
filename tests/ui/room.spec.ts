import { test, expect } from '@playwright/test';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
// Runtime modules are deliberately dependency-free JavaScript.
// @ts-expect-error validated through the public runtime tests
import { SessionStore } from '../../skills/seo-roast/lib/store.mjs';
test('evidence moves with the real speaker; replay, challenges and reduced motion remain controllable', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('.round-ribbon')).toContainText('Darren Shaw has the floor');
  await page.getByRole('button', { name: 'Next turn', exact: true }).click();
  await expect(page.locator('.round-ribbon')).toContainText('Harry Sanders has the floor');
  await expect(page.locator('.evidence-card')).toContainText('Twelve service pages');
  await expect(page.locator('.is-speaking .portrait-wrap')).toHaveCSS('animation-name', 'speak');
  await page.locator('.evidence-card').click();
  await expect(page.getByRole('dialog')).toContainText('demo-pages');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Show all', exact: true }).click();
  await page.locator('.turn-text').nth(8).click();
  await expect(page.locator('.objection-stamp')).toContainText('CHALLENGED');
  await expect(page.locator('.round-ribbon')).toContainText('Cross-examination');
  await expect(page.locator('.is-speaking .expert-name')).toHaveText('Darren Shaw');
  await page.getByRole('button', { name: 'Motion on', exact: true }).click();
  await expect(page.locator('.is-speaking .portrait-wrap')).toHaveCSS('animation-name', 'none');
  await page.getByRole('button', { name: 'Restart demo', exact: true }).click();
  await expect(page.locator('.turn-counter')).toHaveText('1 / 24');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: 'Play debate', exact: true }).click();
  await expect(page.locator('.is-speaking .portrait-wrap')).toHaveCSS('animation-name', 'none');
  await expect(page.getByRole('button', { name: 'Motion off', exact: true })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(page.locator('.arena')).not.toHaveClass(/is-presenting/);
});
test('desktop and mobile show all portraits without overflow; sources, dossiers and export work', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await mkdir('.local/evidence', { recursive: true });
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    await expect(page.locator('.expert-seat')).toHaveCount(8);
    await expect(page.locator('.connection')).toContainText('connected');
    await page.evaluate(() =>
      Promise.all([...document.images].map((i) => i.decode().catch(() => {}))),
    );
    const geometry = await page.evaluate(() => ({
      viewport: innerWidth,
      width: document.documentElement.scrollWidth,
      portraits: [...document.querySelectorAll<HTMLImageElement>('.portrait-wrap img')].map(
        (i) => ({
          loaded: i.complete && i.naturalWidth > 0,
          visible: i.getBoundingClientRect().width > 0,
          left: i.getBoundingClientRect().left,
          right: i.getBoundingClientRect().right,
        }),
      ),
    }));
    expect(geometry.width).toBeLessThanOrEqual(geometry.viewport);
    expect(
      geometry.portraits.every((p) => p.loaded && p.visible && p.left >= 0 && p.right <= width),
    ).toBeTruthy();
    await page.screenshot({ path: `.local/evidence/room-${width}.png`, fullPage: false });
  }
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.getByRole('button', { name: /Darren Shaw.*Open dossier/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('.dossier-text')).toContainText('Knowledge and decision rules');
  await page.keyboard.press('Escape');
  await page.getByRole('tab', { name: /Evidence/ }).click();
  await page.locator('.evidence-list button').first().click();
  await expect(page.getByRole('dialog')).toContainText('demo-pages');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('tab', { name: /Action plan/ }).click();
  await expect(page.locator('.action')).toHaveCount(4);
  await expect(page.locator('.verdict')).toContainText('TEST');
  const download = page.waitForEvent('download');
  await page.locator('a[title="Markdown"]').click();
  expect((await download).suggestedFilename()).toBe('demo-report.md');
  await expect(page.getByRole('tab', { name: /Action plan/ })).toBeVisible();
  expect(errors).toEqual([]);
});
test('new brief remains pending and provides a real Codex handoff', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('roast-language', 'ru'));
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.getByRole('button', { name: /New roast/ }).click();
  await page.getByLabel('Title', { exact: true }).fill('UI canary — do not publish');
  await page.getByLabel(/Response language/).fill('Spanish');
  await page
    .getByLabel('URL and council question')
    .fill('Review https://example.com service page strategy; this is a test.');
  await page.getByRole('button', { name: 'Convene the council' }).click();
  await expect(page.locator('.codex-handoff')).toContainText('Use $seo-roast-room:seo-roast');
  await expect(page.locator('.room-indicator')).toContainText('WAITING FOR CODEX');
  await expect(page.locator('.turn')).toHaveCount(0);
  await expect(page.locator('.codex-handoff')).toContainText('ui-sessions');
  await expect(page.locator('.codex-handoff')).toContainText('--sessions');
  await expect(page.locator('.codex-handoff')).toContainText('Spanish');
  const bootstrap = await (await page.request.get('/api/bootstrap')).json();
  const summary = bootstrap.sessions.find(
    (s: { title: string }) => s.title === 'UI canary — do not publish',
  );
  const saved = await (await page.request.get(`/api/sessions/${summary.id}`)).json();
  expect(saved.language).toBe('Spanish');
  await expect(page.locator('.arena')).not.toHaveClass(/is-presenting/);
});
test('print includes the entire report even during a partial replay', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Play debate' }).click();
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.app-shell')).toBeHidden();
  await expect(page.locator('.print-report')).toBeVisible();
  await expect(page.locator('.print-turn')).toHaveCount(24);
  await expect(page.locator('.print-action')).toHaveCount(4);
  await expect(page.locator('.print-evidence')).toHaveCount(6);
  await expect(page.locator('.print-report')).toContainText('not actual statements');
});
test('demo replay remains labeled and reveals turns', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Play debate' }).click();
  await expect(page.locator('.turn')).toHaveCount(1);
  await expect(page.locator('.turn')).toHaveCount(2, { timeout: 7000 });
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(page.locator('.room-indicator')).toContainText('DEMO');
  await page.getByRole('button', { name: 'Show all' }).click();
  await expect(page.locator('.turn')).toHaveCount(24);
});
test('published council updates appear live without reloading the browser', async ({
  page,
  request,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /New roast/ }).click();
  await page.getByLabel('Title', { exact: true }).fill('Live update canary');
  await page.getByLabel('URL and council question').fill('Synthetic live publishing check.');
  await page.getByRole('button', { name: 'Council · up to 8', exact: true }).click();
  await page.getByRole('button', { name: 'Convene the council' }).click();
  await expect(page.locator('.room-indicator')).toContainText('WAITING FOR CODEX');
  const bootstrap = await (await request.get('/api/bootstrap')).json();
  const summary = bootstrap.sessions.find(
    (s: { title: string }) => s.title === 'Live update canary',
  );
  const store = await new SessionStore(bootstrap.sessionDirectory).init();
  const original = await store.read(summary.id);
  await store.replace({ ...original, status: 'running', stage: 'evidence' }, 0);
  await expect(page.locator('.room-indicator')).toContainText('COUNCIL IN SESSION');
  const fixture = JSON.parse(
    await readFile(path.resolve('skills/seo-roast/examples/demo.json'), 'utf8'),
  );
  fixture.language = 'Spanish';
  fixture.turns[23].text = 'Probemos una mejora reversible y verifiquemos cada solicitud.';
  await store.replace({ ...fixture, id: summary.id, title: 'Live update canary', demo: false }, 1);
  await expect(page.locator('.room-indicator')).toContainText('CASE CLOSED');
  await expect(page.locator('.turn')).toHaveCount(24);
  await expect(page.locator('.round-ribbon')).toContainText('Dan Davies has the floor');
  await expect(page.locator('.spotlight-text')).toHaveText(fixture.turns[23].text);
  const report = await (await request.get(`/api/sessions/${summary.id}/report.md`)).text();
  expect(report).toContain(fixture.turns[23].text);
  await page.getByRole('tab', { name: /Action plan/ }).click();
  await expect(page.locator('.action')).toHaveCount(4);
});
