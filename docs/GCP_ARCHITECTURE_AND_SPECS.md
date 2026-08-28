# GCP Architecture & Implementation Specs — Carousel-studio

> Fecha: 2026-07-12 · Proyecto: `positronica-labs` · Región: `us-central1`
> Estado de seguridad: la key filtrada fue revocada, la historia purgada y la nueva versión guardada en Secret Manager el 2026-07-12. No repetir esa rotación ni crear otra key.

## 1. Resumen de uso de créditos

| Crédito | Uso atribuible | Presupuesto de planeación |
|---|---|---:|
| Free Credit general (vence 2026-07-15) | Artifact Registry, Cloud Run Job y GCS | <US$5 en 3 días sin carga real |
| GenAI App Builder (vence 2027) | Matching visual con Gemini Flash **después de migrar de API key a Vertex AI** | ~US$0.30/mes al volumen global supuesto |

El código actual usa `@google/generative-ai` + `GEMINI_API_KEY`; no asumir que consume créditos Vertex/GenAI.

## 2. Arquitectura recomendada

```text
routed_job JSON / trigger
  └─ Cloud Run Job: carousel-studio-render
       ├─ GCS input: uploads/{jobId}/
       ├─ Vertex AI Gemini Flash Vision → photo score
       ├─ Satori + Sharp → PNG slides
       └─ GCS output: carousel/{platform}/{jobId}/ + manifest.json
```

Usar Cloud Run **Job**: `src/index.tsx` es un orquestador batch y no abre HTTP. Si Brand OS requiere eventos, un Service/worker pequeño crea ejecuciones del Job y entrega el `routed_job` por GCS o variables validadas.

## 3. Servicios a provisionar YA

- Reutilizar Artifact Registry `brand-os` y bucket `brand-os-assets`.
- Crear definición del Cloud Run Job sólo después de corregir la imagen.
- Conceder a la runtime service account acceso mínimo a Vertex y al prefijo GCS.
- Mantener Secret Manager para compatibilidad temporal con API key; objetivo final: ADC sin key.
- Budget alerts y lifecycle de uploads/output.

No crear nuevas keys de service account. La versión `auradev-sa` existente es contingencia, no el patrón de autenticación de Cloud Run.

## 4. Specs de implementación

### 4.1 Bloqueadores detectados

1. El Dockerfile instala `--omit=dev` y luego ejecuta `npm run build`; TypeScript está en devDependencies.
2. Copia sólo `package.json` y usa `npm ci`, que requiere lockfile.
3. El CMD ejecuta `task:orchestrator`, que depende de `ts-node` (devDependency) incluso después de compilar.
4. `@brand-os/contracts` usa `file:../brand-os-infra/contracts`, fuera del contexto Docker normal.
5. Inputs se buscan en `assets/` (override `ASSETS_DIR`) y outputs se escriben a `output/` (override `OUTPUT_DIR`); ambos son locales/efímeros.
6. El matcher hace una llamada Gemini por imagen sin cap de cantidad/tamaño.

### 4.2 Variables objetivo

```bash
PROJECT_ID=positronica-labs
REGION=us-central1
AR_REPO=brand-os
ASSET_BUCKET=brand-os-assets
IMAGE="$REGION-docker.pkg.dev/$PROJECT_ID/$AR_REPO/carousel-studio"
```

Runtime: `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION`, `GCS_BUCKET`, `GCS_INPUT_PREFIX`, `GCS_OUTPUT_PREFIX=carousel`, `ROUTED_JOB_URI`, `GEMINI_MODEL`, `MAX_MATCH_IMAGES`, `MAX_IMAGE_BYTES`.

### 4.3 Comandos (no ejecutados por esta spec)

```bash
gcloud config set project "$PROJECT_ID"
gcloud services enable run.googleapis.com cloudbuild.googleapis.com \
  artifactregistry.googleapis.com storage.googleapis.com aiplatform.googleapis.com

gcloud artifacts repositories describe "$AR_REPO" --location="$REGION" >/dev/null 2>&1 || \
  gcloud artifacts repositories create "$AR_REPO" --repository-format=docker --location="$REGION"

gcloud storage buckets describe "gs://$ASSET_BUCKET" >/dev/null 2>&1 || \
  gcloud storage buckets create "gs://$ASSET_BUCKET" --location="$REGION" \
    --uniform-bucket-level-access --public-access-prevention

# Sólo después de corregir Docker/build/GCS:
gcloud builds submit --tag "$IMAGE:$(git rev-parse --short HEAD)" .
gcloud run jobs deploy carousel-studio-render \
  --image "$IMAGE:$(git rev-parse --short HEAD)" --region "$REGION" \
  --service-account "auradev@$PROJECT_ID.iam.gserviceaccount.com" \
  --cpu 2 --memory 4Gi --task-timeout 1800s --max-retries 1 \
  --set-env-vars "GOOGLE_CLOUD_PROJECT=$PROJECT_ID,GOOGLE_CLOUD_LOCATION=$REGION,GCS_BUCKET=$ASSET_BUCKET,GCS_OUTPUT_PREFIX=carousel,MAX_MATCH_IMAGES=20"
```

### 4.4 Terraform mínimo (`infrastructure/gcp/`)

```hcl
resource "google_cloud_run_v2_job" "render" {
  name     = "carousel-studio-render"
  location = var.region
  template {
    template {
      service_account = var.runtime_service_account
      timeout         = "1800s"
      max_retries     = 1
      containers {
        image = var.image
        resources { limits = { cpu = "2", memory = "4Gi" } }
        env { name = "GCS_BUCKET" value = var.asset_bucket }
        env { name = "GCS_OUTPUT_PREFIX" value = "carousel" }
        env { name = "MAX_MATCH_IMAGES" value = "20" }
      }
    }
  }
}
```

IAM runtime: `roles/aiplatform.user` y `roles/storage.objectUser` limitados al recurso requerido. La cuenta que despliega no debe ser la misma que renderiza.

### 4.5 Cambios de código

1. Docker multi-stage: instalar dev deps en builder, compilar, copiar `dist/` + runtime deps y ejecutar JS compilado.
2. Incluir/publicar `@brand-os/contracts` dentro del build context.
3. Migrar el matcher a Vertex AI con ADC; quitar dependencia de `GEMINI_API_KEY` en GCP.
4. Descargar imágenes allowlisted desde GCS a `/tmp`, validar MIME/tamaño y limitar el número de candidatos.
5. Subir slides + manifest a GCS y borrar temporales; no usar `output/` como resultado durable.
6. Pasar `routed_job` por `gs://.../job.json` con schema Zod, checksum e idempotencia por `jobId`.
7. Añadir smoke test de contenedor y prueba de re-run sin duplicar llamadas.

## 5. Burn rate mensual estimado

| Componente | Estimación |
|---|---:|
| Gemini Flash Vision | ~US$0.30/mes al volumen global supuesto |
| Cloud Run Job | <US$5/mes al inicio |
| GCS/Registry | <US$2/mes con lifecycle |

El matching es O(imágenes): registrar imágenes evaluadas, tokens/latencia y cortar en `MAX_MATCH_IMAGES`.

## 6. Plan de delegación de bajo costo

- Codex/OpenCode: Docker multi-stage, adapter GCS, Terraform y tests.
- GLM/DeepSeek: migración de variables y manifest/idempotencia.
- Staff/humano: IAM, validación Vertex/Billing y política de retención de fotos.

## 7. Criterios de Done

- [x] Key vieja revocada e historia purgada; nueva versión protegida (2026-07-12).
- [ ] Imagen construye desde checkout limpio y test suite pasa.
- [ ] Job lee un `routed_job` desde GCS y escribe todos los PNG + manifest.
- [ ] ADC funciona sin key JSON/API key en Cloud Run.
- [ ] Re-run del mismo `jobId` no duplica llamadas ni sobrescribe parcialmente.
- [ ] Billing confirma SKU/crédito de una prueba mínima en Vertex.

## 8. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Regresión: volver a crear/guardar SA JSON | Workload identity/ADC, org policy para bloquear keys y secret scanning |
| Imágenes maliciosas o enormes | MIME real, límites de bytes/píxeles, allowlist GCS y Sharp con límites |
| API key de Developer API no usa créditos | Vertex AI + ADC y verificación Billing antes de volumen |
| Resultado perdido en filesystem efímero | Upload atómico por slide + manifest final |
| Coste lineal por biblioteca de fotos | Cap de candidatos, prefiltrado local y caché de scores |
