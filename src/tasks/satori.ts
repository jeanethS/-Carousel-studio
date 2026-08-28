/**
 * task:satori — Satori renderer standalone runner.
 * Renders a sample JSX element to SVG and writes output/sample.svg.
 */
import * as fs from 'fs';
import * as path from 'path';
import { renderTemplateToSvg } from '../render/satori';
import { outputDir } from '../utils/paths';

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
  const jobId = 'task-satori';

  logStage(jobId, 'satori', 'start');

  // Create a simple JSX element (plain object that Satori can render)
  const sampleElement = {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        width: '100%',
        height: '100%',
        backgroundColor: '#1a1a2e',
        alignItems: 'center',
        justifyContent: 'center',
      },
      children: {
        type: 'span',
        props: {
          style: { color: '#ffffff', fontSize: 48 },
          children: 'Hello Carousel',
        },
      },
    },
  };

  try {
    const svg = await renderTemplateToSvg(sampleElement as any, { width: 1200, height: 1200 });

    const outDir = outputDir();
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    const outputPath = path.join(outDir, 'sample.svg');
    fs.writeFileSync(outputPath, svg, 'utf8');

    logStage(jobId, 'satori', 'ok', { outputPath, svgLength: svg.length });
    console.log(`SVG written to ${outputPath} (${svg.length} bytes)`);
  } catch (err) {
    logStage(jobId, 'satori', 'error', { error: String(err) });
    process.exit(1);
  }
}

main();
