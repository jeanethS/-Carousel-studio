# Technical Requirements Document (TRD)  
**Project:** Carousel‑Studio Engine  
**Author:** [Your Name] – Architecture & Platform Lead  
**Date:** 2026‑06‑07  

---  

## 1. Purpose & Overview  

The **Carousel‑Studio** engine is a deterministic, head‑less rendering pipeline that creates high‑fidelity carousel assets for Instagram and LinkedIn from incoming `routed_job` events.  

* **Goal** – Generate a set of PNG slides (1200 × 1200 px) within ≤ 300 ms per slide, while guaranteeing brand‑compliant designs, eliminating duplicate work, and selecting the most context‑relevant hero image via Gemini Vision.  

* **Scope** – All server‑side processing, from the deduplication guard through the Gemini‑powered photo matcher, Satori‑based SVG generation, and Sharp rasterisation. The engine does **not** include any front‑end UI, CDN publishing, or social‑media API integration; those are downstream services.

---  

## 2. Definitions & Acronyms  

| Term | Meaning |
|------|---------|
| **Satori** | A Node.js library that converts JSX/TSX trees into SVG vectors without a head‑less browser. |
| **Sharp** | High‑performance image processing library (SVG → PNG). |
| **Gemini Vision** | Google Generative AI model (gemini‑2.5‑flash) used for image‑topic relevance scoring. |
| **Deduplication Registry** | External service (Python‑based MinHash/Bloom filter) exposing `isDuplicate(clusterId, fingerprint)`. |
| **`routed_job`** | The inbound payload that describes a carousel generation request (see §3). |
| **Slide** | A single carousel image (PNG) produced by the pipeline. |
| **Gradient Fallback** | Pre‑defined CSS gradient used when no matching image is found. |
| **Deterministic** | Identical input always yields identical output (no randomised layout). |

---  

## 3. Data Contracts  

### 3.1 Incoming Payload (`contracts/content_artifact.ts`)  

```ts
export interface CarouselSlide {
  slideNumber: number;               // 1‑based index
  headline: string;                  // Primary copy, mandatory
  bodyText?: string;                 // Secondary copy (optional)
  dataPoint?: string;                // Raw data for chart / code block
  visualCue?: string;                // e.g. 'chart', 'hero-overlay'
}

export interface RoutedJobEvent {
  jobId: string;                     // UUID for traceability
  clusterId: string;                 // Grouping key for deduplication
  topic: string;                     // Subject of the carousel (e.g. “AI‑driven growth”)
  platform: 'instagram' | 'linkedin';
  hookHeadline: string;              // Hook shown in the first slide
  founderPositioning?: string;       // Optional brand‑voice note
  slides: CarouselSlide[];           // Ordered list of slides
  ctaText: string;                   // Call‑to‑action (e.g. “Learn More”)
  handleOrProfile: string;           // @handle or LinkedIn profile name
}
```

### 3.2 Deduplication API  

```ts
export interface DeduplicationRegistry {
  /** Returns true if a cluster with the same fingerprint already exists. */
  isDuplicate(clusterId: string, textFingerprint: string): Promise<boolean>;
}
```

### 3.3 Output Artifact  

| File | Description |
|------|-------------|
| `slide_01.png … slide_N.png` | 1200 × 1200 px PNG, PNG‑optimised (quality = 100, compression = 9). |
| `manifest.json` (optional) | JSON list of generated slides + metadata (hash, size, generation time). |

---  

## 4. System Architecture & Data Flow  

```
[routed_job Event]                 <-- External trigger (e.g. message queue)
       │
       ▼
[Deduplication Guard] --------------► (Duplicate) ──► [Skip & Ack]
       │
       ▼ (Unique)
[Photo Matcher (Gemini Vision)] ──► bestHeroPath | null
       │
       ▼
[Satori Renderer]  (React‑like JSX → SVG) 
       │
       ▼
[Sharp Rasterizer] (SVG → PNG)
       │
       ▼
[Output Store] (local FS or mounted volume)
```

*All modules are pure Node.js functions; no head‑less browsers are launched.*  

### 4.1 Component Overview  

| Component | Language | Main Entry | External Dependency |
|-----------|----------|------------|---------------------|
| **Deduplication Guard** | TypeScript | `passesDeduplicationCheck` (src/index.ts) | Python service via `child_process` (MinHash/Bloom). |
| **Gemini Vision Matcher** | TypeScript | `findBestPhotoForTopic` (src/photos/matcher.ts) | Google GenAI SDK (API key). |
| **Satori Engine** | TypeScript | `renderTemplateToSvg` (src/render/satori.ts) | Font files (`assets/fonts/*.ttf`). |
| **Sharp Rasterizer** | TypeScript | `rasterizeSvgToPng` (src/render/sharp.ts) | Native libvips (installed with Sharp). |
| **Template Library** | TypeScript/TSX | `LinkedInSlide`, `InstagramSlide` (src/templates/…) | Config files (`config/*.yaml`). |
| **Orchestrator** | TypeScript | `bootstrapCarouselStudio` (src/index.ts) | File system, environment variables. |

---  

## 5. Functional Requirements  

| FR‑ID | Description | Priority | Acceptance Criteria |
|-------|-------------|----------|----------------------|
| **FR‑001** | **Deduplication Guard** – Prevent re‑rendering of near‑duplicate clusters. | **Must** | `passesDeduplicationCheck` returns `false` when `DeduplicationRegistry.isDuplicate` is true; the pipeline logs a warning and does **not** emit any PNG files. |
| **FR‑002** | **Gemini Vision Image Matcher** – Score local assets against the job `topic`. | **Should** | `findBestPhotoForTopic` returns the absolute path of the highest‑scoring image > 65 score, or `null` if none qualify. The API call must be `gemini‑2.5‑flash` and the response parsed as strict JSON. |
| **FR‑003** | **Fallback Gradient** – Use a predefined gradient when no image matches. | **Must** | When `matchedHeroPhoto` is `null`, the PNG is generated with a solid gradient background taken from `config/ig-design.yaml`. |
| **FR‑004** | **Satori SVG Generation** – Convert a JSX slide component into a deterministic SVG. | **Must** | For a given `RoutedJobEvent` the resulting SVG string must be byte‑identical across runs (fonts, spacing, padding hard‑coded). |
| **FR‑005** | **Sharp Rasterisation** – Transform SVG → PNG at 1200 × 1200 px. | **Must** | PNG must be lossless (quality = 100) and size ≤ 800 KB. |
| **FR‑006** | **Platform‑Specific Layouts** – Apply distinct design tokens for LinkedIn & Instagram. | **Must** | LinkedIn slides use `config/li-design.yaml`; Instagram slides use `config/ig-design.yaml`. The design tokens (colors, fonts, padding) must be injected into the JSX component via the `config` prop. |
| **FR‑007** | **Parallelisation** – Render all slides of a job concurrently (max CPU = number of cores). | **Should** | `Promise.all` on slide rendering must not exceed available CPU (> 90 % utilisation on a 8‑core test machine). |
| **FR‑008** | **Output Organization** – Store PNG files under `output/<platform>_<jobId>/`. | **Must** | After successful processing, the directory contains `slide_01.png … slide_N.png` with correct naming and no stray files. |
| **FR‑009** | **Logging & Observability** – Emit JSON‑structured logs for each stage. | **Should** | Logs contain `jobId`, `stage` (`dedup`, `matcher`, `satori`, `sharp`), timestamps and status (`ok`/`error`). |
| **FR‑010** | **Graceful Failure** – If any slide fails, the pipeline aborts and rolls back partial output. | **Must** | On any exception, the output directory is removed, and the orchestrator exits with a non‑zero code. |

---  

## 6. Non‑Functional Requirements  

| NFR‑ID | Category | Requirement | Priority |
|--------|----------|-------------|----------|
| **NFR‑001** | Performance | Median per‑slide wall‑clock time ≤ 300 ms (including I/O). | Must |
| **NFR‑002** | Throughput | System must support **≥ 150 concurrent jobs** on a single 8‑core VM without degradation. | Should |
| **NFR‑003** | Memory | Process memory ≤ 500 MiB per job (Sharp + Satori). | Must |
| **NFR‑004** | Scalability | Stateless design; horizontal scaling via multiple Node.js workers behind a message queue (e.g., RabbitMQ, SQS). | Should |
| **NFR‑005** | Reliability | 99.9 % successful slide generation over a 30‑day window. | Must |
| **NFR‑006** | Security | GEMINI_API_KEY stored in environment variable; never logged. All filesystem paths sanitized. | Must |
| **NFR‑007** | Observability | Export Prometheus metrics: `carousel_studio_job_total`, `carousel_studio_job_failed`, `slide_render_seconds`. | Should |
| **NFR‑008** | Maintainability | All source files typed with strict TypeScript (`strict:true`). 100 % unit‑test coverage on core modules. | Must |
| **NFR‑009** | Portability | Node.js ≥ 20.0, operating system agnostic (Linux/macOS). No native‑build step beyond Sharp’s libvips. | Must |
| **NFR‑010** | Compliance | No user‑generated content is stored longer than 24 h; all generated assets are considered temporary. | Should |

---  

## 7. Interface Specifications  

### 7.1 External – Deduplication Service  

| Method | Request | Response | Notes |
|--------|---------|----------|-------|
| `POST /dedup/check` | `{ clusterId: string, fingerprint: string }` | `{ duplicate: boolean }` | HTTP/HTTPS, JSON, auth via internal token. |

> **Implementation note:** The current prototype uses a Python child‑process wrapper; the contract above is the target API for future replaceability.

### 7.2 External – Gemini Vision  

| Endpoint | Payload | Expected Response |
|----------|---------|-------------------|
| `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent` | Multipart JSON with `inlineData` (base64 image) + prompt (see `matcher.ts`). | `{"score": 0‑100}` – strictly JSON, no extra text. |

*Timeout* – 8 seconds per image (configurable). Retries ≤ 2 with exponential back‑off.

### 7.3 Internal – Module APIs  

| Module | Exported Function | Input | Output |
|--------|-------------------|-------|--------|
| `matcher.ts` | `findBestPhotoForTopic(photoFolder:string, topic:string): Promise<string | null>` | Folder path, topic string | Absolute path to best‑scoring image or `null`. |
| `satori.ts` | `renderTemplateToSvg(element:ReactNode, dimensions:{width:number;height:number}): Promise<string>` | JSX + size | SVG markup string. |
| `sharp.ts` | `rasterizeSvgToPng(svg:string, outputPath:string): Promise<void>` | SVG, output filename | File written, resolved when complete. |
| `index.ts` | `bootstrapCarouselStudio(job:RoutedJobEvent): Promise<void>` | Job payload | Generates slides and writes to disk or throws error. |

---  

## 8. Configuration  

| File | Purpose | Key Fields |
|------|---------|------------|
| `config/li-design.yaml` | LinkedIn brand tokens | `theme`, `backgroundColor`, `accentColor`, `textColor`, `fontFamily`, `codeFontFamily`, `padding` |
| `config/ig-design.yaml` | Instagram brand tokens | `theme`, `overlayOpacity`, `fallbackGradients[]`, `fontFamily` |
| `.env` | Runtime secrets | `GEMINI_API_KEY`, `DEDUP_SERVICE_URL`, `NODE_ENV` |
| `package.json` | Dependency lock | `satori`, `sharp`, `@google/genai`, `react`, `typescript` |

> **Best practice:** All config files must be version‑controlled; secrets never committed.  

---  

## 9. Deployment & Runtime Environment  

| Item | Specification |
|------|----------------|
| **Node.js** | `>=20.0` (LTS) |
| **OS** | Linux (Ubuntu 22.04+ recommended) |
| **Containerisation** | Docker image (`node:20-slim`) – builds with `npm ci`. |
| **Entrypoint** | `node -r ts-node/register src/index.ts` – the service listens on a message queue, e.g. `AMQP_URL`. |
| **Volumes** | `./output` mounted as persistent storage; `./assets/fonts` read‑only. |
| **Resource Limits** | CPU = 2 cores per container (adjustable); Memory ≤ 512 MiB. |
| **Healthcheck** | HTTP `GET /healthz` returning `{status:"ok"}` – used by orchestrator. |

---  

## 10. Testing Strategy  

| Test Type | Scope | Tooling |
|-----------|-------|----------|
| **Unit** | All exported functions (`matcher`, `satori`, `sharp`, dedup guard). | Jest + ts‑jest; mock Gemini API with fixture JSON. |
| **Integration** | End‑to‑end job flow (from JSON payload to PNG files). | Supertest + Docker Compose (service + mock Gemini server). |
| **Performance** | Per‑slide latency, CPU & memory profiling. | k6 scripts; `node --prof` + `clinic flame`. |
| **Security** | Secret leakage, path traversal. | npm `audit`, OWASP ZAP for API endpoints. |
| **Chaos** | Random Gemini timeouts, dedup service unavailability. | Pumba / chaos‑monkey injection. |
| **Regression** | Snapshot testing of generated PNGs (hash comparison). | `pixelmatch` library to compare against golden images. |

All CI pipelines must enforce **≥ 90 %** coverage and must reject builds that exceed latency thresholds.

---  

## 11. Assumptions & Constraints  

1. **No headless browsers** – The design deliberately avoids Puppeteer/Playwright. All rendering must be achievable with Satori + Sharp.  
2. **Gemini Vision availability** – The Gemini API is assumed to be reachable with a 99.5 % SLA; fallback to gradient is required if the service is down.  
3. **Deduplication service stability** – The Python service is considered *eventually consistent*; occasional false‑negatives are acceptable (they will just render again).  
4. **File system is POSIX‑compatible** – Path sanitisation relies on `path.resolve`.  
5. **Static font assets** – Only Inter (regular & bold) and a generic monospace are bundled; adding new fonts requires a rebuild.  

---  

## 12. Glossary  

| Term | Meaning |
|------|----------|
| **Slide** | One PNG image representing a carousel frame. |
| **Cluster** | Logical grouping of related jobs that share the same `clusterId`. |
| **Fingerprint** | Cryptographic hash (e.g., SHA‑256) of the concatenated slide headlines/body text used for deduplication. |
| **Hero Photo** | Large background image placed on the first slide (Instagram). |
| **Gradient Fallback** | Pre‑defined CSS gradient used when no hero photo matches. |
| **Deterministic Rendering** | Identical inputs always produce identical SVG/PNG bytes. |
| **Hot‑Path** | The critical chain of steps (dedup → matcher → satori → sharp) that determines latency. |

---  

## 13. Revision History  

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026‑06‑07 | [Your Name] | Initial technical requirements based on implementation guide. |
| 1.1 | 2026‑06‑15 | QA Lead | Added performance & chaos testing sections. |
| 1.2 | 2026‑06‑22 | Architecture | Updated NFR‑002 throughput target after capacity planning. |

---  

*End of Document*  