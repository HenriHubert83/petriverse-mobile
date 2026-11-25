# Petriverse Mobile

An independent, free landscape mobile adaptation of **Petriverse**, originally created by Marco van Hylckama Vlieg.

- Original: https://github.com/TheMarco/petriverse
- Reference fork: https://github.com/HenriHubert83/petriverse
- Pinned reference: `be96d3e0641571cc37255fb8701ea83e20c28aee` (0.3.0)
- Stack: React Native, Expo, TypeScript, React Native Skia.
- Targets: iOS and Android. Offline, no ads, no in-app purchases.

**Status: playable mobile checkpoint, with an initial physical-iPhone playtest.** The `phase-02-foundation` branch connects 12 authored stages and 3 seeded visits, blooms and timed arrivals, a guided opening, evolution, growth and encounter retry to a landscape touch/Skia screen with 48 original textures and the original 44-entry creature catalogue. On 2026-11-25 Henri reported that the game runs, looks acceptable so far and is playable in Expo Go on his iPhone in landscape; his screenshot shows encounter 3 of 15. This confirms an initial native rendering and basic interaction test, not a complete playthrough, detailed shader comparison or performance benchmark.

Replit reported all 87 CPU regression test groups, full TypeScript checking, Expo dependency checks and all 20 Expo Doctor checks passing on 2026-11-25. Dependencies are locked, and Metro generated iOS and Android development bundles. The four Replit setup commits are preserved on GitHub through `11e965a07deae2a1a5c348c234df57230e5fb75f`. Android physical-device testing, focused interruption tests and broader native visual/performance validation remain outstanding. Main remains the audit baseline until review and merge.

The app now has Continue/New Journey, eight-second and transition/background saves, exact current-encounter restoration, backup recovery and persistent profile records. Henri reported that this version generally works on his iPhone, but found a save-preparation error after rescuing a spore and a warning banner that shrank the dish. The current increment fixes that profile-validation failure, isolates profile errors from journey saves and adds an encounter checkpoint fallback. See [save behavior and testing](docs/SAVES.md).

The landscape gameplay view gives the dish the full available height. One finger draws or nudges; two fingers pinch to zoom and drag to pan. Separate +, − and Fit controls remain outside the touch surface. Objectives and instructions sit in the sidebar, and save warnings cannot change the playfield dimensions. On 2026-11-26 Henri reported that he prefers the new layout, likes zooming/moving around, and that saving seems fine on his iPhone. This is positive follow-up feedback on ordinary use; focused interruption/recovery checks, a full playthrough and Android testing remain open. Automated verification and its limits are recorded in the [development log](DEVLOG.md).

These capabilities port original-game functionality. Habitat choices, additional starting colonies, the home pond, journal/cinema, audio, accessibility/settings and full visual parity remain unfinished. Profile records are persisted for currently implemented systems; their complete home-pond/journal UI is separate work. Desktop Godot save files are not imported. See the [current parity status](docs/FEATURE_PARITY.md).

The creature-content update adds ordinary forms, Moonlace, Glass Harp, Glowdrift and one expedition creature per biome, favoring undiscovered entries. Form artwork and nucleus registration follow the original. New journeys enable this content; schema-1 saves migrate while retaining their existing ecology. Discovery and rescue identities survive Continue and retry. The Field Journal and home pond interfaces are the next content block.

## Development
See [encounter engine](docs/ENCOUNTER_ENGINE.md), [technical audit](docs/TECHNICAL_AUDIT.md), [feature parity](docs/FEATURE_PARITY.md), [roadmap](docs/MOBILE_ROADMAP.md), and [development log](DEVLOG.md). GitHub is the source of truth. See [Replit run instructions](replit.md) for the Expo Go tunnel workflow and setup verification. Dependency versions have passed the installed SDK compatibility check; `package-lock.json` records the resolved versions.

On a development host, run `npm ci`, `npm test`, `npm run typecheck`, `npm run check:deps` and `npm run doctor`, then `npm run ios` or `npm run android`. For a physical phone outside Replit's network, use `npm run start:tunnel -- --port 8080` and scan the console QR code with Expo Go supporting SDK 58. A passing CPU test suite does not validate the Expo app or its GPU effects. All 48 base and form textures are already local; the full asset importer is not required for this checkpoint.

## Credits and license
See [CREDITS.md](CREDITS.md) and [LICENSE](LICENSE). Preserve third-party notices and record all adaptation changes. Store distribution and third-party asset rights must be verified before publication.
