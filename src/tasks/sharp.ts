/**
 * task:sharp — Sharp rasteriser standalone runner.
 * Reads tmp/sample.svg and writes tmp/sample.png.
 */
import * as fs from 'fs';
import * as path from 'path';
import { rasterizeSvgToPng } from '../render/sharp';

function logStage(jobId: string, stage: string, status: 'start' | 'ok' | 'error', extra: Record<string, any> = {}): void {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    jobId,
    stage,
    status,
    ...extra,
  }));
}

async function main() {
  const jobId = 'task-sharp';
  const tmpDir = path.join(process.cwd(), 'tmp');
  const inputPath = path.join(tmpDir, 'sample.svg');
  const outputPath = path.join(tmpDir, 'sample.png');

  logStage(jobId, 'sharp', 'start');

  if (!fs.existsSync(inputPath)) {
    console.error(`Input file not found: ${inputPath}`);
    console.error('Run task:satori first to generate tmp/sample.svg');
    logStage(jobId, 'sharp', 'error', { error: 'sample.svg not found' });
    process.exit(1);
  }

  try {
    const svg = fs.readFileSync(inputPath, 'utf8');
    await rasterizeSvgToPng(svg, outputPath);

    const stats = fs.statSync(outputPath);
    logStage(jobId, 'sharp', 'ok', { outputPath, sizeBytes: stats.size });
    console.log(`PNG written to ${outputPath} (${stats.size} bytes)`);
  } catch (err) {
    logStage(jobId, 'sharp', 'error', { error: String(err) });
    process.exit(1);
  }
}

main();
