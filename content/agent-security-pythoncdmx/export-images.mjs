import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.join(__dir, 'slides-png');

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 2 });

  const htmlPath = path.join(__dir, 'slides.html').replace(/\\/g, '/');
  await page.goto('file:///' + htmlPath);
  await page.waitForLoadState('networkidle');

  const slideLocators = await page.locator('.slide').all();
  const slideCount = slideLocators.length;

  for (let i = 0; i < slideCount; i++) {
    const slideLocator = slideLocators[i];
    const slideNumber = String(i + 1).padStart(2, '0');
    const filename = `slide-${slideNumber}.png`;
    const filepath = path.join(outputDir, filename);

    await slideLocator.screenshot({ path: filepath });
    console.log(`Exported: ${filename}`);
  }

  await browser.close();
  console.log(`All ${slideCount} slides exported to slides-png/`);
})();
