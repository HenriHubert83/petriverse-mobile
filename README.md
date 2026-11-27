# Petriverse Mobile

An independent, free landscape mobile adaptation of **Petriverse**, originally created by Marco van Hylckama Vlieg.

- Original: https://github.com/TheMarco/petriverse
- Reference fork: https://github.com/HenriHubert83/petriverse
- Pinned reference: `be96d3e0641571cc37255fb8701ea83e20c28aee` (0.3.0)
- Stack: React Native, Expo, TypeScript, React Native Skia.
- Targets: iOS and Android. Offline, no ads, no in-app purchases.

**Status: playable mobile beta; Henri confirmed the first TestFlight build installs and starts on his iPhone on 2026-11-27.** The development branch `phase-02-foundation` includes the 15-encounter journey, all 44 creature catalogue entries and narrated films, Field Journal, home pond, habitats and starting colonies, evolution, Experiments, audio, accessibility settings and durable local saves. Original artwork and the shared Skia renderer also drive the living title scene. See [feature parity and remaining verification](docs/FEATURE_PARITY.md).

Henri has playtested the game in Expo Go on his iPhone and confirmed the blank-dish fix. Later sound and menu fixes are included. TestFlight is now the preferred route for device testing. A complete playthrough, audio and native performance/lifecycle coverage in the signed build, and Android testing remain unverified. Automated results and their limits are recorded in the [development log](DEVLOG.md). Desktop Godot save import is not supported.

## TestFlight

The game is linked to the verified [Petriverse Expo project](https://expo.dev/accounts/henrihubert/projects/petriverse-mobile) and GitHub repository. Henri completed the standalone Expo Launch flow in his browser, including private Apple authentication and managed signing setup. The first store build is **0.1.0 (1)**; its successful native build is verified through Expo, and the user's Expo dashboard screenshot shows a successful App Store Connect submission. Henri subsequently confirmed TestFlight availability, installation and app launch on his iPhone. See the [TestFlight guide](docs/TESTFLIGHT.md) for the exact build record, browser route and subsequent beta steps. A terminal and Replit are optional. Keep work on `phase-02-foundation`; no merge into `main` is needed.

## Development
See [encounter engine](docs/ENCOUNTER_ENGINE.md), [technical audit](docs/TECHNICAL_AUDIT.md), [feature parity](docs/FEATURE_PARITY.md), [roadmap](docs/MOBILE_ROADMAP.md), and [development log](DEVLOG.md). GitHub is the source of truth. See [Replit run instructions](replit.md) for the Expo Go tunnel workflow and setup verification. Dependency versions have passed the installed SDK compatibility check; `package-lock.json` records the resolved versions.

On a development host, run `npm ci`, `npm test`, `npm run typecheck`, `npm run check:deps` and `npm run doctor`, then `npm run ios` or `npm run android`. For a physical phone outside Replit's network, use `npm run start:tunnel -- --port 8080` and scan the console QR code with Expo Go supporting SDK 58. A passing CPU test suite does not validate the Expo app or its GPU effects. Runtime artwork, fonts and native audio copies are bundled locally; the source asset importer is not required to run the game.

## Credits and license
See [CREDITS.md](CREDITS.md) and [LICENSE](LICENSE). Preserve third-party notices and record all adaptation changes. Store distribution and third-party asset rights must be verified before publication.
