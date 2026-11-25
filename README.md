# Petriverse Mobile

An independent, free landscape mobile adaptation of **Petriverse**, originally created by Marco van Hylckama Vlieg.

- Original: https://github.com/TheMarco/petriverse
- Reference fork: https://github.com/HenriHubert83/petriverse
- Pinned reference: `be96d3e0641571cc37255fb8701ea83e20c28aee` (0.3.0)
- Stack: React Native, Expo, TypeScript, React Native Skia.
- Targets: iOS and Android. Offline, no ads, no in-app purchases.

**Status: playable mobile checkpoint, with an initial physical-iPhone playtest.** The `phase-02-foundation` branch connects 12 authored stages and 3 seeded visits, blooms and timed arrivals, a guided opening, evolution, growth and encounter retry to a landscape touch/Skia screen with 21 original textures. On 2026-11-25 Henri reported that the game runs, looks acceptable so far and is playable in Expo Go on his iPhone in landscape; his screenshot shows encounter 3 of 15. This confirms an initial native rendering and basic interaction test, not a complete playthrough, detailed shader comparison or performance benchmark.

Replit reported all 87 CPU regression test groups, full TypeScript checking, Expo dependency checks and all 20 Expo Doctor checks passing on 2026-11-25. Dependencies are locked, and Metro generated iOS and Android development bundles. The four Replit setup commits are preserved on GitHub through `11e965a07deae2a1a5c348c234df57230e5fb75f`. Android physical-device testing, focused interruption tests and broader native visual/performance validation remain outstanding. Main remains the audit baseline until review and merge.

The journey currently lives in memory. Closing the application loses its progress. Complete creature forms and visitors, habitat choices, the home pond, profile/save support, audio, accessibility options and full visual parity are still being ported. This is not yet the complete original game or a tested mobile release.

Autosaving, Continue/New Journey, the title menu, focus-loss pausing and backup-recovery tests all have counterparts in the original game. Basic mobile background pausing and gesture cancellation already exist; durable saves and the original title/profile flow do not. The next porting increment is full mid-encounter persistence and validated recovery, followed by its Continue/New Journey menu. See the [current parity status](docs/FEATURE_PARITY.md).

## Development
See [encounter engine](docs/ENCOUNTER_ENGINE.md), [technical audit](docs/TECHNICAL_AUDIT.md), [feature parity](docs/FEATURE_PARITY.md), [roadmap](docs/MOBILE_ROADMAP.md), and [development log](DEVLOG.md). GitHub is the source of truth. See [Replit run instructions](replit.md) for the Expo Go tunnel workflow and setup verification. Dependency versions have passed the installed SDK compatibility check; `package-lock.json` records the resolved versions.

On a development host, run `npm ci`, `npm test`, `npm run typecheck`, `npm run check:deps` and `npm run doctor`, then `npm run ios` or `npm run android`. For a physical phone outside Replit's network, use `npm run start:tunnel -- --port 8080` and scan the console QR code with Expo Go supporting SDK 58. A passing CPU test suite does not validate the Expo app or its GPU effects. The 21 base organism textures are already local; the full asset importer is not required for this checkpoint.

## Credits and license
See [CREDITS.md](CREDITS.md) and [LICENSE](LICENSE). Preserve third-party notices and record all adaptation changes. Store distribution and third-party asset rights must be verified before publication.
