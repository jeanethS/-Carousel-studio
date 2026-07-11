---
name: linkedin-carousel-html
description: >-
  Use when building a one-off LinkedIn document-post carousel by hand-coding
  HTML/CSS slides and rendering them to PDF + PNG with Playwright. This is
  the lightweight, design-token-driven path for hand-crafted carousels (a
  founder story, a hackathon recap, a single campaign) — distinct from this
  repo's automated Satori/Sharp pipeline (src/render, src/tasks), which is
  for programmatic, high-volume generation from routed_job events. Trigger
  on: "LinkedIn carousel", "document post", "slide deck for LinkedIn",
  "swipe post", or requests to turn a draft/story into carousel slides.
---

# LinkedIn Carousel (HTML + Playwright)

Builds a swipeable LinkedIn carousel as one HTML file with N `.slide` sections,
rendered to a single multi-page PDF (the actual upload artifact) and to
individual PNGs (for review, Instagram reuse, or single-slide sharing).

**Not this skill if:** the task is high-volume/automated carousel generation
from a `routed_job` event — that's this repo's Satori/Sharp pipeline
(`src/render/satori.ts`, `src/render/sharp.ts`, `src/tasks/*`). This skill is
for a human sitting down to make *one* specific carousel by hand.

## Why LinkedIn carousels are PDFs

LinkedIn's "document post" feature renders each PDF page as one swipeable
slide. There is no native multi-image carousel format — a PDF is the only
way to get the swipe UI. Build slides at **1080×1350** (4:5 portrait, the
format that fills the most feed space on mobile), one PDF page per slide.

## Workflow

1. **Gather inputs first.** Photos (if any), the design-token palette (if the
   user gives one), and the copy/story. Don't start on slide 1 until you have
   the full narrative arc — carousels read as a sequence, and slide order
   changes cascade (see "Lessons learned" below).
2. **Prep photos before referencing them in HTML.** Raw camera JPGs are
   often 15–25MB. Resize to ~1600px wide and re-encode at ~82% JPEG quality
   before use — keeps the final PDF in single-digit MB without visible
   quality loss at 1080px slide width. PowerShell one-liner:
   ```powershell
   Add-Type -AssemblyName System.Drawing
   Get-ChildItem "img\*.jpg" | Where-Object {$_.Length -gt 2MB} | ForEach-Object {
     $img=[System.Drawing.Image]::FromFile($_.FullName); $w=1600
     $h=[int]($img.Height*($w/$img.Width))
     $bmp=New-Object System.Drawing.Bitmap($w,$h)
     $g=[System.Drawing.Graphics]::FromImage($bmp)
     $g.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
     $g.DrawImage($img,0,0,$w,$h); $img.Dispose()
     $enc=[System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders()|Where-Object{$_.MimeType -eq 'image/jpeg'}
     $p=New-Object System.Drawing.Imaging.EncoderParameters(1)
     $p.Param[0]=New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality,[long]82)
     $bmp.Save($_.FullName,$enc,$p); $g.Dispose(); $bmp.Dispose()
   }
   ```
3. **Build one `slides.html`** with a shared `<style>` block and one
   `<div class="slide">` per slide (see "Slide architecture" below).
4. **Define the palette as CSS custom properties in `:root`**, using the
   *exact variable names* the user gives if they hand you a design-token
   table. This makes future palette swaps a one-block edit instead of a
   grep-and-pray. If they hand you semantic names (`--color-primary`,
   `--glass-border`, `--page-gradient`...), use those names verbatim, not
   your own aliases.
5. **Render with Playwright** to both a PDF (upload artifact) and per-slide
   PNGs (review artifact). See "Render scripts" below.
6. **Visually review every slide** by reading the exported PNGs back
   (`Read` tool supports images). Don't ship on "the CSS looks right" —
   render and look, especially after any palette or scrim change.
7. **Run `/avoid-ai-writing` on the slide copy**, not just the caption.
   Slide headlines get the same em-dash and rhetorical-pattern scrutiny as
   prose (see "Lessons learned").
8. **Write the caption with `/linkedin-writer` or the `social` skill's
   carousel-frameworks reference**, treating it as a *second, different*
   hook from slide 1, not a repeat.

## Slide architecture

One file, one stylesheet, N slides. Each slide is `1080×1350`, absolutely
positioned layers (photo → scrim → content), a shared `.footer` with
handle + page number:

```html
<div class="slide">
  <img class="photo" src="img/whatever.jpg" alt="">
  <div class="scrim"></div>              <!-- gradient veil for legibility -->
  <div class="content">                  <!-- flex column, holds the copy -->
    <div class="glass">                  <!-- frosted card, see below -->
      <div class="kicker">Section label</div>
      <h2>Headline <span class="accent">with an accent phrase.</span></h2>
      <p class="dim">Supporting line.</p>
    </div>
  </div>
  <div class="footer"><span>@handle</span><span>03 / 11</span></div>
</div>
```

Text-only slides (no photo) skip `.photo`/`.scrim` and use a soft `.aura`
radial-gradient glow instead of a flat background, so the deck doesn't
alternate between "photo slide" and "flat slide" too abruptly.

**Diagrams belong inline as SVG inside a slide**, not as a separately
generated PNG. Inline SVG inherits the deck's CSS variables (fonts, exact
hex values) automatically and stays text-editable — no separate export step,
no color drift between the diagram and the rest of the deck. Use labeled
arrows (`<marker>` + `<path>`), not unlabeled lines: every arrow should say
*what* moves, not just that something moves.

**Product screenshots outperform stock/event photography on a "proof"
slide.** If the story has a real screenshot (a live dashboard, a map, actual
output), use it uncropped inside a rounded, shadowed card rather than
cropping a generic photo as a full-bleed background. It reads as evidence,
not vibes. Flag to the user if the screenshot contains real names or PII
before it goes out publicly — a demo screenshot with synthetic data is fine
to publish; one with real identifiable records may not be.

## Render scripts

Two scripts, same `slides.html` source of truth. This repo doesn't have
Playwright as a dependency (it uses Satori/Sharp instead) — install it
locally for this workflow: `npm install -D playwright && npx playwright install chromium`.

**`render.mjs`** — the PDF you actually upload to LinkedIn:
```js
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 2 });
await page.goto('file:///' + path.join(dir, 'slides.html').replace(/\\/g, '/'));
await page.waitForLoadState('networkidle');
await page.pdf({ path: path.join(dir, 'carousel.pdf'), width: '1080px', height: '1350px', printBackground: true });
await browser.close();
```

**`export-images.mjs`** — per-slide PNGs for review / Instagram / re-checks:
```js
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(dir, 'slides-png');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 2 });
await page.goto('file:///' + path.join(dir, 'slides.html').replace(/\\/g, '/'));
await page.waitForLoadState('networkidle');
const slides = await page.locator('.slide').all();
for (let i = 0; i < slides.length; i++) {
  await slides[i].screenshot({ path: path.join(outDir, `slide-${String(i + 1).padStart(2, '0')}.png`) });
}
await browser.close();
```

Re-run both after *any* edit to `slides.html`. `deviceScaleFactor: 2` gives
2160×2700 PNGs (crisp on retina) at a manageable file size (~2–3MB/slide).

## Lessons learned (from building the Sendero / Platanus Hack deck)

- **The caption is a second hook, not a repeat of slide 1.** LinkedIn shows
  the caption text and the document thumbnail at the same time in-feed. If
  both open with the same stat or line, you've wasted the caption's first
  two lines. Lead the caption with a *different* number or angle than the
  cover slide.
- **A full theme flip (dark → light) is not just an accent-color swap.**
  Every text color, glass panel, scrim gradient, and — easy to miss —
  every hardcoded hex inside inline SVG diagrams needs a contrast audit
  when the base surface brightness inverts. `grep` for stray hex codes;
  CSS custom properties won't catch colors hardcoded in SVG `fill`/`stroke`
  attributes.
- **A scrim alone isn't enough legibility insurance on busy photos.** A flat
  gradient veil works for simple backgrounds, but a busy, colorful photo
  (a group shot, a crowded table) under a *light* theme needs either a
  strong `backdrop-filter: blur()` on the scrim, or the text wrapped in an
  opaque `.glass` card, or both. Don't rely on scrim opacity alone once the
  theme is light — check every photo slide individually after a theme
  change, they don't all break the same way.
- **AI-writing hygiene applies to slide copy, not just captions.** Running
  `/avoid-ai-writing` against the deck (not just the caption) caught em
  dashes in slide headlines and a repeated "isn't X, it's Y" construction
  used on two different slides — invisible in isolation, but reads as a tic
  once a reader swipes past both in one sitting. Audit the whole deck as one
  document, not slide-by-slide in isolation.
- **When a dash/pattern ban is imposed, it applies inside SVG `<text>` too.**
  Diagram labels are easy to forget during a "remove all em dashes" pass
  because they're not in the visible prose flow of the file.
- **Use the design-token table's exact variable names.** When a user pastes
  a token table (`--color-primary`, `--glass-border-strong`, etc.), mirror
  those names exactly in `:root`. It makes the CSS self-documenting and
  means a future "use this palette instead" request is a single block
  replacement, not a hunt through the file for every place orange appears.
- **LinkedIn `@mentions` can't be pre-linked from outside the platform.** A
  caption can only contain plain names/handles with instructions to retype
  `@Name` inside LinkedIn's own composer so it resolves against their
  autocomplete. Don't fabricate profile URLs or assume a name will resolve —
  tell the user to verify each tag resolves before posting, and to fall back
  to plain text for anyone who doesn't show up in the dropdown.
- **Renumber footers programmatically, and re-check after.** Inserting or
  moving a slide (e.g. relocating a diagram from slide 8 to slide 4) means
  every `NN / total` footer after that point shifts. A blind find-replace on
  page numbers can accidentally catch an unrelated "X / Y" string elsewhere
  in the copy (this happened once — a cover-slide statistic got clobbered by
  a footer renumbering regex). Verify the specific strings changed, not just
  that the replace "ran."
