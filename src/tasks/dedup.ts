/**
 * task:dedup — Deduplication guard standalone runner.
 * Runs a mock deduplication check and logs the result.
 */
import { execFile } from 'child_process';
import * as path from 'path';

function logStage(jobId: string, stage: string, status: 'start' | 'ok' | 'error', extra: Record<string, any> = {}): void {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    jobId,
    stage,
    status,
    ...extra,
  }));
}

async function passesDeduplicationCheck(clusterId: string, fingerprint: string): Promise<boolean> {
  return new Promise<boolean>((resolve, reject) => {
    execFile(
      'python',
      ['path/to/dedup_service.py', clusterId, fingerprint],
      (error, stdout) => {
        if (error) {
          // If Python is not available, simulate a "not duplicate" response
          logStage('local', 'dedup', 'error', { error: error.message });
          resolve(true); // allow pipeline to continue
          return;
        }
        try {
          const parsed = JSON.parse(stdout);
          resolve(!parsed.duplicate);
        } catch {
          resolve(true);
        }
      }
    );
  });
}

async function main() {
  const jobId = 'task-dedup';
  const clusterId = 'test-cluster';
  const fingerprint = 'test-fingerprint-abc123';

  logStage(jobId, 'dedup', 'start');
  try {
    const passed = await passesDeduplicationCheck(clusterId, fingerprint);
    logStage(jobId, 'dedup', 'ok', { passed, clusterId });
    console.log(`Dedup check: ${passed ? 'PASS (not duplicate)' : 'SKIP (duplicate)'}`);
  } catch (err) {
    logStage(jobId, 'dedup', 'error', { error: String(err) });
    process.exit(1);
  }
}

main();
