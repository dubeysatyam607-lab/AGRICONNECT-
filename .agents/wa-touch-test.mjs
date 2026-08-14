import { chromium } from 'playwright';

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
});
const page = await context.newPage();
await page.goto('http://localhost:5199/', { waitUntil: 'networkidle' });
await page.waitForSelector('a[aria-label^="Contact Agricultural Helpdesk"]', { timeout: 15000 });

const btn = page.locator('a[aria-label^="Contact Agricultural Helpdesk"]');
const box = await btn.boundingBox();
console.log('initial pos:', box.x, box.y);

// Simulate a touch drag
const cx = box.x + box.width / 2;
const cy = box.y + box.height / 2;
await page.touchscreen.tap(cx, cy);
await page.waitForTimeout(100);
await page.evaluate(([x, y]) => {
  const el = document.elementFromPoint(x, y);
  console.log('element under touch point:', el?.tagName, el?.className?.toString().slice(0, 60));
}, [cx, cy]);

// manual touch drag via dispatch events
const start = await page.evaluate(async ([x, y]) => {
  const el = document.elementFromPoint(x, y);
  if (!el) return 'no element';
  const pointerdown = new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId: 1, isPrimary: true, clientX: x, clientY: y, pointerType: 'touch' });
  el.dispatchEvent(pointerdown);
  return el.tagName;
}, [cx, cy]);
console.log('pointerdown target:', start);

for (let i = 1; i <= 8; i++) {
  await page.evaluate(([sx, sy, i]) => {
    const el = document.elementFromPoint(sx, sy);
    const ev = new PointerEvent('pointermove', { bubbles: true, cancelable: true, pointerId: 1, isPrimary: true, clientX: sx + i * 10, clientY: sy + i * 8, pointerType: 'touch' });
    el?.dispatchEvent(ev);
  }, [cx, cy, i]);
  await page.waitForTimeout(30);
}
await page.evaluate(async ([x, y]) => {
  const el = document.elementFromPoint(x, y);
  const ev = new PointerEvent('pointerup', { bubbles: true, cancelable: true, pointerId: 1, isPrimary: true, clientX: x + 80, clientY: y + 64, pointerType: 'touch' });
  el?.dispatchEvent(ev);
}, [cx, cy]);

await page.waitForTimeout(300);
const box2 = await btn.boundingBox();
console.log('after drag pos:', box2.x, box2.y);
console.log('moved:', Math.round(box2.x) !== Math.round(box.x) || Math.round(box2.y) !== Math.round(box.y));
const stored = await page.evaluate(() => localStorage.getItem('agri_whatsapp_pos'));
console.log('persisted:', stored);

await browser.close();
