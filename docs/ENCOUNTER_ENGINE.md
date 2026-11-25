# Encounter and mobile integration checkpoint

Reference: Petriverse 0.3.0, commit `be96d3e0641571cc37255fb8701ea83e20c28aee`. The free, offline, landscape iOS/Android scope is unchanged.

`App.tsx` opens `JourneyApp`, which loads local saves and displays the title menu. Continuing or starting a journey opens `GameScreen`, which drives a `JourneySession` and draws its current `EncounterSimulation` through `EncounterView`. The former synthetic diagnostic remains available as a development component. On 2026-11-25 Henri confirmed actual play through Expo Go on a physical iPhone in landscape; his screenshot shows encounter 3 of 15. This is the first reported native playtest, with broader device validation still pending.

## Runtime boundary

| Entry point | Behavior |
|---|---|
| `new JourneySession(seed)` | Builds 12 authored stages plus 3 seeded visits and creates the opening briefing. The default colony is the Wanderer. |
| `new EncounterSimulation(spec, options)` | Creates an isolated encounter. `content: true` adds blooms, rescue spores, bosses, ecology and a guided first lesson. The default remains supplied-content mode for CPU fixtures. |
| `session.begin()` | Applies a default Guard if a new organelle was left undecided, then enters active play. |
| `TouchController` | Converts screen coordinates through the fitted/zoomed camera. One finger draws or nudges; two fingers cancel gameplay input and own pinch/pan until all fingers lift. Termination, bounds exit, resize and pause cancel without capture. |
| `capture`, `release`, `harvestPreview` | Share nucleus eligibility and reward rules. Committed captures spend cells, absorb prey, update food/health/score, create recovery clots and check goals. |
| `session.update(delta)` | Advances the encounter and observes completion once. Native presentation supplies fixed 1/60-second steps through a clock with bounded catch-up. |
| `chooseEvolution(id)` | Validates offers and food costs, or heals/continues, then carries colony state into the next briefing. Generated visits suppress offers; six traits is the maximum. |
| `retry()` | Restores entry colony state and the pre-content RNG, rebuilding the same encounter and healing to at least three organelles. Failed-attempt rewards are discarded. This retry checkpoint is included in the durable journey snapshot; retry remains distinct from backup recovery. |
| Pause / application interruption | Cancels input, freezes simulation and requests a save. Returning from the background or loading active saved play requires Resume; suspended wall time is discarded. |
| Final encounter | Awards the ending health bonus once, clears enemies and presents the journey result. |

## Content and preserved rules

- `data/journey.json` carries the original stages, dishes, colony descriptions and mutation catalogue. `journeyRoute.ts` inserts Small allies and two later generated visits in the original sequence. PCG32 uses 64-bit BigInt state; range sampling follows Godot's standard float build. Route generation has its own seeded stream.
- The guided opening freezes the encounter deadline, preserves its food and teaches a small three-cell capture followed by a wide six-cell capture. Advancement waits for cells to recover.
- Blooms use authored geometry and food/cyst placement. Food shortage can advance a refill without moving the hunter clock. The director warns eight seconds before arrivals, selects biome/species families and preserves the quiet Small allies introduction. Boss modes create Bellwether, Regent or Conjoined with their existing phase and gate models.
- Ordinary ecology includes food theft and stored-food salvage, parasite cell blocking, divider daughters, amoeba captivity/rescue, phage infection and protected cradle hatching. Migration, hatching and deep-traveller events use source timing and bounded currents.
- Food, poison, purification, filtering, mutation food bonuses, feeder roles and the 30-food bank cap remain independent of score. Mastery grants food and score without advancing required nourishment. Boss strikes require three nourishment already stored before the meal.
- Mother grows from three to seven organelles. Guards, nearest-core damage, healing and aftermath retain their CPU models. Captures resolve shared nuclei, armor, rescue, mastery, flow, grades, frenzy, lure, residual membranes and nursery healing.
- Goals require nourishment plus the relevant objective. Generated feed visits at stage 4 or later require two hunters. Lethal poison takes priority; a fulfilled goal at the deadline succeeds. Health, swift-finish and final-journey bonuses are applied once.

## Creature catalogue and discovery state

`creatureCatalogue.ts` contains all 17 base records and 27 forms, retaining source names, descriptions, eligibility and UVs. `assignForm` uses each journey seed, global organism ID and stage without consuming the gameplay RNG. Forms keep their species capture and movement rules. Divider daughters inherit the parent form.

`journeyDiscoveries.ts` implements Moonlace food releases, Glass Harp food/poison separation and Glowdrift hunter slowdown. Scheduling follows the original stage identity, including generated visits sharing an eligible stage. `expeditionCreatures.ts` chooses one entry per biome for generated visits and prefers undiscovered forms from the loaded profile. Expeditions wait until eight active seconds and respect the ordinary crowd limits. Captures retain form identity in clots and rescued residents.

New journeys use these systems; migrated schema-1 journeys retain their previous ecology. Roster flags, visitor clocks and global IDs persist through exact saves, retry and entry reconstruction. See SAVES.md for migration details.

## Mobile presentation

The screen provides landscape safe areas, a compact objective/health sidebar, briefing, growth choice, pause, retry, adaptation choices and final result. The dish uses the full available height. The title, objectives and guidance sit beside it, so changing instructions or save warnings cannot resize the playfield. Save problems use a small badge inside the fixed Pause control; details and retry actions appear in the paused/result panel.

Rendering uses the actual board, organisms, recovery positions, selection polygon, shield links, parasite tethers and arrival markers. One finger draws a membrane or nudges an organism. Two fingers pinch to zoom up to three times the fitted view and drag to pan, with bounded movement and a Fit control. Changing from one to two fingers cancels the incomplete gameplay gesture; returning to one finger does not begin a new capture until all fingers have lifted. Camera transforms are presentation state and are not saved with the journey. A changed viewport or new encounter returns to the fitted view. Touch selection has a minimum 14-screen-point radius at every zoom level, while capture geometry remains unchanged.

Forty-eight original PNGs (81,007,867 bytes) were verified against the pinned manifest and imported unchanged. Each needed texture is loaded once per active texture key, shared between sprites and released from the view cache when unused. Base sprite dimensions and nucleus offsets follow `microscope.gd`; form offsets follow `creature_forms.gd` and `expedition_creatures.gd`. Live visitors and absorbed rare forms retain their source display extents. Clots use the existing CPU recovery model; water tracers use the previously ported low-quality count. Membrane RuntimeEffect compilation has a translucent fallback. Rendering refreshes at up to 30 Hz while active simulation advances at 60 Hz. Terminal animation stops after remaining effects finish.

These are implementation details, not measured device performance. Tissue deformation, detailed ingestion, optical refraction, original particle shaders, full Mother injury visuals, original fonts and audio remain unfinished. The traveller's visual is a temporary submerged glow, while its current rule is implemented.

## Still outside this checkpoint

Complete preferences/settings, desktop-save migration and future profile integrations; home pond/resident management; habitat route choices; colony unlock/selection; narrated discoveries and field journal; settings/accessibility/reduced-motion controls; complete audio/visual effects; legacy 30-encounter save compatibility and final surges. Cosmetic forms and rare populations use separate source-compatible seeded streams; full same-seed Godot replay parity is not claimed while habitat and colony systems remain unported. Current mobile state now has durable snapshots and recovery; physical-device process-termination testing of this new increment remains pending.

## Verification on 2026-11-25

All **87 CPU test groups passed**, with zero failures, skips or cancellations: the prior 67 plus 20 content, mobile-input and session groups. New coverage includes the opening tutorial through phone-sized coordinate traces, PCG32 output against independently compiled original C++, seeded route structure, arrival windows, refill limits, authored events, food theft, divider/cradle hatching, all fifteen progression transitions, adaptation affordability, retry rollback, pointer interruption and frame-clock timing.

Execution used Node 24.22.3's built-in TypeScript transform and a temporary ESM loader for extensionless local imports, erased type imports and JSON. Repository sources and assertions were not rewritten. The normal project command is `npm test` using `tsx`. `App.tsx`, `GameScreen.tsx`, `EncounterView.tsx` and the texture registry also parsed/transformed with the installed Playwright Babel bundle. Asset sizes and Git blob hashes were checked independently.

Those original local checks alone did **not** constitute full TypeScript checking, a Godot differential run, a full gameplay playthrough, a native render or a performance benchmark. At that point npm access was unavailable and no dependency versions had changed.

Subsequently, Replit installed and locked compatible dependencies, corrected three compatibility issues and reported `npm test` (87 passed), full typecheck, dependency checks and all 20 Expo Doctor checks passing. Metro generated iOS and Android development bundles. These setup changes are preserved on GitHub through `11e965a07deae2a1a5c348c234df57230e5fb75f`.

Henri then reported the physical-iPhone landscape playtest described above. The screenshot supports visible organism rendering, layout and progression to encounter 3; his report confirms basic playability. It does not establish a full playthrough, individual shader/fallback behavior, focused interruption testing or sustained performance. No Android physical-device result is recorded. No new automated test execution is claimed by this documentation update.

The subsequent save/menu increment adds full snapshots of the implemented encounter, validated storage/backup recovery, current profile records and Continue/New Journey. All 129 CPU groups and full TypeScript checking pass; iOS and Android Hermes exports completed. See SAVES.md for scope and phone checks. Next, validate native close/reopen and interruption behavior while continuing the remaining original content and presentation in FEATURE_PARITY.md.

The subsequent stable-layout/save-repair increment passes all **148 CPU groups** and full TypeScript checking; iOS and Android Hermes exports also succeed. It adds the spore/profile regression fix, independent encounter checkpoint recovery and camera controls described above. Following the repair, Henri reported on 2026-11-26 that he prefers the revised layout, likes zoom/pan and that saving seems fine. Focused camera interruption/recovery checks, full journey playtesting and other-device coverage remain open.
