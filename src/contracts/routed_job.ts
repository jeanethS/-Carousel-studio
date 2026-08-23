import { z } from "zod";

/**
 * Inbound contract for Carousel-studio — validated at the orchestrator boundary
 * (per the Brand OS agent-scaffold rule: zod at every input/output boundary).
 *
 * Carousel only renders instagram + linkedin slides; the platform union is
 * intentionally a subset of the full @brand-os/contracts Platform enum.
 */

export const CarouselSlideSchema = z.object({
  slideNumber: z.number().int().positive(),
  headline: z.string().min(1),
  bodyText: z.string().optional(),
  dataPoint: z.string().optional(),
  visualCue: z.string().optional(),
  overlayGraphic: z.object({
    url: z.string().min(1),
    x: z.number().optional(),
    y: z.number().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    opacity: z.number().min(0).max(1).optional(),
  }).optional(),
});

export const RoutedJobEventSchema = z.object({
  jobId: z.string().min(1),
  clusterId: z.string().min(1),
  topic: z.string().min(1),
  platform: z.enum(["instagram", "linkedin"]),
  hookHeadline: z.string().min(1),
  founderPositioning: z.string().optional(),
  slides: z.array(CarouselSlideSchema).min(1),
  ctaText: z.string().min(1),
  handleOrProfile: z.string().min(1),
});

export type CarouselSlide = z.infer<typeof CarouselSlideSchema>;
export type RoutedJobEvent = z.infer<typeof RoutedJobEventSchema>;
