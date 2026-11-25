# Feature parity checklist

Source baseline: Petriverse 0.3.0, be96d3e0641571cc37255fb8701ea83e20c28aee. All entries start unverified and unimplemented on mobile. Mark only with implementation reference plus verification evidence. Do not confuse inventory with completion.

Checkpoint 2026-11-25: the 15-encounter route, guided opening, bloom/arrival director, ordinary ecology decisions, authored events, evolution/growth and in-memory retry are connected to a landscape touch/Skia screen with 21 original textures. All 87 CPU test groups pass, including phone-coordinate input traces and campaign transitions. UI syntax transformation passes. See [encounter engine](ENCOUNTER_ENGINE.md) for exact coverage and exclusions. The feature boxes below remain open because native runtime and complete-game parity are not yet demonstrated; transition tests are not a full playthrough.

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
