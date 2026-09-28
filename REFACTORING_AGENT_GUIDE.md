# Thermal Predictor — Refactoring Agent Guide

> **Revisão de 27/09/2026.** Substitui a versão que assumia deploy em
> containers e tratava a remoção do dashboard Streamlit como pendente de
> aprovação. As decisões tomadas desde então estão em
> [`documents/arquitetura_atual_diagnostico.md`](documents/arquitetura_atual_diagnostico.md)
> e incorporadas aqui. O que mudou: **não há deploy nem Docker**, o dashboard
> Streamlit **foi removido com dispensa explícita do product owner**, e a
> dependência invertida back-end → front-end **foi corrigida**.

## Mission

Refactor this repository into one maintainable Thermal Predictor product. The
supported runtime is a React web client calling a FastAPI service, which owns
prediction, metadata, model bundles, authentication, audit data, and the public
API contract.

The product runs **only on a local machine**. There is no deployment, no
container image, no orchestration and no hosted environment. "Running the
product" means two processes started by hand: `uvicorn` for the API and Vite for
the web client.

There must be exactly **one supported API service** and exactly **one canonical
API operation for each business capability**. In particular, a user submitting a
prediction must not cause two equivalent prediction requests or choose between
two API implementations.

Do not perform a broad rewrite. Preserve observable behaviour while moving it
behind clear boundaries, deleting only code that is proven unused. The
user-facing behaviours of **Resultados**, **Mapa térmico** and **Métricas
Estatísticas** are critical product scope.

## Read first

1. [`documents/arquitetura_atual_diagnostico.md`](documents/arquitetura_atual_diagnostico.md)
   — the diagnosis this guide acts on, with every claim verified against source.
2. `graphify-out/GRAPH_REPORT.md` — generated architecture graph, dated
   2026-09-26. **Its inventory predates the removals below**; use it to discover
   duplicate communities, not as a current file listing.
3. `contracts/README.md` and `contracts/api_v1.schema.json`.
4. `src/backend/README.md` and `src/frontend/DEMO.md`.
5. `scripts/README.md`, `models/manifest.json`, and `documents/documentacao.md`.

Treat `graphify-out/` as analysis output, not production source. It is useful
for discovering duplicate communities; it is not proof that a dependency is
live. Exclude `graphify-out/`, `venv/`, build output, and vendored third-party
code from future architectural scans.

## Decisions already applied

Do not re-propose these. The repository reflects them.

| Decision | State |
| --- | --- |
| React + FastAPI is the only supported runtime | Applied |
| `dashboard/` (Streamlit) removed, with its vendored Three.js copy | Applied 27/09/2026 |
| The capabilities lost with it are accepted as lost | Waived by the product owner — see below |
| No Docker, Compose, nginx or deployment | Applied 27/09/2026 — all such files deleted |
| The API owns its runtime catalog; it no longer reads `src/frontend/src/data/` | Applied — data moved to `src/backend/data/` |
| Orphaned files removed (`data/margens_por_sensor*.json`, Vite starter assets) | Applied |
| Root README points at the real product and documents the local run | Applied |

### The Streamlit waiver (explicit, granted)

The previous revision of this guide required "explicit product approval for a
deliberately different replacement before deleting `dashboard/stove_3d.py`".
**That approval was granted on 27/09/2026**, in these words: *"concordo em
perder as funcionalidades do streamlit, mesmo sem correlação no React"*.

Three capabilities were given up with no React equivalent, knowingly:

| Lost capability | Was in |
| --- | --- |
| Comparing up to 4 configurations side by side (RF09) | `render_new_query_page()` |
| CSV / Excel export of results (RF11) | `render_export_buttons()` |
| Access-history screen filterable by user (RF10) | `render_access_history_page()` |

The third is the cheapest to recover: `AccessLog` in `src/backend/app/db.py`
already persists one row per API call. Only a read endpoint and a screen are
missing — the data is being collected today.

The Streamlit 3D stove (`stove_3d.py`) was **not** a fourth loss. Its product
purpose — stove context plus severity by region — is already carried by the
React `ThermalMap3D`, which additionally offers per-sensor pins, colour modes
and an exploded view. Region severity in React lives in
`components/thermal-map/zoneStatus.ts` (`zoneStatusOf`, `worstSensorOf`,
`visibleLabelZones`). This remains a standing product requirement of the React
map, not a migration debt: see rule 10.

### The offline mock: kept, but bounded

`src/frontend/src/sources/LocalMockSource.ts` stays, for two reasons: it is the
deterministic, offline test double the whole front-end suite runs against
(`VITE_DATA_SOURCE=local` in `vite.config.ts`), and it is the demo that works
with no API running. Its constraints are non-negotiable:

- It must **never** be the default data source. `src/frontend/src/sources/index.ts`
  defaults to `api` in code, not only in `.env`.
- It imports the catalog from `@data/*`, an alias to `src/backend/data/` — the
  API's own files. It must never get its own copy of that data.
- Its output must never be presented as a real model result.

## Current-state facts

- There are no detected import cycles. Do not introduce any.
- `src/frontend/` is the React/Vite product. It uses `ApiSource` to call
  `/api/v1/*`, React Query for server data, and a lazy-loaded R3F/Three.js
  thermal map.
- `src/backend/` is the FastAPI service. It serves mock or real model
  predictions, authentication, metadata, metrics, and SQLite audit records, and
  owns the catalog in `src/backend/data/`.
- The API v1 contract is still represented more than once: front-end
  TypeScript (source), generated JSON Schema, hand-written Pydantic DTOs, and
  the two mock predictors. This is the main duplication left to resolve.
- `src/backend/app/predictors/mock.py` is a Python port of
  `LocalMockSource.ts`, kept in step by a parity fixture. This duplication is
  intentional only for the demo/test path and must not be expanded.
- `scripts/build_registry.py` and `scripts/export_models.py` duplicate parts of
  preprocessing/model logic that also exists in notebooks.

## Target architecture

Build toward these ownership rules. Directory names may be adopted
incrementally, but the dependency direction is mandatory.

```text
web application
  React UI -> generated typed API client -> FastAPI only

API service
  HTTP adapters -> application use cases -> domain ports
                                           |-> model-bundle adapter
                                           |-> metadata catalog adapter
                                           |-> auth/audit repositories

ML package
  ingest -> normalize -> feature pipeline -> train/evaluate -> model bundle

contracts
  versioned OpenAPI -> generated TypeScript client/types
```

Suggested eventual layout:

```text
apps/web/
services/api/app/
  api/                 # routes, DTO adapters, exception mapping
  application/         # prediction, metadata, metrics, audit use cases
  domain/              # policies, entities, ports; no FastAPI/SQL imports
  infrastructure/      # model bundles, SQL repositories, auth implementation
  data/                # catalog JSON served by the API (already moved here)
packages/contracts/    # OpenAPI and generated web artifacts
packages/ml/thermal_ml/# shared preprocessing, training, evaluation, export
research/notebooks/    # exploratory notebooks only; never runtime imports
```

`apps/web` may stay at `src/frontend` and `services/api` may stay at
`src/backend`; do not rename paths merely for aesthetics. There is no `infra/`
directory, because there is no infrastructure to configure.

## Non-negotiable design rules

1. **One API, API-only production client.** FastAPI is the only supported
   server API. In the path a real user takes, the browser must not load model
   artifacts, manifests, training statistics or prediction logic, and must not
   choose between a local mock and an HTTP source by accident. The bounded
   exception for the test double is described above and is build/test only.
2. **One prediction request per user action.** A click on "Prever" must issue
   one request to the canonical prediction operation. Today the front-end
   separately requests the submitted configuration and the reference
   configuration for the delta map (`usePredictionQuery` +
   `useReferencePredictionQuery` in `src/frontend/src/hooks/useThermalQueries.ts`).
   Refactor that into one response, or one explicitly batched request, when
   both are needed.
3. **One executable product.** React + FastAPI, started locally. Nothing else
   in this repository may present itself as an alternative current application.
4. **One contract source.** Make FastAPI/OpenAPI the machine-readable API
   source and generate TypeScript client/types from it. Do not manually change
   TypeScript, JSON Schema and Pydantic definitions independently.
5. **One model bundle per model-set version.** Artifacts, preprocessing,
   encodings, feature schema, metrics, validation data and provenance belong in
   the same immutable bundle, identified by `model_set_version`. The service
   loads a bundle by configured path/version, and never reads the web client's
   source tree to do it.
6. **Pure, testable domain logic.** Request validation, model routing,
   reliability classification and audit context must be testable without an
   HTTP server, browser or database.
7. **No silent fallbacks.** Invalid configuration, missing model artifacts,
   malformed manifests and unknown area-to-model mappings must fail at startup
   or produce an explicit typed error. Never default an unknown area to an
   algorithm.
8. **Demo is explicit.** The mock source stays opt-in and visibly labelled. It
   must never become the default by omission — the code default, not only
   `.env`, decides this.
9. **Keep business safety semantics.** The UI must continue to expose model
   version, confidence/reliability, error margin, active limit, and whether a
   limit is exceeded. A refactor must not turn an engineering decision aid into
   a bare temperature display.
10. **Preserve the critical screen experience.** `Resultados`, `Mapa térmico`
    and `Métricas Estatísticas` must remain usable throughout the migration.
    The React `ThermalMap3D` must keep its product purpose: recognisable stove
    context, severity by region, and discoverable visual feedback. This is a
    requirement on the React map itself — the Streamlit implementation that
    once also served this purpose is gone, by the waiver above.
11. **Local-only is a constraint, not a gap.** Do not add Dockerfiles, Compose
    files, nginx configuration, container registries, orchestration manifests
    or cloud deployment steps. If a change only makes sense because of a
    deployment that does not exist, it is out of scope.

## Canonical API rule

The target public API is one FastAPI process on `localhost`. It may expose
different endpoints for genuinely different capabilities, but it must not
expose parallel endpoints or clients that perform the same operation.

| Capability | Canonical operation | Rule |
| --- | --- | --- |
| Authenticate | `POST /api/v1/auth/login`, `GET /api/v1/auth/me` | Authentication is distinct from prediction. |
| Load form/catalog data | `GET /api/v1/metadata` | Cache by contract/model version; do not duplicate it in browser JSON. |
| Predict, including delta baseline | `POST /api/v1/predictions` | One request per submission. When delta is requested, return the submitted and reference comparison in the same response, or accept an explicit batch of named scenarios in that one request. |
| Validation metrics | `GET /api/v1/metrics` | Fetch only when the metrics view needs it; never calculate it through a second predictor client. |
| Saved scenario/audit history, if approved | A single dedicated history resource | Do not confuse it with the prediction route or client-memory history. |

Keep v1 available for existing clients. Introduce the combined
current/reference response as an additive v1 field only if backward compatible;
otherwise create `/api/v2/predictions`. The web client must use only the new
canonical operation once it is released, and the old two-query pattern must be
removed.

## Delivery sequence

Work in small, independently reviewable changes. Stop after each acceptance
gate; do not mix deletion, contract redesign, persistence migration and UI
rework in one change set.

### Phase 0 — Baseline and decisions ✅ done

- Supported flows recorded: login, metadata load, BR prediction, unavailable
  MX, targets filter, metrics, model provenance and 3D map rendering. The
  enumerated UI surface is in §6.1 of the diagnosis.
- The runtime decision (React/FastAPI, local-only) is recorded here and in the
  diagnosis; the legacy dashboard disposition is settled.
- The root README no longer points contributors at the Streamlit dashboard and
  documents the two-process local run.
- The offline mock decision is settled: kept as demo and test double, never the
  default.

### Phase 1 — Quarantine legacy code and generated output ✅ done

- `dashboard/` removed, including `dashboard/static/three` (1,4 MB vendored) and
  `stove_3d.py`, under the waiver recorded above. The npm-managed Three.js used
  by React is untouched.
- `data/margens_por_sensor*.json` and the Vite starter assets removed after
  confirming, by search, that nothing referenced them.
- All Docker artifacts removed: `docker-compose.yml`, `.dockerignore`,
  `src/backend/Dockerfile`, `src/frontend/Dockerfile`,
  `src/frontend/.dockerignore`, `src/frontend/nginx.conf`.
- Research notebooks kept. `documents/extras/plano_frontend.md` is marked
  historical where it still describes Compose.
- `graphify-out/` is user-created analysis output and was not altered.

**Gate met:** one supported UI, one authentication path, one documented way to
start the product.

### Phase 2 — Contract and client boundary

- Export versioned OpenAPI from FastAPI and place generated artifacts under a
  dedicated contracts package/directory.
- Generate the TypeScript client and API DTO types. Replace hand-written fetch
  serialization in `ApiSource` with a narrow authenticated transport wrapper
  around that client.
- Make a configuration submission produce one HTTP request (rule 2). Remove the
  separate reference-prediction query after migration.
- Move Portuguese variable/area copy into backend-owned catalog data and remove
  the mirrored copy modules — `src/backend/app/copy_pt.py` and
  `src/frontend/src/contract/glossary_copy.ts` currently hold the same text
  twice.
- Preserve v1 while it has consumers. Use `/api/v2` for breaking changes,
  including a semantic change to request identifiers.
- Canonicalize semantically equivalent prediction requests before hashing them.
  Keep an opaque trace/request ID distinct from a reproducible fingerprint.
- Add generated-contract freshness checks and API/web contract integration
  tests to the local check command.

**Gate:** adding or changing an API field fails generation/tests until the API
and web client agree; there is no hand-maintained parallel DTO definition, and
one user prediction action produces one prediction HTTP request.

### Phase 3 — Backend boundaries

- Split FastAPI routes from application services and infrastructure adapters.
- Replace `getattr(engine, "get_metrics")` capability probing with explicit
  interfaces/ports for prediction and metrics.
- Move router-built audit dictionaries into typed application audit events.
- Replace global cached settings/predictor access with lifecycle-managed,
  injectable dependencies.
- Make the predictor adapter responsible for loading and validating the model
  bundle. Validate every expected area/model mapping during startup.
- Keep external API behaviour stable while moving internals.

**Gate:** route handlers contain HTTP adaptation only; prediction behaviour is
covered by direct unit tests without FastAPI or SQLite.

### Phase 4 — Reproducible ML pipeline and model serving

- Extract preprocessing, feature encoding, train/evaluate, model export and
  registry construction from notebooks/scripts into `thermal_ml` modules.
- Make notebooks call the package instead of duplicating transformation code.
- Store bundle metadata with each model: feature schema, categorical mappings,
  dataset fingerprint, training parameters, evaluation metrics, validation
  method, artifact checksums and timestamps.
- Package all per-area models and their metadata together. Preserve the
  existing area-specific encodings; do not replace them with a global encoding
  without a model-validation decision.
- Add golden prediction tests for a fixed model bundle and tests that reject
  incompatible sklearn/model-bundle versions.

**Gate:** the service serves a versioned model bundle with no dependency on the
web client's source tree and no notebook execution. *(The data-ownership half of
this gate is already met: the catalog moved to `src/backend/data/` and
`scripts/build_registry.py` writes there.)*

### Phase 5 — Frontend simplification

- Keep React Query as the owner of server state.
- Split the configuration store into draft form state, submitted query state,
  visualization state and explicitly chosen history state.
- Decide whether history is session-only or an API-backed saved-scenario
  feature. Do not label in-memory React state as durable history. `AccessLog`
  already persists one row per API call but has no read endpoint — surfacing it
  is a decision, not new data collection.
- Keep visualization geometry/UI mapping in a dedicated visualization module;
  do not put FastAPI, model or business-policy logic in R3F components.
- Resolve existing lint warnings before adding features, especially state
  updates in effects and mutations of hook-derived values in the 3D path.

**Gate:** the web app runs solely against the real API client, and its primary
configuration/prediction flow has browser-level coverage.

### Phase 6 — Persistence, security and local operations

Scoped to a local-only product. Anything that only matters for a hosted
deployment is out.

- **Keep SQLite.** It is the right store for a single-user local tool, not a
  stepping stone. Do not introduce PostgreSQL.
- Replace the runtime `ALTER TABLE` calls in `src/backend/app/db.py` with an
  explicit, ordered and tested schema-migration step. A small hand-written
  migration module is enough; Alembic is optional and probably overkill. The
  requirement is that schema evolution is reviewable and repeatable, not that it
  uses a particular tool.
- Treat the default JWT secret as what it is: a **development credential**.
  Document that this application is not to be exposed on a network, and make
  the default value obviously non-production in configuration. Do not build a
  secret-management story for a product that is never deployed.
- Add one aggregate local check command that runs formatting/lint, backend
  tests, frontend tests, the generated-contract diff check and model-bundle
  validation, so a contributor can verify everything before pushing. Wiring the
  same command into GitLab CI is welcome but optional; container image builds
  and deployment pipelines are out of scope.
- Structured logs and a readiness endpoint help local debugging; trace IDs
  already exist (`X-Request-Id`). Do not add deployment-grade observability.

**Gate:** a clean clone can install, start, authenticate, predict with a real
model bundle and pass every test with one documented command sequence.

## Test and quality expectations

- Fix the backend test fixture so its database/temp path is configurable. It
  currently assumes a user temp directory.
- Do not weaken the mock parity tolerance to conceal behaviour drift.
- Retain tests for schema/version compatibility, model routing by area,
  canonical-option validation, reliability, audit provenance and unavailable
  architectures.
- Add tests for startup failures: missing bundle, malformed manifest, missing
  area model, incompatible artifact version.
- Add end-to-end tests for login, metadata, prediction, error rendering,
  metrics and the critical 3D selection-to-result interaction.
- Keep browser-level acceptance coverage for the three critical screens. At
  minimum, assert that the 3D map loads, shows severity by region and reacts to
  selection.
- Add a browser/network assertion that submitting a prediction creates exactly
  one request to the canonical prediction operation, including when the delta
  visualization is enabled.
- Keep per-test timeout overrides out of the suite: `testTimeout` in
  `vite.config.ts` is the single knob, and a hardcoded value in an `it(...)`
  silently overrides it and reintroduces load-dependent flakiness.
- Make lint and type-check failures blocking once existing warnings are fixed.

## Files and boundaries to handle carefully

| Area | Current location | Required treatment |
| --- | --- | --- |
| Supported web app | `src/frontend/` | Preserve; convert to generated API client and simplify state. |
| Supported API | `src/backend/` | Preserve public v1 behaviour; refactor internals behind ports/use cases. |
| API-owned catalog | `src/backend/data/` | Written by `scripts/build_registry.py`, read by `app/data.py`, served over HTTP. Never read it from the web client at runtime. |
| Contract | `contracts/`, frontend `contract/v1.ts`, backend `schemas.py` | Consolidate through generated OpenAPI artifacts; version breaking changes. |
| Real models | `models/`, `scripts/export_models.py` | Turn into immutable model bundles with provenance. |
| Notebooks | `notebooks/` | Research/documentation only; extract shared executable code. |
| Graph output | `graphify-out/` | Read-only analysis aid; exclude from scans and commits unless asked. |

## Completion criteria

The refactor is complete only when all of these are true:

- The repository documents one supported application and one supported startup
  path, both local. ✅
- The React client obtains every runtime prediction/model datum from the API.
- The API owns its metadata ✅ and loads a self-contained, versioned model
  bundle.
- Contract types are generated rather than manually mirrored.
- Legacy Streamlit code is gone, with no live reference. ✅
- No Docker, Compose or deployment configuration exists in the repository. ✅
- The three critical screens keep their product behaviour, with browser-level
  coverage proving it.
- Model training, export and serving share one tested Python implementation.
- Database evolution is migration-based and reviewable.
- One documented command sequence proves type safety, contract compatibility,
  model-bundle validity, API/web integration and the main user journey.

## Do not do these things

- Do not reintroduce Docker, Compose, nginx or any deployment configuration.
- Do not rewrite the React interface or 3D visualization merely because the
  architecture is changing.
- Do not regress the `Resultados` / `Mapa térmico` / `Métricas Estatísticas`
  experience; the React map must keep stove context and severity by region.
- Do not delete the notebooks, models, data files or documents in the same
  change that introduces a new runtime boundary.
- Do not expose the model selection algorithm as a client request parameter.
- Do not make browser-local mock output look like real model output.
- Do not give the web client its own copy of the API's catalog data.
- Do not silently repair bad model manifests or fallback to another area model.
- Do not copy training data, model manifests or domain glossary text into a
  second runtime just to make a build convenient.
- Do not treat Graphify inferred semantic edges as verified runtime imports.
