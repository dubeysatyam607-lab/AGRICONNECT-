const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const log = [];
  page.on('console', m => { if (m.type()==='error') log.push(`[CONSOLE] ${m.text().slice(0,160)}`); });
  page.on('response', r => { const u=r.url(); if(r.status()>=400 && !u.includes('vite') && !u.includes('fonts') && !u.includes('unsplash')) log.push(`[HTTP ${r.status()}] ${u.slice(0,130)}`); });
  page.on('requestfailed', r => { const u=r.url(); if(!u.includes('unsplash')) log.push(`[REQFAIL] ${u.slice(0,130)} ${r.failure()?.errorText}`); });
  await page.goto('http://localhost:5199/', { waitUntil:'networkidle', timeout:30000 });
  await page.waitForTimeout(2500);
  const nav = ['home','mandi','services','wallet','profile'];
  for (const id of nav){
    try { await page.click(`[aria-label="${id}"]`); await page.waitForTimeout(1800); } catch(e){ console.log('click fail', id, e.message.slice(0,60)); }
    const body = (await page.textContent('body')||'').slice(0,180).replace(/\s+/g,' ');
    console.log(`=== NAV ${id}: ${body.slice(0,170)}`);
  }
  // AI assistant button
  try { await page.click('nav [aria-label="ai"]'); await page.waitForTimeout(2500); } catch(e){}
  const body = (await page.textContent('body')||'').slice(0,300).replace(/\s+/g,' ');
  console.log('=== AI:', body.slice(0,280));
  console.log('=== ERRORS:'); log.slice(0,25).forEach(e=>console.log(e));
  await browser.close();
})().catch(e=>{console.error('FATAL', e.message); process.exit(1);});
