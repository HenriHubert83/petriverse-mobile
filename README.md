# Petriverse Mobile

An independent, free landscape mobile adaptation of **Petriverse**, originally created by Marco van Hylckama Vlieg.

- Original: https://github.com/TheMarco/petriverse
- Reference fork: https://github.com/HenriHubert83/petriverse
- Pinned reference: `be96d3e0641571cc37255fb8701ea83e20c28aee` (0.3.0)
- Stack: React Native, Expo, TypeScript, React Native Skia.
- Targets: iOS and Android. Offline, no ads, no in-app purchases.

**Status: playable mobile beta, with TestFlight configuration prepared.** The development branch `phase-02-foundation` includes the 15-encounter journey, all 44 creature catalogue entries and narrated films, Field Journal, home pond, habitats and starting colonies, evolution, Experiments, audio, accessibility settings and durable local saves. Original artwork and the shared Skia renderer also drive the living title scene. See [feature parity and remaining verification](docs/FEATURE_PARITY.md).

Henri has playtested the game in Expo Go on his iPhone and confirmed the blank-dish fix. Later sound and menu fixes are included. A complete playthrough, native performance/lifecycle coverage, Android testing and the first signed TestFlight installation remain unverified. Automated results and their limits are recorded in the [development log](DEVLOG.md). Desktop Godot save import is not supported.

## TestFlight

The game is linked to the verified [Petriverse Expo project](https://expo.dev/accounts/henrihubert/projects/petriverse-mobile). Follow the [TestFlight setup](docs/TESTFLIGHT.md) to complete Apple signing, build the iOS app and upload that exact build to an internal testing group. The repository includes a store-distribution build profile, automatic build numbering, app icon and native privacy/export configuration. GitHub integration and Apple credentials remain separate setup steps. Replit is optional. Configuration does not mean a build has been uploaded. Keep work on `phase-02-foundation`; no merge into `main` is needed.

## Development
See [encounter engine](docs/ENCOUNTER_ENGINE.md), [technical audit](docs/TECHNICAL_AUDIT.md), [feature parity](docs/FEATURE_PARITY.md), [roadmap](docs/MOBILE_ROADMAP.md), and [development log](DEVLOG.md). GitHub is the source of truth. See [Replit run instructions](replit.md) for the Expo Go tunnel workflow and setup verification. Dependency versions have passed the installed SDK compatibility check; `package-lock.json` records the resolved versions.

On a development host, run `npm ci`, `npm test`, `npm run typecheck`, `npm run check:deps` and `npm run doctor`, then `npm run ios` or `npm run android`. For a physical phone outside Replit's network, use `npm run start:tunnel -- --port 8080` and scan the console QR code with Expo Go supporting SDK 58. A passing CPU test suite does not validate the Expo app or its GPU effects. Runtime artwork, fonts and native audio copies are bundled locally; the source asset importer is not required to run the game.

## Credits and license
See [CREDITS.md](CREDITS.md) and [LICENSE](LICENSE). Preserve third-party notices and record all adaptation changes. Store distribution and third-party asset rights must be verified before publication.
