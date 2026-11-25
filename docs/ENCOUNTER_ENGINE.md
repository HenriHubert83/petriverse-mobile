# Encounter engine checkpoint

Reference: Petriverse 0.3.0, commit `be96d3e0641571cc37255fb8701ea83e20c28aee`. The free, offline, landscape iOS/Android scope is unchanged.

`src/engine/encounterSimulation.ts` connects the existing CPU models into one encounter. It accepts an explicit encounter specification and caller-supplied organisms. It does not generate the journey or populate a playable level. `App.tsx` still renders the synthetic diagnostic.

## Runtime boundary

| Entry point | Behavior |
|---|---|
| Constructor | Creates the board, cells, fluid, health model, input and ecology systems in `brief` state. Optional `encounterIndex` identifies a generated route visit; absent means an authored stage. |
| `addBody(body)` | Adds an instantiated organism and reserves its ID. Source wave scheduling and form assignment remain pending. |
| `begin()` | Enters `active` from `brief`. |
| `selection.start/drag/visit`, `release()` | Uses existing geometry and readiness checks, spends cells, applies harvest consequences, creates a recovery clot and evaluates the encounter goals. Native gesture and screen-coordinate adapters remain pending. |
| `harvestPreview()` | Uses the same reward ledger as a real capture, including mutation bonuses, armor, salvage and poison. |
| `step(delta)` | Advances water, board, recovery, injuries, existing organisms, contacts, phages, amoebas, food-web behavior and goals. Combat time is clamped to the encounter deadline. |
| `togglePause()` | Cancels gestures and freezes simulation clocks, injuries, recovery and fluid until resumed. |
| `complete` / `loss` | Freezes combat and board motion while recovery and injury aftermath finish. `complete` is an integration boundary for future route progression, not a claim that the whole journey ended. |

## Preserved rules

- Food and poison are independent. Pure-cyst purification, one-cyst filtering, mutation food bonuses, active feeder roles, stored-food salvage and the 30-food bank cap follow the pinned source. Excess food still advances objectives and scoring.
- Captures resolve armor, shared nuclei, amoeba rescue, spore identity, mastery, capture grades, three-second flow chains, frenzy, lure, residual membranes and nursery healing. Mastery grants banked food and score without advancing required nourishment.
- Contacts are sorted and processed as a batch, including surplus attackers after lethal damage. Guards intercept once per current encounter. Each unguarded hit claims an intact Mother organelle with its own 2.2-second aftermath.
- Bellwether, Regent and Conjoined retain their phase models. Boss strikes require three nourishment already stored before the meal; they remove one layer. Regent gates open a 14-second opportunity and an incomplete shield pair regrows after 18 seconds. Conjoined surviving hits spawn young twinspores.
- Encounter completion requires nourishment and the relevant objective. Generated feed visits at stage 4 or later require two captured hunters. Poison loss takes priority over satisfying the goal; a completed goal at the exact deadline succeeds. Health, swift-finish and clear-water rewards are applied once.

## Still outside this checkpoint

Campaign plans and route generation; bloom replenishment and warning/wave scheduling; competitor decisions for grazers, bacteria, parasites and dividers; cradle hatching; rare visitor scheduling and complete creature-form definitions; habitats; lessons; evolution offers and repairs; growth progression; legacy 30-encounter final surges and guard rest; final-journey bonuses; save validation and retry; native gestures, rendering, audio and UI.

Only the two expedition spore IDs needed to classify rescued specimens are carried into the harvest port. This is not a full expedition or form-catalogue port. Class properties remain mutable for controlled fixtures; persisted data must eventually enter through a validated save layer.

## Verification on 2026-11-25

All **67 test groups passed**, with zero failures, skips or cancellations: the 46 existing tests plus 21 new groups in `tests/encounterSimulation.test.ts`. These exercise real Board/Input/Resolver/Harvest/Clot integration, damage and healing, mutation ledgers, armor, mastery, amoeba return, phage salvage, food-web recovery, boss phases and gates, objectives, deadlines and pause.

Executed with Node 24.22.3's built-in TypeScript transform and a temporary ESM loader for extensionless local imports, erased type imports and JSON modules. Repository sources and assertions were executed without copying or editing them for the runner. Normal project command remains `npm test` using `tsx` when dependencies are installed. These are runtime assertions, **not a TypeScript typecheck** or a differential run against Godot. Important source fixtures include `tests/journey_mutations.gd`, `tests/journey_rules.gd` and the CPU portions of `tests/mother_damage.gd`; their full suites and visual assertions have not been ported.

The current environment blocks access to the npm registry. No package installation, full-project typecheck, Expo build, GPU compile, asset rendering, iOS/Android launch or device benchmark was performed. No dependency versions or package lockfile were changed in this checkpoint.

Next: connect source-authored content and wave scheduling to this model, then drive a touch/Skia encounter with original assets on a supported Expo development host. Keep current CPU tests as regression coverage while adding route, save and native integration checks.
