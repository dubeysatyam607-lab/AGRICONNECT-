import { chromium } from 'playwright';

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const page = await context.newPage();
await page.goto('http://localhost:5199/', { waitUntil: 'networkidle' });
await page.waitForSelector('a[aria-label^="Contact Agricultural Helpdesk"]', { timeout: 15000 });

const result = await page.evaluate(() => {
  const btn = document.querySelector('a[aria-label^="Contact Agricultural Helpdesk"]');
  const r = btn.getBoundingClientRect();
  const cx = r.x + r.width / 2, cy = r.y + r.height / 2;
  const top = document.elementFromPoint(cx, cy);
  const all = document.elementsFromPoint(cx, cy).map(el => `${el.tagName}.${(el.className || '').toString().slice(0, 40)}`).slice(0, 5);
  return { top: `${top?.tagName}.${(top?.className || '').toString().slice(0, 40)}`, stack: all, btnIsTop: top === btn };
});
console.log(result);
await browser.close();