# Mobile roadmap

Goal: complete mobile adaptation, not a reduced edition. Work in reviewable increments without requiring a separate miniature release. Original fork stays unchanged; use pinned baseline for comparisons. GitHub is source of truth; Replit is the mobile runtime/testing environment once a runnable app exists.

1. [x] Source architecture and inventory audit baseline (runtime checks outstanding).
2. [ ] Expo/TypeScript/Skia foundation; verify exact compatible SDK versions, test tooling, landscape config, GitHub/Replit run instructions and offline constraints.
3. [ ] Core simulation and geometry; early renderer vertical slice as an internal risk gate, not a reduced product. Validate fluid field, living tissue, refraction and touch response on actual hardware early.
4. [ ] Ecosystem and campaign: data-driven source rules, all authored and seeded stages, bosses, mutations, progression.
5. [ ] Complete renderer and original assets: all required effects, audio, live cinema, quality settings.
6. [ ] Full mobile UI, home pond, journal, accessibility and saves; integrate tests continuously rather than postponing.
7. [ ] Full gameplay and visual parity, device/performance testing; import to Replit as soon as useful for these checks, not necessarily after full conversion.
8. [ ] Beta, signing and store verification; release free after parity and distribution gates pass.

Proposed structure: src/engine, src/geometry, src/ecology, src/campaign, src/evolution, src/rendering, src/cinema, src/audio, src/storage, src/components, app, assets, data, tests, docs. Adapt to actual Expo scaffold. Keep gameplay independent from renderer. Avoid additional SDK dependencies until justified.

Current checkpoint (2026-11-25): the landscape mobile screen connects the encounter engine, 12 authored stages plus 3 seeded visits, lessons, ecology, evolution, growth and retry with 21 original textures. Replit reported all 87 CPU test groups, typecheck, dependency compatibility and Expo Doctor checks passing, and both platform bundles generated. Henri has confirmed an initial playable physical-iPhone landscape session through Expo Go; his screenshot shows encounter 3 of 15. Full gameplay, shader, interruption, performance and Android device verification remain open. See [coverage and runtime boundary](ENCOUNTER_ENGINE.md) and [current parity status](FEATURE_PARITY.md). The phase checkboxes represent complete scopes, not individual successful checks.

## Next original-feature port

Port the original durable journey/profile and title-screen behavior. This is existing game functionality, not an optional expansion:

1. Define and validate a versioned snapshot of the current encounter and journey, including live and retry RNG state, route, organisms, board/cell state, fluid, schedules, tutorial and evolution/completion state. Resume must preserve current encounter progress and avoid duplicate rewards or rerolled choices.
2. Add local storage with serialized writes, previous-valid-save recovery, version handling and useful errors. Follow the original eight-second autosave cadence plus significant transitions; add background saving without relying solely on a final suspension callback.
3. Connect the original Continue/New Journey entry flow and unfinished-journey replacement confirmation. Restore active encounters paused. Basic mobile background pausing and gesture cancellation already exist.
4. Port save/recovery regressions, including malformed data, primary/backup corruption, failed writes and migration; exercise phone close/reopen, lock/background interruptions and interrupted gestures. Profile support must eventually retain discoveries, records, residents and colony unlocks as those systems are completed.

Then continue the remaining original content and progression (forms, visitors, expeditions, habitats, colonies), home pond/journal/cinema, full visual/audio presentation and accessibility/settings. Validate these increments against the pinned original and on actual devices. No reduction of the complete-game goal is implied by this implementation order.
