/**
 * task:matcher — Gemini Vision Matcher standalone runner.
 * Runs findBestPhotoForTopic against the watched_uploads directory.
 */
import { findBestPhotoForTopic } from '../photos/matcher';

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
  const jobId = 'task-matcher';

  logStage(jobId, 'matcher', 'start');
  try {
    const bestPhoto = await findBestPhotoForTopic('technology and innovation');
    logStage(jobId, 'matcher', 'ok', { bestPhoto: bestPhoto ?? null });
    console.log(`Best photo: ${bestPhoto ?? 'none found (will use gradient fallback)'}`);
  } catch (err) {
    logStage(jobId, 'matcher', 'error', { error: 'Gemini request failed' });
    // Don't exit with error — matcher failure triggers gradient fallback
    console.log('Matcher unavailable, will use gradient fallback');
  }
}

main();
