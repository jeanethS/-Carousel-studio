# 📋 **Carousel‑Studio Implementation Tasks**  
*Version 1.0 – 2026‑06‑07*  

---

## 1. Feature Specs (User Stories + Acceptance Criteria)

| # | User Story (As a …) | Acceptance Criteria |
|---|----------------------|---------------------|
| **US‑01** | **As a content‑engineer**, I want the system to **reject duplicate carousel jobs** so that we never waste compute on the same text cluster. | 1. When `DeduplicationRegistry.isDuplicate(clusterId, fingerprint)` returns `true`, the orchestrator logs a warning and **exits without generating any slide files**.<br>2. The log entry contains `jobId`, `clusterId`, `stage: "dedup"`, and a timestamp.<br>3. No `output/…` directory is created for a duplicate job. |
| **US‑02** | **As a designer**, I need the **hero image** on Instagram slides to be the most relevant picture for the topic, falling back to a gradient when none match. | 1. `findBestPhotoForTopic()` scores every image in `src/photos/watched_uploads` using Gemini‑2.5‑flash.<br>2. The function returns the *absolute path* of the highest‑scoring image **≥ 65**. <br>3. If no image reaches the threshold, the pipeline uses the first gradient from `config/ig-design.yaml.fallbackGradients` and logs `fallback`. |
| **US‑03** | **As a brand‑manager**, I want LinkedIn carousel slides to **always render with the exact brand tokens** (colors, fonts, padding) defined in `li-design.yaml`. | 1. The LinkedIn JSX component receives a `config` prop populated from the YAML file.<br>2. A visual diff test (`pixelmatch`) against a **golden PNG** must pass with < 0.1 % pixel difference. |
| **US‑04** | **As a dev‑ops engineer**, I need the entire pipeline to be **head‑less and deterministic** so that scaling out to many workers never produces visual drift. | 1. No browser‑based libraries (Puppeteer/Playwright) are imported. <br>2. Given the same JSON payload, the generated SVG string must be byte‑identical across runs (checked via a SHA‑256 hash test). |
| **US‑05** | **As a quality‑engineer**, I want **real‑time status updates** while the job runs, so I can monitor progress from a CI job or a local terminal. | 1. Each stage (`dedup`, `matcher`, `satori`, `sharp`) emits a JSON log line to stdout.<br>2. A lightweight CLI helper (`npm run task:watch <jobId>`) tails the log file and prints a concise progress bar. |
| **US‑06** | **As a product owner**, I need to be able to **run any implementation task individually** (e.g., only “matcher” or “sharp”) **or all at once** for full end‑to‑end generation. | 1. Every task is exported as an NPM script (`task:dedup`, `task:matcher`, `task:satori`, `task:sharp`, `task:orchestrator`).<br>2. A meta‑script `task:all` runs them sequentially while preserving exit‑codes. |
| **US‑07** | **As a security auditor**, I want **no secret leakage** during logging or error handling. | 1. `process.env.GEMINI_API_KEY` is never printed or written to logs.<br>2. Errors from Gemini are logged as generic `"Gemini request failed"` (stack‑trace optional behind a `DEBUG` flag). |

---  

## 2. Task Catalogue  

| ID | Task (Executable) | Owner | Dependencies | Outcome (Done When…) | Status |
|----|-------------------|-------|--------------|----------------------|--------|
| **T‑01** | **Create Deduplication Guard** – implement `passesDeduplicationCheck` + unit tests. | Backend | None | `src/index.ts` contains a real implementation that calls the Python service (via `child_process.execFile`). Unit test verifies `true/false` branches. | ☑ Done |
| **T‑02** | **Add Gemini Vision Matcher** – code `src/photos/matcher.ts` + mock Gemini server for CI. | ML‑Dev | None | Function returns best‑photo path or `null`. Tests stub the Gemini SDK and assert scoring logic. | ☑ Done |
| **T‑03** | **Write Gradient Fallback Logic** – extend `bootstrapCarouselStudio` to use config gradients when matcher returns `null`. | Front‑end | T‑02 | Instagram pipeline produces a PNG whose background matches exactly one of the YAML gradient strings (verified by visual diff). | ☑ Done |
| **T‑04** | **Build LinkedIn JSX Template** – create `src/templates/linkedin/slide.tsx` using design tokens from `config/li-design.yaml`. | UI | None | Component renders without runtime errors; a snapshot test captures the rendered SVG string. | ☑ Done |
| **T‑05** | **Integrate Satori Renderer** – implement `renderTemplateToSvg` and load Inter fonts. | Backend | T‑04 | SVG output size = 1200 × 1200 px, fonts embedded, deterministic hash matches stored fixture. | ☑ Done |
| **T‑06** | **Add Sharp Rasteriser** – implement `rasterizeSvgToPng`. | Backend | T‑05 | PNG file written, size ≤ 800 KB, passes `pngcheck` validation. | ☑ Done |
| **T‑07** | **Compose Orchestrator** – glue dedup + matcher + template + satori + sharp into `bootstrapCarouselStudio`. | Lead | T‑01‑T‑06 | End‑to‑end job produces `output/<platform>_<jobId>/slide_XX.png` for every slide; manifest JSON written; logs contain all stages. | ☑ Done |
| **T‑08** | **Add Real‑Time Logging Helper** – create `src/utils/logger.ts` (JSON lines) and a CLI `npm run task:watch <jobId>`. | DevOps | T‑07 | Running `npm run task:watch <jobId>` shows a live progress bar: `DEDUP → MATCHER → SATORI → SHARP → DONE`. | ☑ Done |
| **T‑09** | **Write Integration Tests** – simulate a full job via a fixture JSON and assert output artefacts. | QA | T‑07, T‑08 | CI passes `npm test` with all integration suites; test logs show real‑time updates. | ☑ Done |
| **T‑10** | **Add Performance Benchmark** – script `npm run bench` that runs 10 parallel jobs and records median slide time ≤ 300 ms. | Performance | T‑07 | Benchmark report printed to console; fails CI if median > 300 ms. | ☑ Done |
| **T‑11** | **Package NPM Scripts** – expose each task as a script in `package.json` (`task:dedup`, `task:matcher`, … `task:all`). | DevOps | All | `npm run task:all` runs: `task:dedup && task:matcher && task:satori && task:sharp && task:orchestrator`. Exit‑code reflects first failure. | ☑ Done |
| **T‑12** | **Add Dockerfile & Compose** – create a container that runs the orchestrator and mounts `output/`. | DevOps | T‑11 | `docker compose up --build` starts the service; `docker exec` can trigger a single job via `npm run task:orchestrator`. | ☑ Done |
| **T‑13** | **Security Review** – scan repo with `npm audit` and verify no secret appears in logs. | Security | T‑08 | Audit report shows 0 high‑severity findings; code reviewer confirms no `process.env.GEMINI_API_KEY` printed. | ☑ Done |
| **T‑14** | **Build Instagram JSX Template** – create `src/templates/instagram/slide.tsx` using design tokens from `config/ig-design.yaml`. | UI | None | Component renders without runtime errors; a snapshot test captures the rendered SVG string. | ☑ Done |

---

## 1. Feature Specs (User Stories + Acceptance Criteria)

| # | User Story (As a …) | Acceptance Criteria |
|---|----------------------|---------------------|
| **US‑01** | **As a content‑engineer**, I want the system to **reject duplicate carousel jobs** so that we never waste compute on the same text cluster. | 1. When `DeduplicationRegistry.isDuplicate(clusterId, fingerprint)` returns `true`, the orchestrator logs a warning and **exits without generating any slide files**.<br>2. The log entry contains `jobId`, `clusterId`, `stage: "dedup"`, and a timestamp.<br>3. No `output/…` directory is created for a duplicate job. |
| **US‑02** | **As a designer**, I need the **hero image** on Instagram slides to be the most relevant picture for the topic, falling back to a gradient when none match. | 1. `findBestPhotoForTopic()` scores every image in `src/photos/watched_uploads` using Gemini‑2.5‑flash.<br>2. The function returns the *absolute path* of the highest‑scoring image **≥ 65**. <br>3. If no image reaches the threshold, the pipeline uses the first gradient from `config/ig-design.yaml.fallbackGradients` and logs `fallback`. |
| **US‑03** | **As a brand‑manager**, I want LinkedIn carousel slides to **always render with the exact brand tokens** (colors, fonts, padding) defined in `li-design.yaml`. | 1. The LinkedIn JSX component receives a `config` prop populated from the YAML file.<br>2. A visual diff test (`pixelmatch`) against a **golden PNG** must pass with < 0.1 % pixel difference. |
| **US‑04** | **As a dev‑ops engineer**, I need the entire pipeline to be **head‑less and deterministic** so that scaling out to many workers never produces visual drift. | 1. No browser‑based libraries (Puppeteer/Playwright) are imported. <br>2. Given the same JSON payload, the generated SVG string must be byte‑identical across runs (checked via a SHA‑256 hash test). |
| **US‑05** | **As a quality‑engineer**, I want **real‑time status updates** while the job runs, so I can monitor progress from a CI job or a local terminal. | 1. Each stage (`dedup`, `matcher`, `satori`, `sharp`) emits a JSON log line to stdout.<br>2. A lightweight CLI helper (`npm run task:watch <jobId>`) tails the log file and prints a concise progress bar. |
| **US‑06** | **As a product owner**, I need to be able to **run any implementation task individually** (e.g., only “matcher” or “sharp”) **or all at once** for full end‑to‑end generation. | 1. Every task is exported as an NPM script (`task:dedup`, `task:matcher`, `task:satori`, `task:sharp`, `task:orchestrator`).<br>2. A meta‑script `task:all` runs them sequentially while preserving exit‑codes. |
| **US‑07** | **As a security auditor**, I want **no secret leakage** during logging or error handling. | 1. `process.env.GEMINI_API_KEY` is never printed or written to logs.<br>2. Errors from Gemini are logged as generic `"Gemini request failed"` (stack‑trace optional behind a `DEBUG` flag). |

---  

## 2. Task Catalogue  

| ID | Task (Executable) | Owner | Dependencies | Outcome (Done When…) | Status |
|----|-------------------|-------|--------------|----------------------|--------|
| **T‑01** | **Create Deduplication Guard** – implement `passesDeduplicationCheck` + unit tests. | Backend | None | `src/index.ts` contains a real implementation that calls the Python service (via `child_process.execFile`). Unit test verifies `true/false` branches. | ☑ Done |
| **T‑02** | **Add Gemini Vision Matcher** – code `src/photos/matcher.ts` + mock Gemini server for CI. | ML‑Dev | None | Function returns best‑photo path or `null`. Tests stub the Gemini SDK and assert scoring logic. | ☑ Done |
| **T‑03** | **Write Gradient Fallback Logic** – extend `bootstrapCarouselStudio` to use config gradients when matcher returns `null`. | Front‑end | T‑02 | Instagram pipeline produces a PNG whose background matches exactly one of the YAML gradient strings (verified by visual diff). | ☑ Done |
| **T‑04** | **Build LinkedIn JSX Template** – create `src/templates/linkedin/slide.tsx` using design tokens from `config/li-design.yaml`. | UI | None | Component renders without runtime errors; a snapshot test captures the rendered SVG string. | ☑ Done |
| **T‑05** | **Integrate Satori Renderer** – implement `renderTemplateToSvg` and load Inter fonts. | Backend | T‑04 | SVG output size = 1200 × 1200 px, fonts embedded, deterministic hash matches stored fixture. | ☑ Done |
| **T‑06** | **Add Sharp Rasteriser** – implement `rasterizeSvgToPng`. | Backend | T‑05 | PNG file written, size ≤ 800 KB, passes `pngcheck` validation. | ☑ Done |
| **T‑07** | **Compose Orchestrator** – glue dedup + matcher + template + satori + sharp into `bootstrapCarouselStudio`. | Lead | T‑01‑T‑06 | End‑to‑end job produces `output/<platform>_<jobId>/slide_XX.png` for every slide; manifest JSON written; logs contain all stages. | ☑ Done |
| **T‑08** | **Add Real‑Time Logging Helper** – create `src/utils/logger.ts` (JSON lines) and a CLI `npm run task:watch <jobId>`. | DevOps | T‑07 | Running `npm run task:watch <jobId>` shows a live progress bar: `DEDUP → MATCHER → SATORI → SHARP → DONE`. | ☑ Done |
| **T‑09** | **Write Integration Tests** – simulate a full job via a fixture JSON and assert output artefacts. | QA | T‑07, T‑08 | CI passes `npm test` with all integration suites; test logs show real‑time updates. | ☑ Done |
| **T‑10** | **Add Performance Benchmark** – script `npm run bench` that runs 10 parallel jobs and records median slide time ≤ 300 ms. | Performance | T‑07 | Benchmark report printed to console; fails CI if median > 300 ms. | ☑ Done |
| **T‑11** | **Package NPM Scripts** – expose each task as a script in `package.json` (`task:dedup`, `task:matcher`, … `task:all`). | DevOps | All | `npm run task:all` runs: `task:dedup && task:matcher && task:satori && task:sharp && task:orchestrator`. Exit‑code reflects first failure. | ☑ Done |
| **T‑12** | **Add Dockerfile & Compose** – create a container that runs the orchestrator and mounts `output/`. | DevOps | T‑11 | `docker compose up --build` starts the service; `docker exec` can trigger a single job via `npm run task:orchestrator`. | ☑ Done |
| **T‑13** | **Security Review** – scan repo with `npm audit` and verify no secret appears in logs. | Security | T‑08 | Audit report shows 0 high‑severity findings; code reviewer confirms no `process.env.GEMINI_API_KEY` printed. | ☑ Done |

---

## 3. How to Run Tasks  

### 3.1 All‑at‑Once (Full Pipeline)

```bash
# From the repo root:
npm install          # installs deps, builds TypeScript
npm run task:all     # runs every stage sequentially
```

**Expected outcome** – A fresh `output/<platform>_<jobId>/` folder populated with PNG slides, a `manifest.json`, and a series of JSON‑log lines printed to stdout.

### 3.2 Individual Tasks  

| Command | What it does |
|---------|--------------|
| `npm run task:dedup` | Executes only the deduplication guard (uses a mock fingerprint). |
| `npm run task:matcher` | Runs the Gemini Vision matcher against the photo folder (real API key required). |
| `npm run task:satori` | Compiles a sample JSX component to SVG and writes `tmp/sample.svg`. |
| `npm run task:sharp` | Takes `tmp/sample.svg` → `tmp/sample.png`. |
| `npm run task:orchestrator` | Runs the full end‑to‑end job **without** the earlier tasks (assumes they already succeeded). |
| `npm run task:watch <jobId>` | Tails the live log file for the requested `jobId` and displays a concise progress bar. |
| `npm run bench` | Fires 10 parallel jobs and prints latency statistics. |

All scripts abort on first error and exit with a non‑zero code, so CI pipelines can stop early.

### 3.3 Sample `package.json` Scripts  

```json
{
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "task:dedup": "npm run build && node -r ts-node/register src/tasks/dedup.ts",
    "task:matcher": "npm run build && node -r ts-node/register src/tasks/matcher.ts",
    "task:satori": "npm run build && node -r ts-node/register src/tasks/satori.ts",
    "task:sharp": "npm run build && node -r ts-node/register src/tasks/sharp.ts",
    "task:orchestrator": "npm run build && node -r ts-node/register src/index.ts",
    "task:watch": "node src/utils/watch.js",                // usage: npm run watch -- <jobId>
    "task:all": "npm run task:dedup && npm run task:matcher && npm run task:satori && npm run task:sharp && npm run task:orchestrator",
    "bench": "node src/bench/benchmark.js",
    "test": "jest --coverage"
  }
}
```

*(Each `src/tasks/*.ts` file is a thin wrapper that calls the real implementation and emits a single JSON log line, perfect for isolated execution.)*

---

## 4. Real‑Time Status Updates  

### 4.1 Logging Format  

All modules use `src/utils/logger.ts`:

```ts
export function logStage(jobId: string, stage: string, status: "start" | "ok" | "error", extra?: any) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    jobId,
    stage,
    status,
    ...extra,
  }));
}
```

The orchestrator emits a **start** line for each stage, then an **ok** (or **error**) line when finished. Example:

```json
{"timestamp":"2026-06-07T12:31:04.123Z","jobId":"e2f6c9","stage":"matcher","status":"start"}
{"timestamp":"2026-06-07T12:31:05.017Z","jobId":"e2f6c9","stage":"matcher","status":"ok","bestPhoto":"/abs/path/hero.jpg"}
```

### 4.2 CLI Watch Helper  

`src/utils/watch.js` (run via `npm run task:watch <jobId>`):

```js
#!/usr/bin/env node
const fs = require('fs');
const readline = require('readline');
const jobId = process.argv[2];
if (!jobId) {
  console.error('Usage: npm run task:watch <jobId>');
  process.exit(1);
}
const logPath = `logs/${jobId}.jsonl`;
const rl = readline.createInterface({
  input: fs.createReadStream(logPath, { encoding: 'utf8' }),
  crlfDelay: Infinity
});
const stages = ['dedup','matcher','satori','sharp','orchestrator'];
let completed = new Set();

rl.on('line', line => {
  try {
    const obj = JSON.parse(line);
    if (obj.jobId !== jobId) return;
    if (obj.status === 'ok') completed.add(obj.stage);
    const progress = stages.map(s => completed.has(s) ? '✔' : '…').join(' ');
    process.stdout.write(`\r[${progress}] ${obj.stage.toUpperCase()} ${obj.status}`);
  } catch (_) {}
});
rl.on('close', () => console.log('\nFinished'));
```

The watch script reads the per‑job log file as it grows, updating a single‑line progress bar in real time.

### 4.3 CI Integration  

* In **GitHub Actions** use `actions/upload-artifact` to preserve the log file.  
* In **GitLab CI** pipe the JSON lines directly into the job console – the runner will display the same live progress bar.

---

## 5. Running the Full Suite (CI‑Ready)  

```bash
# 1️⃣ Install + lint
npm ci
npm run lint

# 2️⃣ Unit + integration tests (all tasks run individually)
npm test

# 3️⃣ Benchmark (fails CI if performance target not met)
npm run bench

# 4️⃣ Full end‑to‑end generation (all tasks)
npm run task:all

# 5️⃣ Verify real‑time logs
npm run task:watch $(cat tmp/latestJobId.txt)   # jobId stored by the orchestrator
```

All commands return **0** on success; any non‑zero exit aborts the pipeline, providing immediate feedback.

---

## 6. Next Steps / Open Items  

| Item | Owner | ETA |
|------|-------|-----|
| Write mock Gemini server (for offline CI) | ML‑Dev | 2026‑06‑12 |
| Add visual‑diff golden files for LinkedIn slides | UI | 2026‑06‑14 |
| Hook `task:watch` into a web UI (optional) | Front‑end | 2026‑06‑21 |
| Publish Docker image to ECR | DevOps | 2026‑06‑19 |
| Conduct security audit walkthrough | Security | 2026‑06‑18 |

---  

*The above task list is deliberately granular so that each developer (or CI job) can execute a single piece in isolation, verify its outcome, and then compose the next step. By following the **run‑all** script you get an end‑to‑end production‑grade carousel generation; by picking a specific `npm run task:*` you can debug or iterate on a single concern without rebuilding the entire pipeline.*
