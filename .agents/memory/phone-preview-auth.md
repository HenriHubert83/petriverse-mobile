---
name: Phone preview authentication
description: Confirmed Expo Go phone launch and pitfalls of remote authentication and browser preview.
---

For this imported project, the user confirmed the existing game launched and was playable on their phone after signing into Expo CLI through `npx expo login --no-browser` and using the same account in Expo Go.

**Why:** The default browser login redirected to localhost on the user's computer rather than the Replit environment. Earlier instructions also incorrectly identified browser-size presets as native simulators.

**How to apply:** Prefer Shell-only interactive login when login is required; never request credentials in chat. Do not infer native simulator availability from iPhone-named browser viewport presets. Confirm an actual mobile artifact and simulator controls before promising a native Replit preview. Successful bundling alone does not establish playable native gameplay.
