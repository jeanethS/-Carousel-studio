import { RoutedJobEventSchema } from "./routed_job";

const validJob = {
  jobId: "job-001",
  clusterId: "tech_science",
  topic: "Why transformers matter",
  platform: "instagram",
  hookHeadline: "The AI shift, explained",
  slides: [
    { slideNumber: 1, headline: "Cover", bodyText: "intro" },
    { slideNumber: 2, headline: "Point one" },
  ],
  ctaText: "Follow for more",
  handleOrProfile: "@brand",
};

describe("RoutedJobEventSchema", () => {
  it("parses a valid carousel job", () => {
    expect(() => RoutedJobEventSchema.parse(validJob)).not.toThrow();
  });

  it("rejects a missing required field (topic)", () => {
    const { topic: _omit, ...bad } = validJob;
    expect(() => RoutedJobEventSchema.parse(bad)).toThrow();
  });

  it("rejects an unsupported platform", () => {
    expect(() => RoutedJobEventSchema.parse({ ...validJob, platform: "tiktok" })).toThrow();
  });

  it("rejects an empty slides array (no carousel to render)", () => {
    expect(() => RoutedJobEventSchema.parse({ ...validJob, slides: [] })).toThrow();
  });

  it("rejects a slide missing its headline", () => {
    const bad = {
      ...validJob,
      slides: [{ slideNumber: 1, bodyText: "no headline" }],
    };
    expect(() => RoutedJobEventSchema.parse(bad)).toThrow();
  });

  it("accepts the optional founderPositioning field", () => {
    expect(() =>
      RoutedJobEventSchema.parse({ ...validJob, founderPositioning: "Ex-Stripe founder" }),
    ).not.toThrow();
  });

  it("rejects non-string jobId", () => {
    expect(() => RoutedJobEventSchema.parse({ ...validJob, jobId: 123 })).toThrow();
  });

  it("rejects a blank handleOrProfile", () => {
    expect(() => RoutedJobEventSchema.parse({ ...validJob, handleOrProfile: "" })).toThrow();
  });
});
