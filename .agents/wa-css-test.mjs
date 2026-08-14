import { chromium } from 'playwright';

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const page = await context.newPage();
await page.goto('http://localhost:5199/', { waitUntil: 'networkidle' });
await page.waitForSelector('a[aria-label^="Contact Agricultural Helpdesk"]', { timeout: 15000 });
const styles = await page.evaluate(() => {
  const el = document.querySelector('a[aria-label^="Contact Agricultural Helpdesk"]');
  const cs = getComputedStyle(el);
  return {
    touchAction: cs.touchAction,
    userSelect: cs.userSelect,
    position: cs.position,
    cursor: cs.cursor,
    zIndex: cs.zIndex,
  };
});
console.log(styles);
await browser.close();
