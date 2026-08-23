import { execFile } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import yaml from 'yaml';
import { findBestPhotoForTopic } from './photos/matcher';
import { renderTemplateToSvg } from './render/satori';
import { rasterizeSvgToPng } from './render/sharp';
import { InstagramSlide } from './templates/instagram/slide';
import { LinkedInSlide } from './templates/linkedin/slide';
import { ReactNode } from 'react';
import { RoutedJobEventSchema, type CarouselSlide, type RoutedJobEvent } from './contracts/routed_job';
import { resolveConfigPath } from './config/resolveConfigPath';

// Types re-exported from the validated contract (single source of truth).
export type { CarouselSlide, RoutedJobEvent };

/**
 * Simple JSON logger for stages.
 */
function logStage(jobId: string, stage: string, status: 'start' | 'ok' | 'error', extra: Record<string, any> = {}): void {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    jobId,
    stage,
    status,
    ...extra,
  }));
}

/**
 * Computes a SHA-256 fingerprint of the job's slide content.
 */
function computeFingerprint(job: RoutedJobEvent): string {
  const hash = crypto.createHash('sha256');
  // Include topic and all slide fields that affect rendering
  hash.update(job.topic);
  for (const slide of job.slides) {
    hash.update(slide.slideNumber.toString());
    hash.update(slide.headline);
    hash.update(slide.bodyText ?? '');
    hash.update(slide.dataPoint ?? '');
    hash.update(slide.visualCue ?? '');
  }
  return hash.update(JSON.stringify(job)).digest('hex');
}

/**
 * Checks whether a given cluster+fingerprint pair is a duplicate.
 * Spawns `python path/to/dedup_service.py <clusterId> <fingerprint>` and
 * parses stdout for `{duplicate: boolean}`.
 *
 * @returns `true` when the job is NOT a duplicate (ok to proceed),
 *          `false` when it IS a duplicate (skip generation).
 */
export async function passesDeduplicationCheck(
  clusterId: string,
  fingerprint: string
): Promise<boolean> {
  return new Promise<boolean>((resolve, reject) => {
    execFile(
      'python',
      ['path/to/dedup_service.py', clusterId, fingerprint],
      (error, stdout) => {
        if (error) {
          reject(error);
          return;
        }

        let parsed: { duplicate: boolean };
        try {
          parsed = JSON.parse(stdout);
        } catch {
          reject(new Error(`Failed to parse dedup service output: ${stdout}`));
          return;
        }

        // Returns true (passes) when NOT a duplicate, false when IS a duplicate
        resolve(!parsed.duplicate);
      }
    );
  });
}

/**
 * Orchestrates the carousel generation pipeline for a single job.
 * Steps:
 *   1. Deduplication check
 *   2. Photo matching (Gemini Vision)
 *   3. Gradient fallback logic (if no matching photo)
 *   4. Slide rendering (Satori + Sharp)
 *   5. Output writing
 */
export async function bootstrapCarouselStudio(job: RoutedJobEvent): Promise<void> {
  // Validate at the boundary — reject malformed payloads before any I/O.
  const parsed = RoutedJobEventSchema.parse(job);

  const startTime = Date.now();
  logStage(parsed.jobId, 'dedup', 'start');

  const fingerprint = computeFingerprint(parsed);
  const isDuplicate = !(await passesDeduplicationCheck(parsed.clusterId, fingerprint));
  if (isDuplicate) {
    logStage(parsed.jobId, 'dedup', 'ok', { duplicate: true });
    // Exit early, no output generated
    return;
  }
  logStage(parsed.jobId, 'dedup', 'ok', { duplicate: false });

  logStage(parsed.jobId, 'matcher', 'start');
  let bestPhoto: string | null = null;
  try {
    bestPhoto = await findBestPhotoForTopic(parsed.topic);
  } catch (err) {
    // If matcher fails, treat as no photo and fallback to gradient
    // Log generic message to avoid leaking sensitive info (US-07)
    if (process.env.DEBUG) {
      console.error(`Matcher error: ${err}`);
    } else {
      console.error('Gemini request failed');
    }
    bestPhoto = null;
  }
  logStage(parsed.jobId, 'matcher', 'ok', { bestPhoto: bestPhoto ?? null });

  // Load platform-appropriate design tokens (style selectable via CAROUSEL_STYLE)
  const style = process.env.CAROUSEL_STYLE;
  const configPath = resolveConfigPath(parsed.platform, style);
  const configRaw = await fs.promises.readFile(configPath, 'utf8');
  const config = yaml.parse(configRaw) as any;

  const heroImageUrl = bestPhoto ?? undefined;
  const fallbackGradientIndex = heroImageUrl == null ? 0 : undefined; // use first gradient if no hero

  // Prepare output directory
  const outputDir = path.join(process.cwd(), 'output', `${parsed.platform}_${parsed.jobId}`);
  await fs.promises.mkdir(outputDir, { recursive: true });

  logStage(parsed.jobId, 'satori', 'start');
  logStage(parsed.jobId, 'sharp', 'start');

  // Process each slide sequentially (could be parallelized later)
  for (const slide of parsed.slides) {
    const slideElement =
      parsed.platform === 'instagram' ? (
        <InstagramSlide
          config={config}
          slide={slide}
          heroImageUrl={heroImageUrl}
          fallbackGradientIndex={fallbackGradientIndex}
          overlayGraphic={slide.overlayGraphic}
        />
      ) : (
        <LinkedInSlide config={config} slide={slide} />
      );

    const svg = await renderTemplateToSvg(
      slideElement,
      { width: config.slide.width, height: config.slide.height }
    );

    const outputPath = path.join(outputDir, `slide_${String(slide.slideNumber).padStart(2, '0')}.png`);
    await rasterizeSvgToPng(svg, outputPath);
  }

  logStage(parsed.jobId, 'sharp', 'ok');
  logStage(parsed.jobId, 'satori', 'ok');
  logStage(parsed.jobId, 'orchestrator', 'ok', { durationMs: Date.now() - startTime });
}