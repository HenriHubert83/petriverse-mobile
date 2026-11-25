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

## Save/menu increment and next work

The current mobile save/menu increment is implemented: explicit full current-encounter snapshots, validated local storage and backup recovery, eight-second and transition/background saves, persisted current profile records, Continue/New Journey, replacement confirmation and paused restoration. All 129 CPU test groups and full TypeScript checking pass, and both native Hermes exports complete. Its physical-device menu/storage validation is still pending; follow [SAVES.md](SAVES.md).

Next, test close/reopen, lock/background interruptions, saved evolution/retry and cancelled replacement on the iPhone. Then continue the original creature/form catalogue and visitors/expeditions, habitat choices and additional colony gameplay, home pond/residents and journal/cinema. Complete settings/accessibility and original visual/audio presentation alongside those systems. Future state additions must extend/migrate the save schema rather than silently drop fields. Desktop Godot save import remains an explicit scope decision.

The whole-game goal is unchanged. This increment completes the current mobile persistence path, not the full original profile/menu/home-pond feature set or all device validation.
