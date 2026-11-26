# Journey saves and title flow

This increment ports the currently represented part of the pinned original `journey_save.gd`, `journey_profile.gd`, `main.gd` and title-screen behavior. It does not claim the whole original game or desktop save-file compatibility.

## Player behavior

- Launch opens the title screen after reading local data. A saved journey offers Continue; a completed one offers View your completed journey. New Journey asks before replacing unfinished progress. Declining leaves it intact.
- Autosave runs every eight seconds while the game screen is active, and at significant encounter transitions, growth/adaptation/retry choices, pause, Return to title and app backgrounding. The current encounter is saved, including the positions, timers and recovery already in progress.
- Continue restores formerly active play paused. The player chooses when to resume. An unfinished loop or nudge is cancelled, and suspended wall time is not applied to the simulation.
- Recovery first tries the exact encounter save and its previous valid backup. If neither is readable, it tries a separate checkpoint for the same committed encounter. During active play that checkpoint restarts the encounter with its entry resources and chosen growth role. Completed/lost encounters retain their result screen; adaptations are retained at the next encounter entry. A recovery notice explains that recent progress may be missing.
- Pause/result panels show save status and retry controls. During play, a compact indicator in the existing Pause button signals a problem without taking space from the dish. Profile failures are reported separately and cannot prevent the journey from being saved.
- Saved journeys and records are local to this app's storage. They do not depend on a player account or network service. Expo Go's development connection is a separate concern. Erasing app data/uninstalling can erase local saves; this increment adds no cloud synchronization.

## Storage and runtime boundary

`JourneySession.snapshot()` emits schema version 3. `JourneySession.restore()` validates it, restores the live RNG shared with the encounter and the separate retry RNG, reconstructs known organism classes and reconnects clot/cell references. Save data never selects an arbitrary constructor or executable script. Active restores pause by default; CPU comparison fixtures can explicitly request active restoration.

The snapshot preserves the current mobile route, seed, index, completion bookkeeping, evolution offers and retry colony, plus board/cell/organism state, Mother damage, recovery clots, tutorial, harvest/ecology/events, phages, amoeba returns, nudge cooldown, residual membranes and fluid history. Routes are validated against the current generator; changing it requires a schema/migration decision. Newer schemas are kept untouched and reported as unsupported.

`SaveRepository` uses AsyncStorage through a small asynchronous key/value interface. Each replacement is validated before and after storage. A temporary key and previous-valid backup protect the primary. A corrupt primary is never copied over a valid backup. Operations share a queue per backend/key, including across React remounts. This is not a multi-key transaction: profile updates are separately recoverable and have separate errors.

`JourneyRecoveryRepository` adds two reusable storage slots, each with an exact save and an independent checkpoint. A boundary change stages both records in the inactive slot and commits a small active pointer last. Records must match the pointer's generation and encounter; recovery never selects an old journey or an earlier completed encounter from the inactive slot. Reusing two slots bounds storage growth. A migration marker prevents missing index data from resurrecting abandoned legacy saves. An unconfirmed pointer write forces a reload before further writes. Ordinary save-write failures retain the previous committed boundary.

Entry reconstruction uses the original entry colony and RNG, without invoking the Retry action or granting extra healing. Actual retry entries retain their already-applied retry healing. Older snapshots without enough retry-entry metadata retain their known exact state as the first fallback until a new entry is established. This is compatibility with the earlier mobile JSON format, not desktop Godot saves.

`SaveCoordinator` serializes user-level writes and replacement. It captures data before queuing, rejects stale callbacks from a replaced session, and exposes a new journey only after its initial save succeeds. Profile preparation and writes have independent errors and cannot block a valid journey save. Profile observation deduplicates accomplishments and retains unsaved in-memory records after a transient profile write failure. Ordinary base-form spores legitimately have an empty form name; this does not invalidate their rescue records.

Profile version 1 retains discovered/introduced/offered species, rescued resident records, cleared encounters, colony traits, mastery memories, completed seeds, victories, best score and completed-dish unlock eligibility. Partial older JSON profiles can receive defaults. Home-pond naming and welcome actions, journal discovery offers/introductions, and colony eligibility use these records. Profile-only edits share the coordinator write queue and retain their latest in-memory value after a failed write. This is not migration of Godot `.cfg` files.

## Creature-content migration

Schema 2 persists creature-content enablement, the planned expedition roster and its spawned flags, visitor arrival time, and the encounter-entry organism ID counter. Retry and independent checkpoint recovery use the saved entry roster and IDs, so a visitor reappears once and keeps its identity. New journeys select expedition entries using the loaded profile discoveries. Ordinary cosmetic forms use an independent 64-bit seeded stream.

Schema 1 migrates explicitly with new creature scheduling disabled for the entire existing journey. Current bodies, RNG, discoveries and progress remain intact, including later retries and encounters. Start New Journey to enable the expanded ecosystem. The route generator and profile schema remain unchanged. Older app builds reject schema 2 rather than silently dropping the new state.

Moonlace food uses negative bloom identifiers, now accepted within bounded integer limits. Organism restoration checks that forms match species and that helper-visitor flags belong only to the three helper spore forms. Global organism IDs in new journeys prevent rescue-token collisions between authored and generated visits sharing a stage.

## Habitat and colony migration

Schema 3 adds the selected starting colony, habitat enablement, choice/confirmation/application and encounter history. Retry and encounter recovery retain an already chosen habitat. Refuge trimming runs once, preserves both cysts, reduces blooms to four food and guarantees the promised helper at 36 seconds. Old schema-1/2 journeys migrate with habitat effects disabled for that entire journey; their prior ecology and random stream remain unchanged. A real schema-2 fixture from `fbcc199` verifies continuation across the visitor threshold.

Preferences have their own validated, backed-up local repository. Changes apply immediately, writes remain ordered, and failed writes retain active values for Retry. Newer preferences remain protected. Settings include music/effects volume, mute, subtitles, reduced motion, contrast, larger text, assisted closure, deliberate capture, tap controls and quality.

Journal, pond, settings and cinema pause an active journey. Discovery demonstrations and public experiments use isolated simulations and cannot mutate journey rewards or saves. Watching or skipping an introduction marks it introduced; Later leaves it accessible in the Journal. Resident names are limited to 24 Unicode code points.

## Automated verification

On 2026-11-25, the initial save/menu increment passed 129 CPU groups. The subsequent save repair, checkpoint recovery and camera increment passes all 148 CPU groups and full TypeScript checking. Coverage includes snapshot continuation/retry/bosses/relationships, malformed/future data, backup/checkpoint preference, staged write failures, ordering across instances, profile deduplication, legacy migration and coordinator lifecycle. Integration tests exercise real tutorial capture, ordinary-spore rescue, cells partway through recovery, reopening, evolution and interrupted input. Camera tests complete actual tutorial captures through zoomed/panned coordinates. Both iOS and Android Hermes exports completed with local assets.

The 2026-11-26 creature-content pass adds catalogue, ecology, artwork and persistence regressions. It includes a real schema-1 fixture captured from commit `9ecffce`, with twelve seconds of recorded continuation across the new visitor arrival window; migrated state matches the historical result exactly. See DEVLOG for the full current suite and export results.

Successful export does not establish native UI/storage behavior or measured device performance. Henri subsequently reported that the save/menu version generally works on his physical iPhone, but supplied a screenshot of an intermittent save-preparation error in encounter 2 after rescuing a spore. The error banner also reduced the dish's size. A CPU reproduction identified an ordinary spore's empty form name being rejected by profile validation, which incorrectly blocked the separate journey save. This report is partial device evidence, not a completed close/reopen or interruption checklist. On 2026-11-26 Henri then reported that he prefers the new layout and zoom/pan controls and that saving seems fine. This is positive follow-up evidence for ordinary use after the repair. The individual checklist steps below were not all reported as completed; retain them for focused regression and interruption testing.

## Phone checklist

1. Pull the latest `phase-02-foundation` code into Replit, preserving any local edits, and reload the current Expo Go project. The title menu should appear.
2. Begin a journey and make a capture. Pause and wait for **Progress saved**. Return to title, Continue, and verify food, score, encounter and recovery state. Resume explicitly.
3. Save again, close Expo Go completely, reopen the project using its current QR/link and Continue. Verify the saved encounter resumes paused with the same progress.
4. Start drawing a loop, switch apps or lock the phone, then return. It must pause without completing that gesture or advancing the deadline during suspension.
5. Complete an encounter, select an adaptation, save, close/reopen and verify the new encounter and upgrade. Repeat after an encounter retry; failed-attempt rewards must not return.
6. Return to title and request New Journey. Cancel and Continue to verify preservation. Confirm New Journey when ready, then verify the new run survives closing while profile records remain.
7. In **New life**, rescue an ordinary spore, pause and verify that the journey and profile save successfully. Close/reopen and verify that the rescue count and encounter progress survive.
8. Check the larger dish at its default view. Pinch with two fingers to zoom, drag with two fingers to pan, then use **Fit** to see the entire dish. Draw loops and nudge cysts with one finger at different zoom levels. Adding a second finger midway through a loop must cancel that loop without capturing anything.
9. While zoomed, lift one finger before the other, then release both and start a fresh loop. Switch apps or lock the phone during a camera gesture. On return, the encounter must be paused with no accidental capture or stuck gesture.
10. Check that changing instructions and any save-status indicator leave the dish's size and position unchanged. Error details and retry controls belong in the paused/result panel, with the playfield retaining its full height.

Report the device/OS, step and any visible error. Backup fault injection is covered by automated tests; no manual deletion or corruption of the phone's data is required.

## Creature-content phone check

- Continue your existing journey first and verify its prior progress. Existing journeys retain their old ecology.
- Start a new journey when ready. Look for alternate algae, cyst and spore forms after the opening, and a rare expedition creature during Small allies after eight seconds of active play.
- In The nursery, allow roughly 36 to 44 active seconds for Moonlace. It releases two food particles after another six seconds. Pause/save and fully reopen during this visit.
- Capture a visitor or expedition spore, reopen, and check that the rescue count and profile record remain. Test a retry of a generated encounter; its chosen expedition should reappear once.
- Check each new visual at Fit and zoomed views: the bright nucleus remains the capture point and save notices do not move the dish.

## Remaining combined-device check (deferred by Henri this round)

- Continue an older save, then use a new journey to check habitats and unlocked colonies.
- Open Journal, watch/skip/replay a discovery, background during narration, and return to the paused journey.
- Visit the pond, select/name a resident, wait for its welcome, reopen the app and verify the name and records.
- Change audio, larger text, contrast, motion and quality. Compare drag and tap controls, assisted closure and held-loop slowdown at Fit and zoom.
- Complete a journey and inspect the final live pond; open all three Experiments and confirm the saved journey is unchanged.
- Listen for music crossfades, narration ducking, capture feedback and muted output. Verify native shader registration, readability, sustained frame time, memory and battery behavior on iOS and Android.
