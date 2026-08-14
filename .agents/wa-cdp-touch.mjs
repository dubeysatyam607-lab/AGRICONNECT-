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
console.log('initial pos:', Math.round(box.x), Math.round(box.y));

const cx = Math.round(box.x + box.width / 2);
const cy = Math.round(box.y + box.height / 2);
const cdp = await context.newCDPSession(page);

// Real touch sequence through the browser gesture pipeline
await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx, y: cy, id: 1 }] });
for (let i = 1; i <= 12; i++) {
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: cx + i * 8, y: cy + i * 6, id: 1 }],
  });
  await page.waitForTimeout(20);
}
await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
await page.waitForTimeout(300);

const box2 = await btn.boundingBox();
console.log('after drag pos:', Math.round(box2.x), Math.round(box2.y));
console.log('moved:', Math.abs(box2.x - box.x) > 5 || Math.abs(box2.y - box.y) > 5);
const stored = await page.evaluate(() => localStorage.getItem('agri_whatsapp_pos'));
console.log('persisted:', stored);

await browser.close();