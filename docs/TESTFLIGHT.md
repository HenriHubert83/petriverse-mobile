# Internal TestFlight beta

Petriverse uses the `testflight` EAS build and submit profiles. The build inherits production settings: store distribution, a physical-device iOS Release build, and automatic build-number increments managed by EAS. Android preview APK and production app-bundle formats are preserved.

The iOS bundle identifier is `com.aiengineerhub.petriverse`. Keep that identifier when creating or selecting its Apple app record. EAS manages the developer-facing build number; the player-facing version stays in `app.json`. The `preview` profile's internal distribution is ad hoc distribution, not TestFlight.

The app config includes an opaque 1024-pixel icon, landscape support, an iPad full-screen compatibility setting, and the encryption declaration for this offline game. The app declares no tracking or collected data; native dependencies supply their required-reason API declarations, which CocoaPods aggregates during the native build. Microphone permission and background audio are disabled. Revisit these declarations if services or data collection are added. Current Expo dependencies require iOS 16.4 or later.

The lockfile uses public npm tarball URLs so the same pinned versions and integrity hashes can install on Expo's build servers as well as Replit.

## 1. Update the Replit checkout

Use the Replit Shell in the project root. Commit or otherwise preserve any existing local work before switching branches or pulling. Use Node 22.13 or later, as required by this project.

```sh
git status --short
git fetch origin
git switch phase-02-foundation
git pull --ff-only origin phase-02-foundation
npm ci
```

Keep this beta work on `phase-02-foundation`; no merge into `main` is required.

## 2. Link the real Expo account and project

Check the current account:

```sh
npx --yes eas-cli@latest whoami
```

If not signed in, or if the wrong account is selected, sign in with the Expo account that should own this game:

```sh
npx --yes eas-cli@latest login --no-browser
```

Check the project linkage:

```sh
npx --yes eas-cli@latest project:info
```

If no EAS project is linked, run:

```sh
npx --yes eas-cli@latest init
npx --yes eas-cli@latest project:info
```

Choose the actual account or organization and link its existing Petriverse project if one exists. Otherwise create it under that account. Verify the displayed owner and project before building. The CLI writes the real `extra.eas.projectId` and may add `owner` to `app.json`. These values are intentionally absent until the account is known.

If this bundle identifier already has uploaded builds, initialize EAS with its latest Apple build number before the first build using `npx --yes eas-cli@latest build:version:set`, selecting iOS. A new app with no configured build number starts at 1 automatically.

## 3. Build the signed iOS app

This step requires an active Apple Developer Program membership and access to the Apple team that will own Petriverse. Sign in and complete Apple's verification in the EAS terminal prompts. Let EAS manage the distribution certificate and provisioning profile for this bundle identifier, reusing suitable existing credentials when offered.

```sh
npx --yes eas-cli@latest build --platform ios --profile testflight
```

Wait for the build to finish successfully. Record the EAS build ID from that build's output or details page. EAS runs the native iOS build in the cloud, so Replit does not need Xcode.

## 4. Upload that exact build

Run this in the same Shell and paste the successful EAS build ID when prompted:

```sh
read -r -p "Successful iOS EAS build ID: " PETRIVERSE_BUILD_ID
npx --yes eas-cli@latest submit --platform ios --profile testflight --id "$PETRIVERSE_BUILD_ID"
```

Follow the interactive Apple account prompts. Select the Petriverse App Store Connect record with bundle identifier `com.aiengineerhub.petriverse`, or create that record if this is the first upload. If asked to configure App Store Connect API credentials, use credentials for that same Apple team.

The submission profile deliberately has no guessed Apple ID, team ID, or `ascAppId`. For later submissions, the real numeric Apple ID from App Store Connect's **App Information** can be saved as `submit.testflight.ios.ascAppId` in `eas.json`. Do not put passwords, private keys, or signing files in Git.

## 5. Install through TestFlight

After Apple processes the upload, open **App Store Connect > Petriverse > TestFlight**. Create an internal testing group, add your own App Store Connect user, and assign the processed build to the group. Complete any information Apple requests for that build. Open the invitation with Apple's TestFlight app on the iPhone and install Petriverse.

An internal group is sufficient for testing with your own App Store Connect account. External testers require the external-testing flow and Apple's beta review where applicable. Uploading a beta does not publish it on the App Store.

## 6. Save account linkage and make subsequent betas

Review any changes EAS made to `app.json` and `eas.json`, then sync those configuration changes back to the development branch:

```sh
git diff -- app.json eas.json
git add app.json eas.json
git commit -m "Link Petriverse EAS and TestFlight app"
git push origin phase-02-foundation
```

Skip the commit and push if those files did not change. Keep unrelated local changes separate.

For another beta, pull the latest development branch and repeat steps 3 and 4 with the new build's ID. EAS increments its build number automatically. Over-the-air updates are disabled, so code changes require a new build and TestFlight installation.

Configuration alone does not establish that a signed build works on a device. The first installation still needs a short play session covering launch, sound, pause/resume, and progress after closing and reopening the app.

An initial local iOS Prebuild confirmed the icon, bundle settings, landscape orientations, export declaration, app privacy manifest and absence of microphone/background-audio entries. This did not run Xcode, signing, CocoaPods privacy aggregation or Apple's upload validation. The iPad full-screen flag is a compatibility setting; newer iPad windowing behavior still needs device verification.

References: [Expo TestFlight submission](https://docs.expo.dev/submit/testflight/), [EAS configuration](https://docs.expo.dev/eas/json/), [remote app versions](https://docs.expo.dev/build-reference/app-versions/), [EAS CLI](https://docs.expo.dev/eas/cli/).
