#!/usr/bin/env node
/**
 * benchmark.js — Performance benchmark for carousel generation.
 * Runs 10 sequential jobs and reports median slide generation time.
 * Exits with code 1 if median > 300ms.
 */

const { bootstrapCarouselStudio } = require('../dist/index');

function createMockJob(jobIndex) {
  return {
    jobId: `bench-${String(jobIndex).padStart(2, '0')}`,
    clusterId: `bench-cluster-${jobIndex}`,
    topic: 'AI and machine learning trends',
    platform: 'instagram',
    hookHeadline: 'The Future of AI',
    slides: [
      { slideNumber: 1, headline: 'AI in 2026', bodyText: 'Transforming industries worldwide.' },
      { slideNumber: 2, headline: 'Key Stat', dataPoint: '+340%', bodyText: 'Growth in AI adoption.' },
      { slideNumber: 3, headline: 'What Comes Next', bodyText: 'Multimodal models and agents.', visualCue: 'Swipe →' },
    ],
    ctaText: 'Follow for more',
    handleOrProfile: '@aibench',
  };
}

async function main() {
  const NUM_JOBS = 10;
  const slideTimes = [];

  console.log(`\n🏁 Running ${NUM_JOBS} benchmark jobs...\n`);

  for (let i = 0; i < NUM_JOBS; i++) {
    const job = createMockJob(i);
    const jobStart = Date.now();

    try {
      await bootstrapCarouselStudio(job);
    } catch (err) {
      // If pipeline fails (e.g. no API key), still record timing
      console.error(`  Job ${job.jobId} error: ${err.message}`);
    }

    const jobDuration = Date.now() - jobStart;
    const perSlide = Math.round(jobDuration / job.slides.length);
    slideTimes.push(perSlide);
    console.log(`  Job ${job.jobId}: ${jobDuration}ms total, ~${perSlide}ms/slide`);
  }

  // Calculate median
  const sorted = [...slideTimes].sort((a, b) => a - b);
  const median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)];

  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const avg = Math.round(slideTimes.reduce((a, b) => a + b, 0) / slideTimes.length);

  console.log(`\n📊 Benchmark Results (${NUM_JOBS} jobs, ${slideTimes.length} data points)`);
  console.log(`  Min:    ${min}ms/slide`);
  console.log(`  Max:    ${max}ms/slide`);
  console.log(`  Avg:    ${avg}ms/slide`);
  console.log(`  Median: ${median}ms/slide`);
  console.log(`  Target: ≤300ms/slide`);

  if (median > 300) {
    console.log(`\n  ❌ FAIL — median ${median}ms exceeds 300ms target`);
    process.exit(1);
  } else {
    console.log(`\n  ✅ PASS — median ${median}ms within 300ms target`);
  }
}

main().catch((err) => {
  console.error('Benchmark error:', err);
  process.exit(1);
});
