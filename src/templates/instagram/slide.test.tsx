/**
 * InstagramSlide — Unit tests with snapshot.
 *
 * We render the component with sample config + slide data, produce an
 * HTML string, and compare it to a stored snapshot. This mirrors how
 * Satori consumes the component (JSX → string → SVG).
 */

import { renderToString } from 'react-dom/server';
import { InstagramSlide } from './slide';
import type { InstagramDesignTokens, InstagramSlideData } from './slide';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const sampleConfig: InstagramDesignTokens = {
  theme: {
    backgroundColor: '#1a1a2e',
    accentColor: '#e94560',
    textColor: '#ffffff',
    mutedTextColor: '#b0b0c0',
  },
  overlayOpacity: 0.35,
  fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
  typography: {
    headline: { fontSize: 64, fontWeight: 700, lineHeight: 1.2, color: '#ffffff' },
    bodyText: { fontSize: 32, fontWeight: 400, lineHeight: 1.5, color: '#b0b0c0' },
    dataPoint: { fontSize: 80, fontWeight: 800, lineHeight: 1.1, color: '#e94560' },
    visualCue: { fontSize: 24, fontWeight: 600, lineHeight: 1.3, color: '#e94560' },
    footer: { fontSize: 20, fontWeight: 400, color: '#666680' },
  },
  slide: {
    width: 1200,
    height: 1200,
    padding: 48,
  },
};

const sampleSlide: InstagramSlideData = {
  slideNumber: 1,
  headline: 'AI-Driven Growth in 2026',
  bodyText: 'How machine learning is reshaping the marketing landscape for startups and enterprises alike.',
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('InstagramSlide', () => {
  it('renders with required props (headline only)', () => {
    const html = renderToString(
      <InstagramSlide config={sampleConfig} slide={sampleSlide} />
    );
    expect(html).toContain('AI-Driven Growth in 2026');
    expect(html).toContain('1200'); // slide width
    expect(html).toMatchSnapshot('headline-only');
  });

  it('renders with headline + bodyText', () => {
    const html = renderToString(
      <InstagramSlide
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
    const slide: InstagramSlideData = {
      slideNumber: 3,
      headline: 'Revenue Growth',
      bodyText: 'Quarter-over-quarter performance exceeded expectations.',
      dataPoint: '+247%',
      visualCue: 'Swipe →',
    };
    const html = renderToString(<InstagramSlide config={sampleConfig} slide={slide} />);
    expect(html).toContain('+247%');
    expect(html).toContain('Swipe →');
    expect(html).toContain('3'); // slide number
    expect(html).toMatchSnapshot('all-fields');
  });

  it('renders with hero image URL', () => {
    const html = renderToString(
      <InstagramSlide
        config={sampleConfig}
        slide={sampleSlide}
        heroImageUrl="https://example.com/hero.jpg"
      />
    );
    expect(html).toContain('hero.jpg');
    expect(html).toMatchSnapshot('with-hero-image');
  });

  it('renders data point without body text', () => {
    const slide: InstagramSlideData = {
      slideNumber: 2,
      headline: 'Key Metric',
      dataPoint: '99.9%',
    };
    const html = renderToString(<InstagramSlide config={sampleConfig} slide={slide} />);
    expect(html).toContain('99.9%');
    expect(html).toMatchSnapshot('data-point-only');
  });

  it('renders visual cue with slide number', () => {
    const slide: InstagramSlideData = {
      slideNumber: 5,
      headline: 'Final Slide',
      visualCue: 'Learn More',
    };
    const html = renderToString(<InstagramSlide config={sampleConfig} slide={slide} />);
    expect(html).toContain('Learn More');
    expect(html).toContain('5');
    expect(html).toMatchSnapshot('visual-cue');
  });

  it('renders with fallback gradient (no hero image)', () => {
    // No heroImageUrl = gradient fallback path (backgroundStyle uses theme.backgroundColor)
    const html = renderToString(
      <InstagramSlide config={sampleConfig} slide={sampleSlide} />
    );
    expect(html).toContain('#1a1a2e');
    expect(html).toMatchSnapshot('gradient-fallback');
  });

  it('renders full-bleed overlay graphic when no positioning provided', () => {
    const html = renderToString(
      <InstagramSlide
        config={sampleConfig}
        slide={sampleSlide}
        overlayGraphic={{ url: 'https://example.com/overlay.png' }}
      />
    );
    expect(html).toContain('overlay.png');
    expect(html).toMatchSnapshot('overlay-graphic-full-bleed');
  });

  it('renders positioned overlay graphic when x/y/width/height provided', () => {
    const html = renderToString(
      <InstagramSlide
        config={sampleConfig}
        slide={sampleSlide}
        overlayGraphic={{
          url: 'https://example.com/badge.png',
          x: 100,
          y: 200,
          width: 300,
          height: 150,
          opacity: 0.8,
        }}
      />
    );
    expect(html).toContain('badge.png');
    expect(html).toMatchSnapshot('overlay-graphic-positioned');
  });

  it('renders without overlay graphic layer when prop is absent', () => {
    const html = renderToString(
      <InstagramSlide config={sampleConfig} slide={sampleSlide} />
    );
    expect(html).not.toContain('overlay.png');
    expect(html).not.toContain('badge.png');
    expect(html).toMatchSnapshot('no-overlay-graphic');
  });
});
