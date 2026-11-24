# Development log

## 2026-11-24 | Foundation: pinned source and audit baseline

- Established independent mobile repository; original Godot fork is retained as reference.
- Pinned upstream reference version 0.3.0 at be96d3e0641571cc37255fb8701ea83e20c28aee.
- Inventoried source, tests, assets and shader/include files; reviewed key gameplay, rendering, fluid, UI and persistence architecture.
- Copied original CC BY-NC 4.0 license without modification and recorded attribution, planned changes and remaining rights checks.
- Established feature parity checklist and staged roadmap, prioritizing early shader/fluid validation.
- No runnable application yet; no device or runtime tests performed. No gameplay or visual parity claims. No modifications to original fork.
- Next: create Expo-compatible scaffold with tested dependency versions and begin deterministic simulation and rendering foundations.

## 2026-11-25 | Phase 02 foundation

- Created phase-02-foundation and mapped 182 upstream scripts, shader files/includes and test fixtures.
- Added Expo SDK 58 configuration, landscape shell, Skia diagnostic and Replit tunnel command. Versions checked against Expo SDK 58 bundledNativeModules.json. No native dependencies installed or native runtime executed yet.
- Translated loop_geometry.gd to TypeScript, retaining constants and predicates. Local strict typecheck passed; four test groups passed with Node 22 type stripping (local test import extension adjusted). Local geometry source blob matched GitHub blob 42576b2f0395e79590b38d0adcf8dbec04bdb3f9. Full upstream assertions and integration pending.
- New code and config checked for email-address patterns before writing. No unnecessary personal contact information, accounts or analytics planned; preserve required attribution and license notices.
- Network DNS restriction prevented fetching packages in the local environment. Native validation, lockfile, original artwork, real shaders, fluid simulation and gameplay remain open. Changes on development branch only.
