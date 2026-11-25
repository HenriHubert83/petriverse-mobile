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

Current checkpoint (2026-11-25): the headless encounter now joins geometry, fluid, organisms, harvest, health, recovery and boss phases. All 67 CPU test groups pass. The next content integration is source stage data, bloom/wave scheduling and lessons, alongside installed Expo/typecheck/device validation on a supported development host. See [coverage and runtime boundary](ENCOUNTER_ENGINE.md). No roadmap phase is declared complete solely from these CPU results.
