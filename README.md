# Petriverse Mobile

An independent, free landscape mobile adaptation of **Petriverse**, originally created by Marco van Hylckama Vlieg.

- Original: https://github.com/TheMarco/petriverse
- Reference fork: https://github.com/HenriHubert83/petriverse
- Pinned reference: `be96d3e0641571cc37255fb8701ea83e20c28aee` (0.3.0)
- Stack: React Native, Expo, TypeScript, React Native Skia.
- Targets: iOS and Android. Offline, no ads, no in-app purchases.

**Status: mobile gameplay integration, awaiting native validation.** The `phase-02-foundation` branch now connects 12 authored stages and 3 seeded visits, blooms and timed arrivals, a guided opening, evolution, growth and encounter retry to a landscape touch/Skia screen. `App.tsx` opens this screen with 21 original textures. All 87 CPU regression test groups, full TypeScript checking, Expo dependency checks and all 20 Expo Doctor checks passed on 2026-11-25. Dependencies are installed and locked, and Metro successfully generated iOS and Android development bundles. Native shader execution and device testing remain unverified. Main remains the audit baseline until review and merge.

The journey currently lives in memory. Closing the application loses its progress. Complete creature forms and visitors, habitat choices, the home pond, profile/save support, audio, accessibility options and full visual parity are still being ported. This is not yet the complete original game or a tested mobile release.

## Development
See [encounter engine](docs/ENCOUNTER_ENGINE.md), [technical audit](docs/TECHNICAL_AUDIT.md), [feature parity](docs/FEATURE_PARITY.md), [roadmap](docs/MOBILE_ROADMAP.md), and [development log](DEVLOG.md). GitHub is the source of truth. See [Replit run instructions](replit.md) for the Expo Go tunnel workflow and setup verification. Dependency versions have passed the installed SDK compatibility check; `package-lock.json` records the resolved versions.

On a development host, run `npm ci`, `npm test`, `npm run typecheck`, `npm run check:deps` and `npm run doctor`, then `npm run ios` or `npm run android`. For a physical phone outside Replit's network, use `npm run start:tunnel -- --port 8080` and scan the console QR code with Expo Go supporting SDK 58. A passing CPU test suite does not validate the Expo app or its GPU effects. The 21 base organism textures are already local; the full asset importer is not required for this checkpoint.

## Credits and license
See [CREDITS.md](CREDITS.md) and [LICENSE](LICENSE). Preserve third-party notices and record all adaptation changes. Store distribution and third-party asset rights must be verified before publication.
