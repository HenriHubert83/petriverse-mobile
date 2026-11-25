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

## Current mobile foundation and next work

The mobile save/menu and camera increments are implemented: exact current-encounter snapshots, local backup and encounter checkpoint recovery, independent profile saving, eight-second and transition/background saves, Continue/New Journey, replacement confirmation, paused restoration, a full-height stable dish and two-finger zoom/pan with Fit controls. The save/camera checkpoint passed all 148 CPU groups, full TypeScript checking and both native Hermes exports.

On 2026-11-26 Henri reported that he likes the new layout much better, likes zooming and moving around, and that saving seems fine in the physical-iPhone workflow. This is positive follow-up testing of ordinary use. Focused interruption/recovery checks and a full journey playthrough remain open, but they need not block porting the remaining original content. Follow [SAVES.md](SAVES.md) for the detailed checklist.

The creature-content block is now implemented: 44 original catalogue entries, 27 form textures, seeded ordinary forms, three helper visitors, 12 possible expedition forms with one chosen per biome, and persistent discovery/rescue identities. The latest pass has 173 passing CPU tests and full TypeScript checking. Schema-1 saves retain old ecology; new journeys enable the additions. The next block is the Field Journal and home pond/resident interactions, followed by narrated discoveries. Habitat choices and additional colony gameplay remain separate original systems to port. Complete settings/accessibility and original visual/audio presentation alongside those systems.

Future state additions must extend/migrate the save schema rather than silently drop fields. Desktop Godot save import remains an explicit scope decision. The whole-game goal is unchanged; the playable foundation does not establish full original content or presentation parity.
