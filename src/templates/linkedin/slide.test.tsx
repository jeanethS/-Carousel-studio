/**
 * LinkedInSlide — Unit tests with snapshot.
 */

import { renderToString } from 'react-dom/server';
import { LinkedInSlide } from './slide';
import type { LinkedInDesignTokens, LinkedInSlideData } from './slide';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const sampleConfig: LinkedInDesignTokens = {
  theme: {
    backgroundColor: '#ffffff',
    accentColor: '#0a66c2',
    textColor: '#1d2226',
    mutedTextColor: '#666666',
  },
  overlayOpacity: 0,
  fontFamily: 'Segoe UI, system-ui, -apple-system, sans-serif',
  typography: {
    headline: { fontSize: 48, fontWeight: 700, lineHeight: 1.2, color: '#1d2226' },
    bodyText: { fontSize: 24, fontWeight: 400, lineHeight: 1.5, color: '#666666' },
    dataPoint: { fontSize: 64, fontWeight: 800, lineHeight: 1.1, color: '#0a66c2' },
    visualCue: { fontSize: 20, fontWeight: 600, lineHeight: 1.3, color: '#0a66c2' },
    footer: { fontSize: 16, fontWeight: 400, color: '#666666' },
  },
  slide: {
    width: 1200,
    height: 627,
    padding: 48,
  },
};

const sampleSlide: LinkedInSlideData = {
  slideNumber: 1,
  headline: 'Scaling AI in 2026',
  bodyText: 'How leading companies are deploying machine learning at scale.',
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('LinkedInSlide', () => {
  it('renders with required props (headline only)', () => {
    const html = renderToString(
      <LinkedInSlide config={sampleConfig} slide={sampleSlide} />
    );
    expect(html).toContain('Scaling AI in 2026');
    expect(html).toContain('1200');
    expect(html).toMatchSnapshot('headline-only');
  });

  it('renders with headline + bodyText', () => {
    const html = renderToString(
      <LinkedInSlide
        config={sampleConfig}
        slide={{
          ...sampleSlide,
          bodyText: 'Secondary copy that supports the headline.',
        }}
      />
    );
    expect(html).toContain('Secondary copy');
    expect(html).toMatchSnapshot('headline-body');
  });

  it('renders with all optional fields', () => {
    const slide: LinkedInSlideData = {
      slideNumber: 3,
      headline: 'Revenue Growth',
      bodyText: 'Quarter-over-quarter performance exceeded expectations.',
      dataPoint: '+247%',
      visualCue: 'Read More →',
    };
    const html = renderToString(<LinkedInSlide config={sampleConfig} slide={slide} />);
    expect(html).toContain('+247%');
    expect(html).toContain('Read More →');
    expect(html).toContain('3');
    expect(html).toMatchSnapshot('all-fields');
  });

  it('renders data point without body text', () => {
    const slide: LinkedInSlideData = {
      slideNumber: 2,
      headline: 'Key Metric',
      dataPoint: '99.9%',
    };
    const html = renderToString(<LinkedInSlide config={sampleConfig} slide={slide} />);
    expect(html).toContain('99.9%');
    expect(html).toMatchSnapshot('data-point-only');
  });

  it('renders visual cue with slide number', () => {
    const slide: LinkedInSlideData = {
      slideNumber: 5,
      headline: 'Final Slide',
      visualCue: 'Learn More',
    };
    const html = renderToString(<LinkedInSlide config={sampleConfig} slide={slide} />);
    expect(html).toContain('Learn More');
    expect(html).toContain('5');
    expect(html).toMatchSnapshot('visual-cue');
  });

  it('renders with correct LinkedIn dimensions (1200x627)', () => {
    const html = renderToString(
      <LinkedInSlide config={sampleConfig} slide={sampleSlide} />
    );
    expect(html).toContain('1200');
    expect(html).toContain('627');
    expect(html).toMatchSnapshot('dimensions');
  });
});
