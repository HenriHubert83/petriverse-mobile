# Internal TestFlight beta

Petriverse includes `testflight` EAS build and submit profiles for direct EAS builds. The build inherits production settings: store distribution, a physical-device iOS Release build, and automatic build-number increments managed by EAS. Android preview APK and production app-bundle formats are preserved. Standalone Expo Launch also supports setup, signing, cloud builds and submission from a browser on a computer or phone; this browser route was used for the first beta. Replit provides an optional embedded Launch flow.

The iOS bundle identifier is `com.aiengineerhub.petriverse`. Keep that identifier when creating or selecting its Apple app record. EAS manages the developer-facing build number; the player-facing version stays in `app.json`. The `preview` profile's internal distribution is ad hoc distribution, not TestFlight.

The app config includes an opaque 1024-pixel icon, landscape support, an iPad full-screen compatibility setting, and the encryption declaration for this offline game. The app declares no tracking or collected data; native dependencies supply their required-reason API declarations, which CocoaPods aggregates during the native build. Microphone permission and background audio are disabled. Revisit these declarations if services or data collection are added. Current Expo dependencies require iOS 16.4 or later.

The lockfile uses public npm tarball URLs so the same pinned versions and integrity hashes can install on Expo's build servers as well as Replit.

## Verified Expo project

Created on 2026-11-27 under Henri's existing account:

- Project: [Petriverse](https://expo.dev/accounts/henrihubert/projects/petriverse-mobile)
- Owner and full name: `henrihubert`, `@henrihubert/petriverse-mobile`
- Project ID: `77b3b2d9-55c8-4604-b96e-89a230456887`

The verified owner and project ID are recorded in `app.json`. The Expo project's GitHub integration was also connected to `HenriHubert83/petriverse-mobile` on 2026-11-27. Henri then completed Apple authentication privately through standalone Expo Launch, which retained this existing project and configured managed signing and submission credentials. The intended direct workflow is development in Codex, source in GitHub, and builds/submission through Expo; Replit is optional.

## First beta delivery record

Status recorded on 2026-11-27:

| Item | Verified state |
| --- | --- |
| iOS build | `6037d2b4-58ae-434c-867e-56166fb76614`, `FINISHED`, store distribution |
| Version and build number | **0.1.0 (1)** |
| Build profile used by Launch | `production`; the repository's separate `testflight` profile remains available |
| Build completion | 2026-11-27 at 10:09 CET, verified through the Expo plugin |
| Launch workflow | `01a21c3e-fa4b-783a-bf5d-5a971d6a6e6b`, `SUCCESS`, one `app-store` job |
| Apple app record | [Petriverse in App Store Connect](https://appstoreconnect.apple.com/apps/6839946727/distribution), numeric Apple ID `6839946727` |
| Submission | The user's Expo dashboard screenshot shows the iOS App Store submission succeeded; a submission ID and live Apple processing status have not been independently verified |
| Installation | Tester-group membership, TestFlight availability and the first device installation remain unverified |

The launch was opened from the branch-specific GitHub URL below. Expo's build and workflow metadata returned no source commit or Git reference, so the exact built GitHub commit is not independently verified. Henri selected **Launch to Testers** with **Team (Expo)**; the displayed option offered an invitation for all admins, but completed invitations and tester membership are not yet verified. Do not treat build or upload success as proof that TestFlight installation is available.

## Standalone Expo Launch in a browser

This browser route does not require a local terminal or a Replit website deployment.

1. Open [Expo Launch for Petriverse's development branch](https://launch.dev/?github=https://github.com/HenriHubert83/petriverse-mobile/tree/phase-02-foundation). The explicit branch matters because the repository's default branch is `main`.
2. Choose the **App Store** target, sign in to Expo as `henrihubert`, and select the existing `@henrihubert/petriverse-mobile` project. Preserve the project ID above.
3. Complete Apple authentication and verification privately in the browser. Select the existing Petriverse Apple app with bundle identifier **com.aiengineerhub.petriverse** and Apple ID **6839946727**.
4. Reuse the project's valid managed credentials when offered. Review the intended TestFlight destination and launch settings, then start the cloud build and submission when ready. Do not create a duplicate project or Apple app.
5. Track the actual Launch workflow, build and submission results. After Apple processes the upload, complete the installation steps below. TestFlight submission does not release the game publicly on the App Store.

Expo Launch supports this public GitHub repository and its static `app.json`. It does not automatically launch new commits; start another launch for a later beta. Inspect any configuration changes made by Launch before syncing them to the development branch. The initial successful Launch build used `production`; do not assume this flow uses `testflight` or a local CLI session.

## GitHub build settings

The connected repository is [HenriHubert83/petriverse-mobile](https://github.com/HenriHubert83/petriverse-mobile). Its Expo app and EAS configuration are at the repository root, so the base-directory field can remain empty. Select `phase-02-foundation` and the `testflight` profile for this beta; no merge into `main` is required.

The inherited production iOS profile explicitly selects the `latest` build image, as required for GitHub-triggered builds. The first signed iOS build has now completed through standalone Expo Launch. A prior terminal build is not a prerequisite for that browser flow. For later plugin-triggered builds, select the verified source revision, project and build profile and reuse the configured signing credentials.

## Optional Replit route

Open the existing Petriverse project in Replit's browser Project Editor after syncing the latest development branch while preserving local commits and the mobile workflow.

1. Open **Publishing** and select **Start publishing to the App Store** to open Expo Launch.
2. Choose **Use existing** and select `@henrihubert/petriverse-mobile`, with the project ID above. Retain the name Petriverse and slug petriverse-mobile; do not create a duplicate project.
3. Sign in with the Apple Developer account that should own the game and complete its verification prompts.
4. Select or create the Apple app using **com.aiengineerhub.petriverse**. Verify this identifier before the first upload.
5. Let Launch configure signing, then select **Launch to App Store** when ready to build and upload. After processing, use the internal TestFlight group described below. A TestFlight upload does not itself release the app publicly.

Use the launch workflow's displayed build and submission status as the source of truth. Do not assume it uses the repository's `testflight` profile or an existing CLI session. Review and sync any configuration changes it produces back to the development branch.

Replit's current documentation says standalone EAS CLI and EAS Build are not supported inside Replit. If its App Store option is unavailable for the imported project, use standalone Expo Launch above. The commands below are an optional alternative for a separate development machine with this GitHub checkout; they are not required for either browser Launch flow.

## Optional direct EAS workflow: 1. Update the development checkout

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
npx --yes eas-cli@latest login --browser
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

Build number 1 is already used by the first beta. Preserve EAS's configured remote version counter and automatic increments. If a later migration requires reconciling build numbers, inspect the latest Apple and EAS state first; do not reset the counter to 1.

## 3. Build the signed iOS app

The project now has managed signing credentials configured through Launch. Reuse them for this bundle identifier. If EAS requires Apple authentication to renew or update signing, the account owner must complete the private verification prompts. Preserve valid credentials and the existing Apple team.

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

Follow any interactive Apple account prompts. Select the existing Petriverse App Store Connect record with bundle identifier `com.aiengineerhub.petriverse` and Apple ID `6839946727`. Reuse its configured managed App Store Connect API credentials where available.

The repository's submission profile has no Apple account or team identifiers configured. The verified numeric app ID `6839946727` can be supplied for an explicit plugin submission or saved as `submit.testflight.ios.ascAppId` for future CLI submissions. Do not put passwords, private keys, or signing files in Git.

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

For another beta, use the standalone Launch route above or pull the latest development branch and repeat optional CLI steps 3 and 4 with the new build's ID. EAS increments its build number automatically. Over-the-air updates are disabled, so code changes require a new build and TestFlight installation.

Configuration alone does not establish that a signed build works on a device. The first installation still needs a short play session covering launch, sound, pause/resume, and progress after closing and reopening the app.

An initial local iOS Prebuild confirmed the icon, bundle settings, landscape orientations, export declaration, app privacy manifest and absence of microphone/background-audio entries. This did not run Xcode, signing, CocoaPods privacy aggregation or Apple's upload validation. The iPad full-screen flag is a compatibility setting; newer iPad windowing behavior still needs device verification.

References: [Expo Launch](https://launch.dev/), [Launch's supported GitHub/browser workflow](https://launch.dev/llms-full.txt), [Expo's Launch introduction](https://expo.dev/blog/introducing-expo-launch), [Replit's integrated App Store flow](https://docs.replit.com/build/mobile-app#publish-to-the-app-store), [Replit native mobile support](https://docs.replit.com/features/artifact-types/building-mobile-apps), [Expo TestFlight submission](https://docs.expo.dev/submit/testflight/), [Expo GitHub builds](https://docs.expo.dev/build/building-from-github/), [EAS configuration](https://docs.expo.dev/eas/json/), [remote app versions](https://docs.expo.dev/build-reference/app-versions/), [EAS CLI](https://docs.expo.dev/eas/cli/).
