# Running Petriverse Mobile on Replit

## Project and branch

Use the existing Expo SDK 58 / React Native / Skia application on
`phase-02-foundation`. Preserve the mobile implementation and stay on this
development branch; do not merge setup work into `main`.

The import's original local commit remains on `main`. The working tree was
clean before switching to the fetched development branch.

## Install and run

- Runtime: Node 22.13 or newer (Replit uses Node 22).
- Install the locked dependencies with `npm ci`.
- Click **Run** to start the **Expo mobile** console workflow, or run
  `npm run start:tunnel -- --port 8080`.
- This is a native mobile app, not a browser app. Use the console's QR code
  rather than expecting gameplay in the web preview.
- Install a version of **Expo Go supporting SDK 58** on the iPhone. Scan the
  console QR with the iPhone Camera and open it in Expo Go. The printed
  `exps://…exp.direct` address can also be opened on the phone.
- Android uses the same QR/address in a compatible Expo Go installation.
- Keep the Replit workflow running while testing. Tunnel addresses can change
  after a restart; always use the current console output.
- Landscape mode is configured in `app.json` and locked by `App.tsx`.

The tunnel script explicitly uses `expo start --tunnel ngrok`. SDK 58's default
Expo tunnel requires an Expo account login, whereas this ngrok mode started
without an Expo account or additional secrets. `@expo/ngrok` is a local
development dependency.

## Verification

On 2026-11-25:

- `npm test`: 87 passed, zero failures/skips.
- `npm run typecheck`: passed.
- `CI=1 npm run check:deps`: passed; dependencies up to date.
- `CI=1 npm run doctor`: all 20 checks passed.
- Public tunnel: iOS manifest returned HTTP 200 with SDK 58 and landscape mode.
- Metro generated complete, non-lazy development bundles for both iOS and
  Android (HTTP 200).

Minimal compatibility corrections use React Native's `StyleSheet.absoluteFill`,
Skia 2.14's `PathBuilder`, and a mutable copy in the geometry-copy regression
fixture. React type definitions and TypeScript match Expo's recommendations;
`expo-asset` is explicit because `expo-audio` requires it.

No physical device was connected during the setup checks above. Subsequently,
on 2026-11-25, Henri confirmed the game was running and playable in Expo Go on
his physical iPhone in landscape. His screenshot shows encounter 3 of 15.
This is an initial native rendering and basic interaction playtest. The device
model/iOS version, focused interruption handling, full playthrough, detailed
shader/fallback behavior and sustained performance have not been recorded.
Android physical-device validation remains outstanding.

The four setup commits were pushed to `phase-02-foundation`, ending at
`11e965a07deae2a1a5c348c234df57230e5fb75f`, and verified on GitHub. Journey
progress is still in memory and is lost when the application closes. Basic
background pausing exists; durable save/resume is the next porting increment.
