/**
 * LinkedInSlide — Satori-compatible TSX component for LinkedIn carousel slides.
 *
 * Receives design tokens from config/li-design.yaml via the `config` prop
 * and slide-specific copy via `slide` prop.
 *
 * Renders JSX that Satori can convert to SVG for Sharp rasterisation.
 */

// ── Type definitions ──────────────────────────────────────────────────────────

export interface LinkedInDesignTokens {
  theme: {
    backgroundColor: string;
    accentColor: string;
    textColor: string;
    mutedTextColor: string;
  };
  overlayOpacity: number;
  fontFamily: string;
  typography: {
    headline: { fontSize: number; fontWeight: number; lineHeight: number; color: string };
    bodyText: { fontSize: number; fontWeight: number; lineHeight: number; color: string };
    dataPoint: { fontSize: number; fontWeight: number; lineHeight: number; color: string };
    visualCue: { fontSize: number; fontWeight: number; lineHeight: number; color: string };
    footer: { fontSize: number; fontWeight: number; color: string };
  };
  slide: {
    width: number;
    height: number;
    padding: number;
  };
}

export interface LinkedInSlideData {
  slideNumber: number;
  headline: string;
  bodyText?: string;
  dataPoint?: string;
  visualCue?: string;
}

export interface LinkedInSlideProps {
  /** Design tokens from config/li-design.yaml */
  config: LinkedInDesignTokens;
  /** Per-slide content */
  slide: LinkedInSlideData;
}

// ── Inline styles (Satori-compatible) ─────────────────────────────────────────

const containerBase: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  position: 'relative',
  overflow: 'hidden',
};

const contentBase: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  position: 'relative',
  zIndex: 1,
  height: '100%',
};

const footerBase: React.CSSProperties = {
  marginTop: 'auto',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

// ── Component ─────────────────────────────────────────────────────────────────

export function LinkedInSlide({
  config,
  slide,
}: LinkedInSlideProps) {
  const { theme, typography, slide: slideLayout, fontFamily } = config;
  const { headline, bodyText, dataPoint, visualCue, slideNumber } = slide;

  return (
    <div
      style={{
        ...containerBase,
        backgroundColor: theme.backgroundColor,
        width: slideLayout.width,
        height: slideLayout.height,
        fontFamily,
      }}
    >
      <div
        style={{
          ...contentBase,
          padding: slideLayout.padding,
          justifyContent: dataPoint ? 'flex-start' : 'center',
        }}
      >
        {/* Headline */}
        <div
          style={{
            color: typography.headline.color,
            fontSize: typography.headline.fontSize,
            fontWeight: typography.headline.fontWeight,
            lineHeight: typography.headline.lineHeight,
            marginBottom: bodyText || dataPoint ? 24 : 0,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {headline}
        </div>

        {/* Data point (large number / stat) */}
        {dataPoint && (
          <div
            style={{
              color: typography.dataPoint.color,
              fontSize: typography.dataPoint.fontSize,
              fontWeight: typography.dataPoint.fontWeight,
              lineHeight: typography.dataPoint.lineHeight,
              marginBottom: bodyText ? 16 : 0,
            }}
          >
            {dataPoint}
          </div>
        )}

        {/* Body text */}
        {bodyText && (
          <div
            style={{
              color: typography.bodyText.color,
              fontSize: typography.bodyText.fontSize,
              fontWeight: typography.bodyText.fontWeight,
              lineHeight: typography.bodyText.lineHeight,
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {bodyText}
          </div>
        )}

        {/* Visual cue + slide number footer */}
        {visualCue && (
          <div
            style={{
              ...footerBase,
              marginTop: 'auto',
            }}
          >
            <span
              style={{
                color: typography.visualCue.color,
                fontSize: typography.visualCue.fontSize,
                fontWeight: typography.visualCue.fontWeight,
                lineHeight: typography.visualCue.lineHeight,
              }}
            >
              {visualCue}
            </span>
            <span
              style={{
                color: typography.footer.color,
                fontSize: typography.footer.fontSize,
                fontWeight: typography.footer.fontWeight,
              }}
            >
              {slideNumber}
            </span>
          </div>
        )}

        {/* Slide number only (no visual cue) */}
        {!visualCue && (
          <div
            style={{
              ...footerBase,
              marginTop: 'auto',
            }}
          >
            <span />
            <span
              style={{
                color: typography.footer.color,
                fontSize: typography.footer.fontSize,
                fontWeight: typography.footer.fontWeight,
              }}
            >
              {slideNumber}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default LinkedInSlide;
