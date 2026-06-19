#!/usr/bin/env node
/**
 * watch.js — Real-time progress bar for carousel jobs.
 *
 * Usage: node src/utils/watch.js <jobId>
 * Tails logs/<jobId>.jsonl and displays a live progress bar.
 */

const fs = require('fs');
const readline = require('readline');
const path = require('path');

const jobId = process.argv[2];
if (!jobId) {
  console.error('Usage: node src/utils/watch.js <jobId>');
  process.exit(1);
}

const logDir = path.join(process.cwd(), 'logs');
const logPath = path.join(logDir, `${jobId}.jsonl`);

// Ensure log directory exists
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const stages = ['dedup', 'matcher', 'satori', 'sharp', 'orchestrator'];
const completed = new Set();

// Create file if it doesn't exist yet (so we can watch it grow)
if (!fs.existsSync(logPath)) {
  fs.writeFileSync(logPath, '');
}

const stream = fs.createReadStream(logPath, { encoding: 'utf8' });
const rl = readline.createInterface({
  input: stream,
  crlfDelay: Infinity,
});

rl.on('line', (line) => {
  if (!line.trim()) return;
  try {
    const obj = JSON.parse(line);
    if (obj.jobId !== jobId) return;
    if (obj.status === 'ok') completed.add(obj.stage);
    const progress = stages.map((s) => (completed.has(s) ? '✔' : '…')).join(' ');
    process.stdout.write(`\r[${progress}] ${obj.stage.toUpperCase()} ${obj.status}   `);
  } catch (_) {
    // skip non-JSON lines
  }
});

rl.on('close', () => {
  console.log('\n[Finished]');
});

// Also watch for new file content (tail -f behavior)
fs.watchFile(logPath, { interval: 500 }, (curr, prev) => {
  if (curr.size > prev.size) {
    const newStream = fs.createReadStream(logPath, {
      encoding: 'utf8',
      start: prev.size,
    });
    const newRl = readline.createInterface({
      input: newStream,
      crlfDelay: Infinity,
    });
    newRl.on('line', (line) => {
      if (!line.trim()) return;
      try {
        const obj = JSON.parse(line);
        if (obj.jobId !== jobId) return;
        if (obj.status === 'ok') completed.add(obj.stage);
        const progress = stages.map((s) => (completed.has(s) ? '✔' : '…')).join(' ');
        process.stdout.write(`\r[${progress}] ${obj.stage.toUpperCase()} ${obj.status}   `);
      } catch (_) {}
    });
  }
});

// Keep process alive
process.on('SIGINT', () => {
  fs.unwatchFile(logPath);
  console.log('\n[Watching stopped]');
  process.exit(0);
});
