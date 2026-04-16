const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/chromium' });
  const page = await browser.newPage();
  await page.goto('http://localhost:3000');
  console.log(await page.title());
  await browser.close();
})();
