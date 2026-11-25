# Feature parity checklist

Source baseline: Petriverse 0.3.0, be96d3e0641571cc37255fb8701ea83e20c28aee. Checkboxes below denote complete parity scopes. An open box can contain substantial implemented work; use the status table and implementation references to distinguish partial work from missing work. Mark complete only with implementation and verification evidence.

Checkpoint 2026-11-25: the 15-encounter route, guided opening, bloom/arrival director, ordinary ecology decisions, authored events, evolution/growth and in-memory retry are connected to a landscape touch/Skia screen with 21 original textures. Replit reported all 87 CPU groups, full typechecking, dependency checks and Expo Doctor passing. Henri subsequently confirmed actual play on his iPhone in landscape through Expo Go, with a screenshot at encounter 3 of 15. This is an initial native playtest; full gameplay and visual parity are not yet demonstrated. See [encounter engine](ENCOUNTER_ENGINE.md) for coverage and exclusions.

## Current implementation status

| Area | Implemented now | Remaining original scope or verification |
|---|---|---|
| Core play | Board/cells, loop input and capture, recovery, food/poison, Mother damage, nudge and CPU fluid simulation | Complete source comparisons, input edge cases and native fluid/optical presentation |
| Journey and ecosystem | 12 authored stages plus 3 seeded visits, guided opening, blooms/arrivals, ordinary species behavior, three boss models | Complete species/form assignment, rare visitors/expeditions, habitats and full journey playtesting |
| Evolution and colony | Mutation offers/costs and effects, Mother growth/roles, repairs, in-memory retry | Additional starting colonies/unlocks, profile connections and full original evolution presentation |
| Mobile UI | Landscape gameplay, objectives, briefings, pause, adaptation, retry and ending | Original title/menu, Continue/New Journey flow, help, settings and accessibility controls |
| Interruptions | AppState inactive/background pause, touch cancellation, Android Back pause, bounded frame timing | Durable saving plus focused phone lock/background/multitouch verification |
| Persistence | In-memory journey and retry; component fluid/phage snapshots | Full current-encounter save/restore, durable profile/preferences, backup recovery, validation/migration and whole-save tests |
| Discoveries and home | Discovery/rescue/mastery data accumulated by the encounter model | Full 44 creature/form records, journal, narrated cinema, home pond/residents and gardens |
| Presentation | 21 original base textures, basic cues, CPU tracers, membrane shader/fallback | Remaining art/forms, fonts, tissue/optics/ingestion/particles, music/narration/effects and quality options |
| Validation | 87 CPU groups and Replit setup checks reported passing; initial user-reported iPhone playtest | Full original regression coverage, complete playthrough, shader comparisons, Android, frame/memory/thermal and release checks |

No reliable single completion percentage follows from these rows. A stage-transition test is not a full playthrough, and the initial iPhone test does not establish every shader path or organism interaction.

## Proposed save/menu work already exists in the original

| Capability | Pinned original behavior | Mobile status |
|---|---|---|
| Autosave | Every eight seconds or on journey-state changes, plus important actions and exit | Missing durable storage |
| Continue / New Journey | Continue or view completed journey; start new; confirm replacement of an unfinished journey | Missing startup flow; new journey currently offered only at the ending |
| Main menu | Title plus home pond, advanced colonies, help, journal, experiments and settings | Gameplay screen only; full original menu missing |
| Interruption safety | Focus loss pauses; pausing cancels selection/nudge; continuing an active save restores paused | Basic mobile pause/cancellation implemented; persistence and device interruption verification missing |
| Save recovery tests | Primary/backup corruption, malformed checkpoint, failed writes, profile defaults and legacy migration | Component snapshot tests exist; complete durable-save recovery tests missing |

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
The original contains developer-only experiments, earlier campaign/harvest fixtures and legacy save route support. Preserve references; determine which are publicly accessible and whether desktop save interoperability is required before declaring parity. No intentional removal of current public features.
