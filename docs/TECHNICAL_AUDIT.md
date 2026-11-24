# Technical audit: Petriverse 0.3.0

Date: 2026-11-24
Reference: HenriHubert83/petriverse at be96d3e0641571cc37255fb8701ea83e20c28aee.
Upstream: TheMarco/petriverse.
Status: source architecture and inventory baseline reviewed; runtime validation and complete line-by-line semantic mapping remain open.

## Inventory
- Godot 4.7, GDScript, GL Compatibility, 1280 x 900 logical canvas, canvas_items stretch with aspect keep, 60 Hz physics. README reports testing with 4.7.2.
- 1,791 tracked files, 1,343,798,225 raw bytes (not packaged download size).
- 76 gameplay/application scripts, 88 test/visual fixture scripts, 15 shader files and 3 shared shader include files.
- prototype/assets: 81 PNG files (153,843,621 bytes), 70 OGG files (22,026,229 bytes), Inter TTF plus notice and Godot import/provenance metadata.
- Runtime candidate tree excluding prototype/artifacts and prototype/tests: 177,819,355 bytes, including code and metadata. Actual mobile package size unknown.
- data/board.json and data/creature_films.json. Most content and rules are authored in scripts rather than JSON.
- Exclude promotional trailer footage, development screenshots/videos, import sidecars, provenance files unnecessary to runtime, and dev fixtures from the shipping bundle. Preserve applicable provenance and notices in project records.

## Architecture and migration map
| Original files under prototype/scripts | Target responsibility |
|---|---|
| main, run_controller | Lifecycle, explicit state machine, fixed-step simulation, pause/resume, coordination |
| board, cell, input_controller, loop_geometry, loop_resolver, loop_strain, clot, capture_feedback | Logical geometry, swept pointer hits, valid closed loops, readiness, capture resolution, recovery |
| fluid_field, water_interaction, water_tracers, tissue_motion | Shared water simulation and rendering bridge |
| journey_plan, journey_route, journey_habitats, habitat_events, encounter_rhythm, journey_lesson | Authored stages, seed-based routes, pacing, habitat selection, tutorial |
| journey_harvest, harvest_flow, journey_mastery, mutations, evolution_anatomy, mother_damage | Objectives, food, score-only flow and swift bonuses, evolution, organelle growth/damage |
| journey_ecology, drifter, ecology_enemy, harvest_organism, amoeba, amoeba_system, bacterium, phage_cluster, phage_system, cyst_nudge, conjoined, journey_boss | Organisms, interactions, bosses, nudges, rescue, contact and infection |
| journey_discoveries, expedition_creatures, creature_forms, journey_profile, home_pond, pond_life | Discoveries, unlocks, residents, names, maturity, keepsakes |
| journey_save, records, main preferences, soundscape preferences | Versioned persistence, validated backup/recovery, independent profile, preferences |
| microscope, lens_optics, game_feel, amoeba_outline, amoeba_visual, phage_visual, mother_appearance, mission_appearance, injury_motes, organism_arrival | Layered Skia renderer, organic deformation, feedback, visual state |
| journey_hud, hud, readable_ui, ui_style, title_screen, mutation_card, evolution_comparison, evolution_reveal, dish_labels, journey_guidance, mother_alert, reticle_cursor | Responsive native interface and contextual input feedback |
| creature_cinema, creature_film_stage | 44 live narrated demonstrations, scripted simulation and camera, subtitles, replay, skip/later |
| soundscape | Music crossfade, voice/effect scheduling, interruption management |
| harvest, encounter, run_plan, producer_lab, producer_lab_rules | Legacy or developer paths; preserve as reference and classify player-facing exposure before scope decision |

This is a responsibility map, not a claim every line has been analyzed or ported.

## Rendering audit
| Shader / include | Migration strategy |
|---|---|
| amoeba_arm, amoeba_body | SDF capsule/outline composition, smooth union, texture sampling, ingestion masks; test alpha and bound expansion |
| cytoplasm_granules, living_cilia | Batched geometry/sprites with per-instance values; replace Godot INSTANCE_CUSTOM and vertex deformation |
| depth_tissue | Local coordinates, blur/depth and motion |
| fused_tissue | Multi-member masks/soft union, lighting and tissue texture |
| living_tissue | High-priority complex fragment port; organelle sites/damage, phenotype, infection, division, host texture, arrival and evolution |
| living_bridge, membrane | Dynamic paths, bridge tissue, animated membrane material |
| microscope_field | Biome plate, water impulses, lighting, sediment; explicit prefiltered texture/blur alternatives for textureLod |
| lens_optics | High-priority offscreen scene pass; chromatic shift, defocus, bloom, grain; UI composited afterward |
| phage | Transform and contraction |
| pond_specimen | Offscreen backdrop sampling for depth/refraction; avoid read/write feedback |
| pond_suspension, water_tracers | Instance batching and shared flow sampling; replace Godot-specific transforms |
| organic_motion, pond_optics, water_interaction | Shared math and illumination; explicit coordinate/unit conversions and flow-map child shader |

SkSL RuntimeEffect is a candidate, not a direct Godot shader replacement. Explicitly validate texture sampling, uniform arrays, coordinate conventions, premultiplied alpha, offscreen passes and device GPU support. Vertex-stage and instance semantics require alternate geometry or sprite batching. Do not silently remove gameplay-linked visual feedback. Preserve the original 240/560/960 grain quality concept and reduced-motion behavior, with device-informed tuning.

## Simulation and input
Use a framework-independent TypeScript simulation with fixed 60 Hz gameplay stepping and the original 28 x 28 fluid grid advancing at 20 Hz (documented). Preserve advection, viscosity, pressure projection, slip boundaries, impulses, drift caps, snapshots and pause semantics. Use reusable buffers and profile before moving work across threads. Keep React out of per-organism frame updates. Start with coordinate transforms and deterministic test fixtures; seeded RNG compatibility requires explicit investigation. Preserve swept hit circles across sparse touch events, backtracking, closure assistance, release validity, nudge priority, and cancellation on OS interruption. Support explicit tap/click alternative and touch cancel controls. UI input must not leak into simulation. No stretching/cropping the dish; handle safe areas and varied landscape ratios.

## Persistence and platform
journey_save.gd uses version 2 state snapshots and backup recovery; profile is independent. Port serializable state, atomic-equivalent writes, validation, backup recovery and schema migrations. Legacy desktop save import is a separate compatibility decision; original default campaign is 15 encounters and old routes may differ. Pause on background, persist and resume safely, avoid clock catch-up after interruption. OGG decoding on iOS requires device verification; transcode only when needed. Native builds, Expo Go compatibility and Replit import/publish recognition remain unverified.

## Verification and risks
Original release notes report 113 native Mac smoke checks; this is upstream evidence, not our test execution. Windows/Linux target execution is not confirmed by those notes. Test suite inventory includes geometry, integration, fluid dynamics, recovery, onboarding, journey rules, procedural routes, ecosystem, bosses, evolution, audio, save recovery and visual fixtures. Port assertions in dependency order; capture reference screenshots and motion sequences under matched seeds and times; compare full-quality and reduced-quality outputs. Benchmark frame time (16.7 ms target for 60 FPS), memory and thermals on actual iOS/Android devices. Validate build, signing, store distribution and asset attribution separately. No original or mobile game has been executed during this audit. No claim of measured visual fidelity, shader compatibility or performance.

## Audit acceptance
Architecture baseline sufficient to begin implementation. Keep detailed module semantics, test-by-test mapping, runtime reference capture, binary asset transfer, shader feasibility and platform checks open until evidenced. Audit becomes a living document, not a release certification.
