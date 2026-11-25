# Petriverse Mobile

An independent, free landscape mobile adaptation of **Petriverse**, originally created by Marco van Hylckama Vlieg.

- Original: https://github.com/TheMarco/petriverse
- Reference fork: https://github.com/HenriHubert83/petriverse
- Pinned reference: `be96d3e0641571cc37255fb8701ea83e20c28aee` (0.3.0)
- Stack: React Native, Expo, TypeScript, React Native Skia.
- Targets: iOS and Android. Offline, no ads, no in-app purchases.

**Status: integrated encounter foundation.** The `phase-02-foundation` branch includes geometry, persistent fluid, organism behavior, capture rewards, Mother damage, boss phases and a headless encounter simulation. All 67 CPU regression test groups passed on 2026-11-25. `App.tsx` still displays a synthetic Skia diagnostic; campaign generation and the playable mobile interface are pending. Expo installation, full TypeScript checking, native shader compilation and device testing remain unverified. Main remains the audit baseline until review and merge.

## Development
See [encounter engine](docs/ENCOUNTER_ENGINE.md), [technical audit](docs/TECHNICAL_AUDIT.md), [feature parity](docs/FEATURE_PARITY.md), [roadmap](docs/MOBILE_ROADMAP.md), and [development log](DEVLOG.md). GitHub is the source of truth; import into Replit when the mobile workspace is runnable. Declared dependency versions still need an installed SDK compatibility check and a committed lockfile.

On a development host with dependencies available, run `npm install`, `npm test`, `npm run typecheck`, `npm run check:deps` and `npm run doctor`. A passing CPU test suite does not validate the Expo app or its GPU effects.

## Credits and license
See [CREDITS.md](CREDITS.md) and [LICENSE](LICENSE). Preserve third-party notices and record all adaptation changes. Store distribution and third-party asset rights must be verified before publication.
