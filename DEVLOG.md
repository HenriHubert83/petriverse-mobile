# Development log

## 2026-11-24 | Foundation: pinned source and audit baseline

- Established independent mobile repository; original Godot fork is retained as reference.
- Pinned upstream reference version 0.3.0 at be96d3e0641571cc37255fb8701ea83e20c28aee.
- Inventoried source, tests, assets and shader/include files; reviewed key gameplay, rendering, fluid, UI and persistence architecture.
- Copied original CC BY-NC 4.0 license without modification and recorded attribution, planned changes and remaining rights checks.
- Established feature parity checklist and staged roadmap, prioritizing early shader/fluid validation.
- No runnable application yet; no device or runtime tests performed. No gameplay or visual parity claims. No modifications to original fork.
- Next: create Expo-compatible scaffold with tested dependency versions and begin deterministic simulation and rendering foundations.

## 2026-11-25 | Phase 02 foundation

- Created phase-02-foundation and mapped 182 upstream scripts, shader files/includes and test fixtures.
- Added Expo SDK 58 configuration, landscape shell, Skia diagnostic and Replit tunnel command. Versions checked against Expo SDK 58 bundledNativeModules.json. No native dependencies installed or native runtime executed yet.
- Translated loop_geometry.gd to TypeScript, retaining constants and predicates. Local strict typecheck passed; four test groups passed with Node 22 type stripping (local test import extension adjusted). Local geometry source blob matched GitHub blob 42576b2f0395e79590b38d0adcf8dbec04bdb3f9. Full upstream assertions and integration pending.
- New code and config checked for email-address patterns before writing. No unnecessary personal contact information, accounts or analytics planned; preserve required attribution and license notices.
- Network DNS restriction prevented fetching packages in the local environment. Native validation, lockfile, original artwork, real shaders, fluid simulation and gameplay remain open. Changes on development branch only.

## 2026-11-25 | Board, cell state and membrane input

- Copied original board.json byte-for-byte from pinned source. Ported board.gd, cell.gd and input_controller.gd to standalone TypeScript.
- Preserved 24 anchors, 56 edges, 32 triangles, three biome transforms, 60 Hz fixed-step drift, speed and spacing limits, triangle winding, bond intersection and Mother clearance constraints. Fluid sampler interface prepared; actual fluid module pending.
- Preserved recovery, captivity/loss, swept pointer hit detection, free polygon connections, backtracking, reopening, assisted closure, stale readiness recheck and cancellation. Adapted right-click warning to generic cancel; added guards for invalid numeric inputs. This is an input model, not yet native gesture integration.
- Added seven local test groups based in part on node_drift, free_polygons and mother_boundary fixtures. Strict TypeScript 5.8.3 compile and all 11 geometry/board/input/cell groups passed under Node 22.16.0, including five simulated minutes in each of three biomes. All seven local test/data/source file Git blob hashes matched committed versions. JS double precision and Godot numeric behavior may differ; no claim of exact trajectory parity with an executed Godot build.
- Full original run/GUI assertions, capture resolver, fluid physics, shaders, assets and native Expo validation remain pending. Changes remain on phase-02-foundation, draft PR #1. New file contents scanned for email-address patterns before commit.

## 2026-11-25 | Capture dispatch and persistent fluid field

- Ported loop_strain.gd constants, long-link recovery penalty and edge tint. Ported the recovery, pulse damage and membrane limits subset of mutations.gd into captureRules.ts.
- Ported shared target eligibility, multi-nucleus enclosure, preview and validated journey capture dispatch from loop_resolver.gd. Cell spending occurs before the journey harvest callback as in the source. The real journey harvest and legacy resolver branches remain pending; callback tests do not represent implemented food or scoring behavior.
- Ported fluid_field.gd: 28 x 28 grid, 20 Hz step, ambient eddies, stroke momentum, viscosity, advection, nine pressure sweeps, wall/Mother slip, material transport, normalized RGBA buffer and snapshots. Reusable typed buffers replace Godot packed arrays; velocities/transport use JS double precision, pressure/divergence use float32. No native texture upload yet. Snapshot restoration expects a reset field of matching geometry; invalid inputs are rejected.
- Added six local regression groups in tests/fluidCapture.test.ts. Strict TypeScript 5.8.3 compilation and all 17 accumulated Node 22 tests passed, including seed reproducibility, persistent wakes, 30/144 Hz field equivalence, JSON snapshot continuation, bounds, held-cell drift, mutation recovery and shared capture predicates. All five newly committed source/test blob hashes matched locally tested versions. No Godot differential or native device benchmark performed.
- Remaining: clot animation and recovery integration, visual wake/tracer ports, actual journey harvest, full simulation lifecycle, native shader and asset rendering, Expo dependency installation and device validation. Original fork unchanged. Development branch only. New file content scanned for email-address patterns.

## 2026-11-25 | Phase 03: organic presentation foundations

- Ported clot.gd (cell-timer-driven contraction, absorption, recovery, Mother clearance and frenzy exclusion), water_interaction.gd (six visual wakes and bounded displacement) and water_tracers.gd (960 motes, inertia, bounds, quality counts, pause and reduced motion). Tracer visual-only PRNG is deliberately different from Godot; gameplay RNG unaffected. GPU batching and the original tracer shader remain pending.
- Translated organic_motion.gdshaderinc and membrane.gdshader into SkSL source. Wired membrane RuntimeEffect to the synthetic diagnostic at original dish coordinates, with a fallback for null shader compilation. Native compilation, shader typecheck, actual textures and GPU fidelity remain unverified. Diagnostic uses stronger alpha than the original solely for visibility.
- Strict TypeScript 5.8.3 compilation passed for the three new CPU modules using local type-only Point and WaterSource declarations and the exact committed Cell module. Six new regression tests passed under Node 22.16.0 using compiled modules (only local test import paths adjusted). Source and test Git blob hashes match repository versions. Tracer tests use a deterministic constant-flow fixture, not an executed Godot or full mobile run. Historical 17 prior tests were not rerun in this session.
- Added pinned manifest of 153 original PNG/OGG/TTF/TXT assets (176,749,008 bytes) and a development-only Node importer with per-file length and Git SHA-1 checks. No binaries downloaded because local network DNS is unavailable. Run node scripts/import-assets.mjs --dry-run, then node scripts/import-assets.mjs on network-enabled development host after reviewing rights. Text notices must be reviewed and preserved separately before shipping; no runtime asset fetching. Importer itself not run in this session.
- New content scanned for email-address patterns. All commits on phase-02-foundation, draft PR #1; original fork and main unchanged.

## 2026-11-25 | Organism behavior and shared optical shaders

- Ported drifter.gd and harvest_organism.gd: logical nuclei, shellback armor, twinspore paired nuclei, pulse eligibility, stun/slow/feeding movement, lure, authored plankton drift, advection, nudge easing, cradle opening and lifetime/fade rules. Source-level fields retained for future ecology and save integration. No food reward, spawning, hunting AI or campaign integration claimed.
- Translated pond_optics.gdshaderinc, water_interaction.gdshaderinc and living_bridge.gdshader to SkSL source, including local lighting, immersion tone, wake math, fluid sampling and animated linked tissue. Child image coordinates and premultiplied color output explicitly adapted to Skia. Fluid child shader must expose raw linearly sampled displacement channels; the existing RGBA buffer cannot simply be treated as a color-managed premultiplied image. Native compilation and actual texture wiring pending.
- Strict local TypeScript compilation of the two organism classes and seven regression groups succeeded; all seven passed under Node 22.16.0. Local Point type stub matches public type; exact source and test Git hashes verified against committed blobs. Previous 23 historical tests not rerun. No Godot differential execution or native testing.
- All new file contents scanned for email-address patterns; development branch phase-02-foundation, draft PR #1. Original fork and main unchanged. Next: specialized ecology and boss behavior, journey outcome rules, living tissue and microscope optics, actual runtime integration and asset/device validation.

## 2026-11-25 | Specialized organisms, amoeba rescue and phage infection

- Ported ecology_enemy.gd, amoeba.gd, bacterium.gd, phage_cluster.gd, legacy conjoined.gd, amoeba_system.gd and phage_system.gd. Preserved emergence, species movement, capture eligibility, 2.8-second amoeba reach, 15-second rescue deadline, 1.25-second return, maximum four missing cells, rescue site reservation, 5-second stagger and nine-ready-cell safeguard. Preserved phage contact radius, two-cluster cap, bacterial-only infection, nine-second rupture, salvage as food organisms, counters, transient burst water sources and cluster snapshots. The current journey bosses are separate from legacy Conjoined.
- Context interfaces isolate systems from the future run controller. Typed instance checks replace Godot's dynamic species dispatch; the restored run must instantiate the corresponding classes. Full food-web AI, nudge controller, capture reward logic, encounter spawning, integrated pause/save validation and visual effects remain pending. Phage snapshots are tested with valid JSON; validation of malformed saved data is deferred to the versioned save layer.
- Local strict TypeScript 5.8.3 compilation succeeded using a type-only WaterSource declaration matching the fluid module. Node 22.16.0 ran nine new specialized ecology groups and reran seven existing organism groups: 16 passed, zero failures. Tests use controlled journey fixtures, not full Board/Run simulation or a native build. All seven new implementation files, both test files and four existing runtime dependency files matched GitHub blob hashes. Of the 39 historically passing groups, 23 earlier non-ecology groups were not rerun in this session.
- No shaders or binaries changed in this increment. New file contents screened for email-address patterns. Development branch phase-02-foundation, draft PR #1; original fork and main unchanged. Next: nudge and arrival rules, journey harvest outcome and food-web integration, current journey bosses, microscope/living-tissue shader work and native validation.
