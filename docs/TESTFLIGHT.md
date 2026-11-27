# Internal TestFlight beta

Petriverse includes `testflight` EAS build and submit profiles for direct EAS builds. The build inherits production settings: store distribution, a physical-device iOS Release build, and automatic build-number increments managed by EAS. Android preview APK and production app-bundle formats are preserved. Replit also provides its own integrated Expo Launch flow.

The iOS bundle identifier is `com.aiengineerhub.petriverse`. Keep that identifier when creating or selecting its Apple app record. EAS manages the developer-facing build number; the player-facing version stays in `app.json`. The `preview` profile's internal distribution is ad hoc distribution, not TestFlight.

The app config includes an opaque 1024-pixel icon, landscape support, an iPad full-screen compatibility setting, and the encryption declaration for this offline game. The app declares no tracking or collected data; native dependencies supply their required-reason API declarations, which CocoaPods aggregates during the native build. Microphone permission and background audio are disabled. Revisit these declarations if services or data collection are added. Current Expo dependencies require iOS 16.4 or later.

The lockfile uses public npm tarball URLs so the same pinned versions and integrity hashes can install on Expo's build servers as well as Replit.

## Verified Expo project

Created on 2026-11-27 under Henri's existing account:

- Project: [Petriverse](https://expo.dev/accounts/henrihubert/projects/petriverse-mobile)
- Owner and full name: `henrihubert`, `@henrihubert/petriverse-mobile`
- Project ID: `77b3b2d9-55c8-4604-b96e-89a230456887`

The verified owner and project ID are recorded in `app.json`. The Expo project's GitHub integration was also connected to `HenriHubert83/petriverse-mobile` on 2026-11-27. Apple signing and the App Store Connect record remain separate setup steps. No signed build or submission has been created. The intended direct workflow is development in Codex, source in GitHub, and builds/submission through Expo; Replit is optional.

## GitHub build settings

The connected repository is [HenriHubert83/petriverse-mobile](https://github.com/HenriHubert83/petriverse-mobile). Its Expo app and EAS configuration are at the repository root, so the base-directory field can remain empty. Select `phase-02-foundation` and the `testflight` profile for this beta; no merge into `main` is required.

The inherited production iOS profile explicitly selects the `latest` build image, as required for GitHub-triggered builds. Expo's GitHub-build setup also requires a successful initial EAS build for the platform. Complete the account and signing setup and the first signed iOS build below before relying on subsequent GitHub-triggered builds. Connecting the repository alone does not configure signing or start a build.

## Optional Replit route

Open the existing Petriverse project in Replit's browser Project Editor after syncing the latest development branch while preserving local commits and the mobile workflow.

1. Open **Publishing** and select **Start publishing to the App Store** to open Expo Launch.
2. Choose **Use existing** and select `@henrihubert/petriverse-mobile`, with the project ID above. Retain the name Petriverse and slug petriverse-mobile; do not create a duplicate project.
3. Sign in with the Apple Developer account that should own the game and complete its verification prompts.
4. Select or create the Apple app using **com.aiengineerhub.petriverse**. Verify this identifier before the first upload.
5. Let Launch configure signing, then select **Launch to App Store** when ready to build and upload. After processing, use the internal TestFlight group described below. A TestFlight upload does not itself release the app publicly.

Use the launch workflow's displayed build and submission status as the source of truth. Do not assume it uses the repository's `testflight` profile or an existing CLI session. Review and sync any configuration changes it produces back to the development branch.

Replit's current documentation says standalone EAS CLI and EAS Build are not supported inside Replit. The commands below are an alternative for a separate development machine with this GitHub checkout, not a requirement for Replit's integrated Launch flow. If the App Store option is unavailable for the imported project, use that alternative rather than converting the game to a website.

## Direct EAS workflow: 1. Update the development checkout

Use a supported development host with Node 22.13 or later. Commit or otherwise preserve any existing local work before switching branches or pulling. If the branch has diverged, reconcile its local commits before continuing; do not discard them to force a pull.

```sh
git status --short
git fetch origin
git switch phase-02-foundation
git pull --ff-only origin phase-02-foundation
npm ci
```

Keep this beta work on `phase-02-foundation`; no merge into `main` is required.

## 2. Verify the Expo account and project

Check the current account:

```sh
npx --yes eas-cli@latest whoami
```

If not signed in, sign in with `henrihubert` or an account authorized to access this project. If another account is already signed in, verify access before changing that session:

```sh
npx --yes eas-cli@latest login --no-browser
```

Check the project linkage:

```sh
npx --yes eas-cli@latest project:info
```

The current checkout is already linked. Only if an older checkout is missing the project ID, link this exact existing project:

```sh
npx --yes eas-cli@latest init --id 77b3b2d9-55c8-4604-b96e-89a230456887
npx --yes eas-cli@latest project:info
```

Verify that the output identifies `@henrihubert/petriverse-mobile` and the project ID above before building. The public project identity is committed; passwords, API tokens and signing material are not.

If this bundle identifier already has uploaded builds, initialize EAS with its latest Apple build number before the first build using `npx --yes eas-cli@latest build:version:set`, selecting iOS. A new app with no configured build number starts at 1 automatically.

## 3. Build the signed iOS app

This step requires an active Apple Developer Program membership and access to the Apple team that will own Petriverse. Sign in and complete Apple's verification in the EAS terminal prompts. Let EAS manage the distribution certificate and provisioning profile for this bundle identifier, reusing suitable existing credentials when offered.

```sh
npx --yes eas-cli@latest build --platform ios --profile testflight
```

Wait for the build to finish successfully. Record the EAS build ID from that build's output or details page. EAS runs the native iOS build in the cloud, so the development host does not need Xcode.

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

References: [Replit's integrated App Store flow](https://docs.replit.com/build/mobile-app#publish-to-the-app-store), [Replit native mobile support](https://docs.replit.com/features/artifact-types/building-mobile-apps), [Expo TestFlight submission](https://docs.expo.dev/submit/testflight/), [Expo GitHub builds](https://docs.expo.dev/build/building-from-github/), [EAS configuration](https://docs.expo.dev/eas/json/), [remote app versions](https://docs.expo.dev/build-reference/app-versions/), [EAS CLI](https://docs.expo.dev/eas/cli/).
