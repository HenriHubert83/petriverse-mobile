# Feature parity checklist

Source baseline: Petriverse 0.3.0, be96d3e0641571cc37255fb8701ea83e20c28aee. Checkboxes below denote complete parity scopes. An open box can contain substantial implemented work; use the status table and implementation references to distinguish partial work from missing work. Mark complete only with implementation and verification evidence.

Checkpoint 2026-11-25: the 15-encounter route, guided opening, bloom/arrival director, ordinary ecology decisions, authored events, evolution/growth and in-memory retry are connected to a landscape touch/Skia screen with 21 original textures. Replit reported all 87 CPU groups, full typechecking, dependency checks and Expo Doctor passing. Henri subsequently confirmed actual play on his iPhone in landscape through Expo Go, with a screenshot at encounter 3 of 15. This is an initial native playtest; full gameplay and visual parity are not yet demonstrated. A subsequent save/menu increment passed 129 CPU groups and full typecheck and exported both native Hermes bundles. Henri then reported that it generally works on iPhone but found a rescued-spore save error and shrinking playfield. The current increment addresses those defects and adds camera controls and encounter checkpoint fallback. On 2026-11-26 Henri reported that he prefers the new layout, likes zoom/pan and that saving seems fine. This is positive follow-up iPhone feedback, with focused recovery/interruption and full-playthrough checks still open. See [encounter engine](ENCOUNTER_ENGINE.md) and [save behavior](SAVES.md) for coverage and exclusions.

The 2026-11-26 creature-content pass adds the complete 44-entry catalogue, 27 original form textures, helping visitors and seeded expedition creatures. Schema-1 journeys retain their previous ecology; new journeys enable the expanded content. The subsequent full-system pass implements Journal/cinema, home pond, habitats, colonies, settings, original audio and presentation. The phone check was explicitly deferred for this pass; CPU and build evidence do not establish native parity.

## Current implementation status

| Area | Implemented now | Remaining original scope or verification |
|---|---|---|
| Core play | Board/cells, loop input and capture, recovery, food/poison, Mother damage, nudge and CPU fluid simulation | Complete source comparisons, input edge cases and native fluid/optical presentation |
| Journey and ecosystem | 12 authored stages plus 3 seeded visits, guided opening, blooms/arrivals, ordinary species/forms, helping visitors, expeditions, habitat choices and three boss models | Full journey playtesting and original scene comparisons |
| Evolution and colony | Mutation offers/costs and effects, growth/roles, repairs, all three starting colonies and unlocks, comparison/reveal and saved retries | Native presentation and full-build playthrough |
| Mobile UI | Full-height dish, pinch/pan/Fit, scrolling accessible sidebar, title/Continue/New Journey, pond, Journal, cinema, experiments, settings, evolution and epilogue | Native layout and interruption verification across phone/tablet sizes |
| Interruptions | AppState pause, gesture cancellation, Android Back, bounded frame timing and background save request | Focused phone lock/background/multitouch and process-termination verification |
| Persistence | Full current encounter, autosave, independent profile/preferences, backup/checkpoint recovery, validation and schema-1/2 migration | Device recovery/process termination; desktop CFG import remains separate |
| Discoveries and home | 44-entry Journal, 44 live narrated demonstrations, offers/replay/subtitles, rescued residents, names, maturity, companions, gardens and ending pond | Native audio/visual and interaction verification |
| Presentation | Original artwork, biome plates, Mother specializations, Inter, native-compatible original music/narration/effects, source tissue/optics and quality controls | Native shader comparison, remaining detailed effects tracked by source matrix, performance and listening |
| Validation | CPU regression suites, full typecheck and Hermes exports are recorded per increment in DEVLOG; user-reported initial play and positive follow-up iPhone layout/zoom/save checks | Focused camera interruption/save recovery phone checks, full original regressions/playthrough, shader comparisons, Android, performance and release checks |

No reliable single completion percentage follows from these rows. A stage-transition test is not a full playthrough, and the initial iPhone test does not establish every shader path or organism interaction.

## Proposed save/menu work already exists in the original

| Capability | Pinned original behavior | Mobile status |
|---|---|---|
| Autosave | Every eight seconds or on journey-state changes, plus important actions and exit | Implemented for current encounter and transitions/background; spore/profile error repaired, followed by positive user-reported saving feedback |
| Continue / New Journey | Continue or view completed journey; start new; confirm replacement of an unfinished journey | Implemented title flow and paused restoration; initial user report is positive, detailed checklist remains |
| Main menu | Title plus home pond, advanced colonies, help, journal, experiments and settings | All entries connected; native flow verification pending |
| Interruption safety | Focus loss pauses; pausing cancels selection/nudge; continuing an active save restores paused | Pause/cancellation and save requests implemented; focused device verification pending |
| Save recovery tests | Primary/backup corruption, malformed checkpoint, failed writes, profile defaults and legacy migration | Snapshot/repository/profile/coordinator/integration tests pass; desktop CFG migration not implemented |

Source evidence: original [main/autosave and resume flow](https://github.com/HenriHubert83/petriverse/blob/be96d3e0641571cc37255fb8701ea83e20c28aee/prototype/scripts/main.gd), [title screen](https://github.com/HenriHubert83/petriverse/blob/be96d3e0641571cc37255fb8701ea83e20c28aee/prototype/scripts/title_screen.gd), [journey snapshots and recovery](https://github.com/HenriHubert83/petriverse/blob/be96d3e0641571cc37255fb8701ea83e20c28aee/prototype/scripts/journey_save.gd), and [save recovery tests](https://github.com/HenriHubert83/petriverse/blob/be96d3e0641571cc37255fb8701ea83e20c28aee/prototype/tests/save_recovery.gd). These are porting requirements. Mobile lifecycle integration adapts their intent to iOS and Android.

## Core
- [ ] Board and biome layouts, drifting cells and readiness.
- [ ] Draw 3-8-cell membranes; mutation-specific limits; swept hit tests, backtracking, closure and release.
- [ ] Reject self-crossing and Mother intersection; capture by nucleus; multi-nucleus rules.
- [ ] Food, poison, protection, clot/recovery, score, feedback and rescue.
- [ ] Nudge cysts and phages; cooldown and targeting; touch cancellation.
- [ ] Persistent 28 x 28 fluid simulation, impulses, transport and pause/snapshot.
- [ ] Guided first encounter, alternative input, assisted closure and deliberate capture.

## Journey
- [ ] All 12 authored stages and 3 seeded special visits; preserve source sequence, objectives, budgets, timers and difficulty.
- [ ] Stillwater, Glassgarden, Blue Deep; biome currents and habitats.
- [ ] Bellwether, Glass Regent, Conjoined; phase windows, shields and multi-heart attacks.
- [ ] Food web, hunters, food thieves, parasites, dividers, amoebas, bacteria, phages, cradles, linked threats, rare visitors and ecology events.
- [ ] All 12 mutations: fission, elastic, enzyme, frenzy, lure, residual, filter, feast, grazer, symbiosis, catalyst, nursery; offers, costs and tradeoffs.
- [ ] Wanderer, Weaver and Symbiont, unlocks, Mother growth from 3 to 7 organelles, roles and repair.
- [ ] Route choices, progression, retry, score-only flow/swift bonuses, mastery and epilogue.

## Discoveries and presentation
- [ ] 44 creature/form records and all live narrated demonstrations; subtitles, playback, replay and later.
- [ ] Field Journal, home pond, rescued residents, naming, maturity, relationships and earned gardens.
- [ ] Title screen, confirmation before replacing a journey, settings, help, objectives, feedback and evolution comparison/reveal.
- [ ] Original organism artwork, biomes, typography, music, narration and effects.
- [ ] All 15 shaders and 3 includes mapped to equivalent effects; verify tissue, optics, water, bridges, amoeba ingestion, particles and refraction.
- [ ] Landscape responsive UI, safe areas, large text, contrast, reduced motion, three visual quality modes and touch feedback.

## Reliability and release
- [ ] Mid-encounter save/resume, profile, preferences, backup recovery, validation and migration.
- [ ] Background pause/resume, interruption handling, offline operation.
- [ ] Regression tests mapped from original gating suites and visual fixtures.
- [ ] Device comparisons, frame time, memory and thermals on phones/tablets.
- [ ] Expo/Replit run and GitHub synchronization, Android/iOS export and signing.
- [ ] License, third-party notices, original creator attribution, written distribution permission, store metadata.
- [ ] No monetization, advertising, subscriptions or in-app purchases.

## Explicit scope decision still open
The original public Experiments entry exposes three isolated producer-lab scenes, now included in the mobile implementation. Earlier campaign/harvest fixtures, legacy 30-stage save routes and desktop CFG interoperability remain a compatibility scope decision. Preserve those references; do not treat a native build as evidence of those legacy modes. No intentional removal of current public features.

## Latest verification checkpoint

The completed 2026-11-26 implementation pass passed all 319 automated test groups, full typechecking, dependency compatibility and whitespace checks. iOS and Android Hermes production exports both succeeded with 132 referenced local runtime assets. Shader fixtures execute real CanvasKit CPU rendering. Henri deferred this round's phone check. The open parity checkboxes therefore continue to distinguish complete native verification from implemented features; see DEVLOG for exact scope and rendering approximations.
