import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dir = path.dirname(fileURLToPath(import.meta.url));

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 2 });

  const htmlPath = path.join(__dir, 'slides.html').replace(/\\/g, '/');
  await page.goto('file:///' + htmlPath);
  await page.waitForLoadState('networkidle');

  await page.pdf({ path: path.join(__dir, 'carousel.pdf'), width: '1080px', height: '1350px', printBackground: true });

  await browser.close();
  console.log('PDF rendered: carousel.pdf');
})();
