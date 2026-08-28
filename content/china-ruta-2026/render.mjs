import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
await page.goto(`file://${path.join(dir, 'slides.html')}`);
await page.evaluate(() => document.fonts.ready);
const slides = page.locator('.slide');
for (let i = 0; i < 10; i++) await slides.nth(i).screenshot({ path: path.join(dir, `slide-${String(i + 1).padStart(2, '0')}.png`) });
await slides.nth(10).screenshot({ path: path.join(dir, 'story-background.png') });
await browser.close();
