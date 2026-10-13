import { test, expect } from '@playwright/test';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
// Runtime modules are deliberately dependency-free JavaScript.
// @ts-expect-error validated through the public runtime tests
import { SessionStore } from '../../skills/seo-roast/lib/store.mjs';
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
    await expect(page.locator('.connection')).toContainText('подключено');
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
  await page.getByRole('button', { name: /Darren Shaw.*Открыть досье/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('.dossier-text')).toContainText('Knowledge and decision rules');
  await page.keyboard.press('Escape');
  await page.getByRole('tab', { name: /Доказательства/ }).click();
  await page.locator('.evidence-list button').first().click();
  await expect(page.getByRole('dialog')).toContainText('demo-pages');
  await page.getByRole('button', { name: 'Закрыть', exact: true }).click();
  await page.getByRole('tab', { name: /План действий/ }).click();
  await expect(page.locator('.action')).toHaveCount(4);
  await expect(page.locator('.verdict')).toContainText('TEST');
  const download = page.waitForEvent('download');
  await page.locator('a[title="Markdown"]').click();
  expect((await download).suggestedFilename()).toBe('demo-report.md');
  await page.getByRole('button', { name: 'Switch language' }).click();
  await expect(page.getByRole('tab', { name: /Action plan/ })).toBeVisible();
  expect(errors).toEqual([]);
});
test('new brief remains pending and provides a real Codex handoff', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Новый разбор/ }).click();
  await page.getByLabel('Название', { exact: true }).fill('UI canary — do not publish');
  await page
    .getByLabel('URL и вопрос совета')
    .fill('Review https://example.com service page strategy; this is a test.');
  await page.getByRole('button', { name: 'Собрать совет' }).click();
  await expect(page.locator('.codex-handoff')).toContainText('Use $seo-roast-room:seo-roast');
  await expect(page.locator('.room-indicator')).toContainText('Ждёт Codex');
  await expect(page.locator('.turn')).toHaveCount(0);
  await expect(page.locator('.codex-handoff')).toContainText('ui-sessions');
  await expect(page.locator('.codex-handoff')).toContainText('--sessions');
});
test('print includes the entire report even during a partial replay', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Проиграть спор' }).click();
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.app-shell')).toBeHidden();
  await expect(page.locator('.print-report')).toBeVisible();
  await expect(page.locator('.print-turn')).toHaveCount(24);
  await expect(page.locator('.print-action')).toHaveCount(4);
  await expect(page.locator('.print-evidence')).toHaveCount(6);
  await expect(page.locator('.print-report')).toContainText('не реальные высказывания');
});
test('demo replay remains labeled and reveals turns', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Проиграть спор' }).click();
  await expect(page.locator('.turn')).toHaveCount(0);
  await expect(page.locator('.turn')).toHaveCount(1, { timeout: 7000 });
  await page.getByRole('button', { name: 'Пауза', exact: true }).click();
  await expect(page.locator('.room-indicator')).toContainText('ДЕМО');
  await page.getByRole('button', { name: 'Показать всё' }).click();
  await expect(page.locator('.turn')).toHaveCount(24);
});
test('published council updates appear live without reloading the browser', async ({
  page,
  request,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Новый разбор/ }).click();
  await page.getByLabel('Название', { exact: true }).fill('Live update canary');
  await page.getByLabel('URL и вопрос совета').fill('Synthetic live publishing check.');
  await page.getByRole('button', { name: 'Совет · до 8', exact: true }).click();
  await page.getByRole('button', { name: 'Собрать совет' }).click();
  await expect(page.locator('.room-indicator')).toContainText('Ждёт Codex');
  const bootstrap = await (await request.get('/api/bootstrap')).json();
  const summary = bootstrap.sessions.find(
    (s: { title: string }) => s.title === 'Live update canary',
  );
  const store = await new SessionStore(bootstrap.sessionDirectory).init();
  const original = await store.read(summary.id);
  await store.replace({ ...original, status: 'running', stage: 'evidence' }, 0);
  await expect(page.locator('.room-indicator')).toContainText('Совет работает');
  const fixture = JSON.parse(
    await readFile(path.resolve('skills/seo-roast/examples/demo.json'), 'utf8'),
  );
  await store.replace({ ...fixture, id: summary.id, title: 'Live update canary', demo: false }, 1);
  await expect(page.locator('.room-indicator')).toContainText('Завершено');
  await expect(page.locator('.turn')).toHaveCount(24);
  await page.getByRole('tab', { name: /План действий/ }).click();
  await expect(page.locator('.action')).toHaveCount(4);
});
