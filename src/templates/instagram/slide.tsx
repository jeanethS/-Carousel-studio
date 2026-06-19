/**
 * InstagramSlide — Satori-compatible TSX component for Instagram carousel slides.
 *
 * Receives design tokens from config/ig-design.yaml via the `config` prop
 * and slide-specific copy via `slide` prop.
 *
 * Renders JSX that Satori can convert to SVG for Sharp rasterisation.
 */

// ── Type definitions ──────────────────────────────────────────────────────────

export interface InstagramDesignTokens {
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

export interface InstagramSlideData {
  slideNumber: number;
  headline: string;
  bodyText?: string;
  dataPoint?: string;
  visualCue?: string;
}

export interface InstagramSlideProps {
  /** Design tokens from config/ig-design.yaml */
  config: InstagramDesignTokens;
  /** Per-slide content */
  slide: InstagramSlideData;
  /** Optional hero image URL (fallback to gradient from config) */
  heroImageUrl?: string;
  /** Index of the fallback gradient to use when no heroImageUrl is provided */
  fallbackGradientIndex?: number;
}

// ── Inline styles (used directly in Satori-compatible JSX) ────────────────────

const containerBase: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  position: 'relative',
  overflow: 'hidden',
};

const overlayBase: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
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

export function InstagramSlide({
  config,
  slide,
  heroImageUrl,
  fallbackGradientIndex = 0,
}: InstagramSlideProps) {
  const { theme, typography, slide: slideLayout, overlayOpacity, fontFamily } = config;
  const { headline, bodyText, dataPoint, visualCue } = slide;

  // Pick fallback gradient if no hero image
  const backgroundStyle: React.CSSProperties = heroImageUrl
    ? {
        backgroundImage: `url(${heroImageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : {
        // Use gradient from fallbackGradients; we'll pass it from the config
        backgroundColor: theme.backgroundColor,
      };

  // Overlay for image legibility
  const overlay: React.CSSProperties = {
    ...overlayBase,
    backgroundColor: heroImageUrl
      ? `rgba(0, 0, 0, ${overlayOpacity})`
      : 'transparent',
  };

  return (
    <div
      style={{
        ...containerBase,
        ...backgroundStyle,
        width: slideLayout.width,
        height: slideLayout.height,
        fontFamily,
      }}
    >
      {/* Gradient or image overlay */}
      {heroImageUrl && <div style={overlay} />}

      {/* Content area */}
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
            // Truncate to 3 lines max via Satori's lineClamp
            display: '-webkit-box',
            WebkitLineClamp: 3,
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
              WebkitLineClamp: 4,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {bodyText}
          </div>
        )}

        {/* Visual cue (e.g. "Swipe →") */}
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
              {slide.slideNumber}
            </span>
          </div>
        )}

        {/* Slide number always visible */}
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
              {slide.slideNumber}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default InstagramSlide;
