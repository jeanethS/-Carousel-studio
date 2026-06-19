import { ReactNode } from 'react';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Satori is optional — falls back to placeholder if not installed
let satori: ((element: ReactNode, options: any) => Promise<string>) | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  satori = require('satori').default || require('satori');
} catch {
  // satori not available, use placeholder
}

export async function renderTemplateToSvg(
  element: ReactNode,
  dimensions: { width: number; height: number }
): Promise<string> {
  if (satori) {
    const fontDir = join(process.cwd(), 'assets', 'fonts');
    const regularPath = join(fontDir, 'Inter-Regular.ttf');
    const boldPath = join(fontDir, 'Inter-Bold.ttf');

    const fonts: Array<{ name: string; data: Buffer; weight: number; style: string }> = [];

    if (existsSync(regularPath)) {
      fonts.push({ name: 'Inter', data: readFileSync(regularPath), weight: 400, style: 'normal' });
    }
    if (existsSync(boldPath)) {
      fonts.push({ name: 'Inter', data: readFileSync(boldPath), weight: 700, style: 'normal' });
    }

    if (fonts.length > 0) {
      try {
        const svg = await satori(element, {
          width: dimensions.width,
          height: dimensions.height,
          fonts,
        });
        return svg;
      } catch (err) {
        console.error('Satori rendering failed, falling back to placeholder:', err);
      }
    }
  }

  // Placeholder fallback
  return `<svg width="${dimensions.width}" height="${dimensions.height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#eee" />
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="20" fill="#000">Satori Placeholder</text>
  </svg>`;
}
