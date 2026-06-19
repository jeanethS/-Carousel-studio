import sharp from 'sharp';
import { promises as fs } from 'fs';

export async function rasterizeSvgToPng(svg: string, outputPath: string): Promise<void> {
  await sharp(Buffer.from(svg))
    .png()
    .toFile(outputPath);
}