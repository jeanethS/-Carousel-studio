import { WriteStream } from 'fs';

/**
 * JSON-line logger for pipeline stages.
 * Emits one JSON object per line to stdout (or an optional file stream).
 */
export function logStage(
  jobId: string,
  stage: string,
  status: 'start' | 'ok' | 'error',
  extra: Record<string, any> = {},
  stream?: WriteStream
): void {
  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    jobId,
    stage,
    status,
    ...extra,
  });

  console.log(entry);
  if (stream) {
    stream.write(entry + '\n');
  }
}
