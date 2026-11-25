# Journey saves and title flow

This increment ports the currently represented part of the pinned original `journey_save.gd`, `journey_profile.gd`, `main.gd` and title-screen behavior. It does not claim the whole original game or desktop save-file compatibility.

## Player behavior

- Launch opens the title screen after reading local data. A saved journey offers Continue; a completed one offers View your completed journey. New Journey asks before replacing unfinished progress. Declining leaves it intact.
- Autosave runs every eight seconds while the game screen is active, and at significant encounter transitions, growth/adaptation/retry choices, pause, Return to title and app backgrounding. The current encounter is saved, including the positions, timers and recovery already in progress.
- Continue restores formerly active play paused. The player chooses when to resume. An unfinished loop or nudge is cancelled, and suspended wall time is not applied to the simulation.
- Pause/result panels show save status. Journey write failures offer retry; profile failures are reported separately. A valid previous backup can recover a damaged primary save, with a notice that some recent progress may be missing.
- Saved journeys and records are local to this app's storage. They do not depend on a player account or network service. Expo Go's development connection is a separate concern. Erasing app data/uninstalling can erase local saves; this increment adds no cloud synchronization.

## Storage and runtime boundary

`JourneySession.snapshot()` emits schema version 1. `JourneySession.restore()` validates it, restores the live RNG shared with the encounter and the separate retry RNG, reconstructs known organism classes and reconnects clot/cell references. Save data never selects an arbitrary constructor or executable script. Active restores pause by default; CPU comparison fixtures can explicitly request active restoration.

The snapshot preserves the current mobile route, seed, index, completion bookkeeping, evolution offers and retry colony, plus board/cell/organism state, Mother damage, recovery clots, tutorial, harvest/ecology/events, phages, amoeba returns, nudge cooldown, residual membranes and fluid history. Routes are validated against the current generator; changing it requires a schema/migration decision. Newer schemas are kept untouched and reported as unsupported.

`SaveRepository` uses AsyncStorage through a small asynchronous key/value interface. Each replacement is validated before and after storage. A temporary key and previous-valid backup protect the primary. A corrupt primary is never copied over a valid backup. Operations share a queue per backend/key, including across React remounts. This is not a multi-key transaction: profile updates are separately recoverable and have separate errors.

`SaveCoordinator` serializes user-level writes and replacement. It captures data before queuing, rejects stale callbacks from a replaced session, and exposes a new journey only after its initial save succeeds. Profile observation deduplicates accomplishments and retains unsaved in-memory records after a transient profile write failure.

Profile version 1 retains discovered/introduced/offered species, rescued resident records, cleared encounters, colony traits, mastery memories, completed seeds, victories, best score and completed-dish unlock eligibility. Partial older JSON profiles can receive defaults. This is not migration of Godot `.cfg` files, and it does not implement home-pond interactions, journal/cinema or selection/gameplay for additional colonies.

## Automated verification

On 2026-11-25, all 129 CPU groups and full TypeScript checking passed. New tests cover snapshot continuation/retry/bosses/relationships, malformed and unsupported data, backup fallback, write/readback failures, ordering across instances, profile deduplication and coordinator lifecycle. Integration tests exercise real tutorial capture, cells partway through recovery, reopening, evolution and interrupted input. Both iOS and Android Hermes exports completed with local assets.

Successful export does not establish native UI/storage behavior or measured device performance. The earlier user-reported iPhone test was on the pre-save checkpoint. The following checks remain for this increment.

## Phone checklist

1. Pull the latest `phase-02-foundation` code into Replit, preserving any local edits, and reload the current Expo Go project. The title menu should appear.
2. Begin a journey and make a capture. Pause and wait for **Progress saved**. Return to title, Continue, and verify food, score, encounter and recovery state. Resume explicitly.
3. Save again, close Expo Go completely, reopen the project using its current QR/link and Continue. Verify the saved encounter resumes paused with the same progress.
4. Start drawing a loop, switch apps or lock the phone, then return. It must pause without completing that gesture or advancing the deadline during suspension.
5. Complete an encounter, select an adaptation, save, close/reopen and verify the new encounter and upgrade. Repeat after an encounter retry; failed-attempt rewards must not return.
6. Return to title and request New Journey. Cancel and Continue to verify preservation. Confirm New Journey when ready, then verify the new run survives closing while profile records remain.

Report the device/OS, step and any visible error. Backup fault injection is covered by automated tests; no manual deletion or corruption of the phone's data is required.
