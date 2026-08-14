import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto('http://localhost:5199/', { waitUntil: 'networkidle' });
await page.waitForSelector('a[aria-label^="Contact Agricultural Helpdesk"]', { timeout: 15000 });

const btn = page.locator('a[aria-label^="Contact Agricultural Helpdesk"]');
const box = await btn.boundingBox();
console.log('initial pos:', box.x, box.y);

await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
await page.mouse.down();
await page.mouse.move(box.x + box.width / 2 + 100, box.y + box.height / 2 + 80, { steps: 10 });
await page.mouse.up();

await page.waitForTimeout(300);
const box2 = await btn.boundingBox();
console.log('after drag pos:', box2.x, box2.y);
console.log('moved:', Math.round(box2.x) !== Math.round(box.x) || Math.round(box2.y) !== Math.round(box.y));

// also check persisted position
const stored = await page.evaluate(() => localStorage.getItem('agri_whatsapp_pos'));
console.log('persisted:', stored);

await browser.close();
