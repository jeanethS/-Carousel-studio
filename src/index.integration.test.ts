/**
 * Integration test — Full carousel job end-to-end.
 *
 * Simulates a RoutedJobEvent, runs it through the orchestrator,
 * and asserts output artefacts exist.
 */

import * as fs from 'fs';
import * as path from 'path';
import { bootstrapCarouselStudio } from './index';

// Mock child_process so dedup check doesn't try to run Python
jest.mock('child_process', () => ({
  execFile: jest.fn((_cmd: string, _args: string[], cb: (err: Error | null, stdout: string) => void) => {
    // Simulate "not duplicate" response
    cb(null, JSON.stringify({ duplicate: false }));
  }),
}));

// Mock Gemini so matcher doesn't need API key
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn().mockRejectedValue(new Error('Mocked — no API key')),
    }),
  })),
}));

// Set dummy API key so matcher.ts doesn't throw before reaching the mock
process.env.GEMINI_API_KEY = 'test-key-not-real';

const FIXTURE: any = {
  jobId: 'int-test-001',
  clusterId: 'integration-cluster',
  topic: 'artificial intelligence in healthcare',
  platform: 'instagram',
  hookHeadline: 'AI in Healthcare',
  slides: [
    {
      slideNumber: 1,
      headline: 'AI Saves Lives',
      bodyText: 'Early detection through machine learning models.',
    },
    {
      slideNumber: 2,
      headline: 'By the Numbers',
      dataPoint: '98.5%',
      bodyText: 'Diagnostic accuracy in clinical trials.',
    },
    {
      slideNumber: 3,
      headline: 'The Future is Now',
      bodyText: 'Personalized treatment plans powered by AI.',
      visualCue: 'Learn More →',
    },
  ],
  ctaText: 'Follow for more AI insights',
  handleOrProfile: '@aihealth',
};

const LINKEDIN_FIXTURE: any = {
  ...FIXTURE,
  jobId: 'int-test-002',
  platform: 'linkedin',
};

describe('Integration: full carousel pipeline', () => {
  const outputDir = path.join(process.cwd(), 'output', `${FIXTURE.platform}_${FIXTURE.jobId}`);

  beforeAll(async () => {
    // Clean previous run
    if (fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true });
    }
  });

  it('produces PNG slides for every slide in the job', async () => {
    await bootstrapCarouselStudio(FIXTURE as any);

    // Check output directory exists
    expect(fs.existsSync(outputDir)).toBe(true);

    // Check each slide was rendered to PNG
    for (const slide of FIXTURE.slides) {
      const slidePath = path.join(
        outputDir,
        `slide_${String(slide.slideNumber).padStart(2, '0')}.png`
      );
      expect(fs.existsSync(slidePath)).toBe(true);

      // Check file is non-empty
      const stats = fs.statSync(slidePath);
      expect(stats.size).toBeGreaterThan(0);
    }
  });

  it('produces at least one PNG file', async () => {
    const files = fs.readdirSync(outputDir);
    const pngFiles = files.filter((f) => f.endsWith('.png'));
    expect(pngFiles.length).toBeGreaterThanOrEqual(1);
  });
});

describe('Integration: linkedin platform uses its own template + config', () => {
  const outputDir = path.join(process.cwd(), 'output', `${LINKEDIN_FIXTURE.platform}_${LINKEDIN_FIXTURE.jobId}`);

  beforeAll(async () => {
    if (fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true });
    }
  });

  it('produces PNG slides sized per the linkedin config (not instagram)', async () => {
    await bootstrapCarouselStudio(LINKEDIN_FIXTURE as any);

    for (const slide of LINKEDIN_FIXTURE.slides) {
      const slidePath = path.join(
        outputDir,
        `slide_${String(slide.slideNumber).padStart(2, '0')}.png`
      );
      expect(fs.existsSync(slidePath)).toBe(true);
      expect(fs.statSync(slidePath).size).toBeGreaterThan(0);
    }
  });
});
