# Source migration matrix

Pinned source: be96d3e0641571cc37255fb8701ea83e20c28aee. Every source file is accounted for; destination paths are proposed. Pending means not ported; Implemented/unverified means code exists but parity tests are not executed; Verified requires regression evidence. Test files may map to multiple tests and visual fixtures require device evidence.

2026-11-25 update: native integration now has an initial user-reported iPhone landscape playtest through Expo Go, shown at encounter 3 of 15. This does not verify every row or constitute complete visual/gameplay parity. Use FEATURE_PARITY.md for the current whole-game status and ENCOUNTER_ENGINE.md for the integrated runtime boundary; historical local test results are not new executions.

2026-11-26 integration update: Journal, home pond/resident actions, narrated demonstrations, habitat choices, starting colonies, settings/accessibility and original audio now have mobile implementations. CPU evidence is recorded in DEVLOG; native device/visual/audio checks remain distinct from compilation and simulation tests. Public Experiments and final epilogue are included in this implementation pass.

| Original source | Proposed mobile target | Status |
|---|---|---|
| `scripts/amoeba.gd` | `src/ecology/amoeba.ts` | Implemented / local crawl and captivity tests passed; native visual integration pending |
| `scripts/amoeba_outline.gd` | `src/rendering/amoebaOutline.ts` | Implemented / source 192-pixel alpha threshold and two chamfer passes, float texture upload; CPU geometry tests passed |
| `scripts/amoeba_system.gd` | `src/ecology/amoebaSystem.ts` | Implemented / reservation, captivity, rescue and deadline tests passed; integrated encounter; durable saves pending |
| `scripts/amoeba_visual.gd` | `src/rendering/specializedSpecimens.tsx`, `src/rendering/specializedVisuals.ts` | Implemented / source whole-membrane crawl, engulfing cup, captive vacuole and digestion; CPU pixels passed, native comparison pending |
| `scripts/bacterium.gd` | `src/ecology/bacterium.ts` | Implemented / infection and encounter food-competitor behavior integrated; full source/device parity pending |
| `scripts/board.gd` | `src/geometry/board.ts` | Implemented / local regression tests passed; upstream integration pending |
| `scripts/capture_feedback.gd` | `src/mobile/gameGuidance.ts` | Implemented / live preview counts, poison-entry warning, health and recovery confidence; pure guidance tests |
| `scripts/cell.gd` | `src/geometry/cell.ts` | Implemented / local regression tests passed; upstream integration pending |
| `scripts/clot.gd` | `src/geometry/clot.ts` | Implemented / CPU recovery tests passed and native view connected; detailed native recovery presentation validation pending |
| `scripts/conjoined.gd` | `src/ecology/conjoined.ts` | Implemented / legacy boss cycle tests passed; current journey boss is separate |
| `scripts/creature_cinema.gd` | `src/mobile/DiscoveryCinema.tsx`, `src/cinema/filmPlayback.ts` | Implemented / live playback, original narration, subtitles, replay/later and interruption clock tested; native playback verification pending |
| `scripts/creature_film_stage.gd` | `src/cinema/creatureFilmStage.ts` | Implemented / all 44 real simulation demonstrations and original audio hashes tested |
| `scripts/creature_forms.gd` | `src/content/creatureCatalogue.ts` | Ported data and independent seeded form assignment; native presentation comparison pending |
| `scripts/cyst_nudge.gd` | `src/ecology/cystNudge.ts` | Implemented / nudge regressions passed and mobile gestures connected; focused native nudge test pending |
| `scripts/dish_labels.gd` | `src/mobile/GameplayGuidance.tsx`, `src/rendering/EncounterView.tsx` | Adapted / original objective and warning information is placed in the scrolling mobile sidebar and anchored touch labels; desktop pixel layout is not reused |
| `scripts/drifter.gd` | `src/ecology/drifter.ts` | Implemented / behavior tests passed and encounter ecosystem connected; complete species/form parity pending |
| `scripts/ecology_enemy.gd` | `src/ecology/ecologyEnemy.ts` | Implemented / movement, destination assignment and food web connected; complete ecology/source parity pending |
| `scripts/encounter.gd` | `src/campaign/encounter.ts` | Scope review pending |
| `scripts/encounter_rhythm.gd` | `src/campaign/encounterRhythm.ts` | Implemented / source pacing used by arrival director; CPU warning timing covered, native presentation pending |
| `scripts/evolution_anatomy.gd` | `src/evolution/motherAppearance.ts`, `src/mobile/EvolutionSpecimens.tsx` | Implemented / source anatomy recipes, growth windows, mixed lineage and Mother/cell diagrams; CPU tests |
| `scripts/evolution_comparison.gd` | `src/evolution/evolutionComparison.ts`, `src/mobile/EvolutionPanel.tsx` | Implemented / all twelve comparisons checked against real capture rules without mutating journey state or RNG |
| `scripts/evolution_reveal.gd` | `src/mobile/EvolutionPanel.tsx`, `src/evolution/evolutionPresentation.ts` | Implemented / source 3.2-second growth reveal, reduced motion, scrollable mobile layout and separate briefing start |
| `scripts/expedition_creatures.gd` | `src/campaign/expeditionCreatures.ts` | Ported planning, unseen preference, spawn roles/crowd limits and saved roster; device testing pending |
| `scripts/fluid_field.gd` | `src/engine/fluidField.ts` | CPU simulation and RGBA encoding implemented / local and encounter pause tests passed; native GPU upload pending |
| `scripts/game_feel.gd` | `src/rendering/gameFeel.ts`, `src/rendering/GameFeelLayer.tsx` | Implemented / source event lights, motes, counters, rings, floating rewards, title/critical cues; nine tests, reduced motion, independent RNG; shake omitted for touch alignment |
| `scripts/habitat_events.gd` | `src/campaign/habitatEvents.ts` | Partial / authored event timing and currents tested; creature forms and final traveller visual pending |
| `scripts/harvest.gd` | `src/campaign/harvest.ts` | Scope review pending |
| `scripts/harvest_flow.gd` | `src/campaign/harvestFlow.ts` | Pending |
| `scripts/harvest_organism.gd` | `src/ecology/harvestOrganism.ts` | Implemented / behavior, capture rewards and bloom/arrival scheduling integrated; complete creature forms pending |
| `scripts/home_pond.gd` | `src/mobile/HomePondScreen.tsx`, `src/pond/homePond.ts` | Implemented / resident selection, naming, paging, welcomes, growth, companions and gardens tested; native presentation pending |
| `scripts/hud.gd` | `src/mobile/GameScreen.tsx`, `src/mobile/SettingsScreen.tsx`, `src/mobile/FieldJournal.tsx` | Adapted / responsive safe-area mobile menus, settings, original text, objective/result information and stable dish; native comparisons pending |
| `scripts/injury_motes.gd` | `src/rendering/MotherInjuries.tsx` | Implemented / simulation-aged organelle ribbons and vesicles with reduced-motion suppression; native comparison pending |
| `scripts/input_controller.gd` | `src/geometry/inputController.ts`, `src/mobile/touchController.ts` | Implemented / draw and tap controls, assisted closure, deliberate time scaling, camera quarantine and real captures/nudges tested |
| `scripts/journey_boss.gd` | `src/campaign/journeyBoss.ts` | Implemented / all three phase models, charged capture, shields and offspring tested; full campaign/native verification pending |
| `scripts/journey_discoveries.gd` | `src/campaign/journeyDiscoveries.ts` | Ported Moonlace, Glass Harp and Glowdrift timing/help behavior; CPU save/resume coverage |
| `scripts/journey_ecology.gd` | `src/ecology/foodWeb.ts`, `src/ecology/encounterEcology.ts` | Implemented current journey / waves, food web, gates, cradle hatching, sheltered habitats, forms and rare visitors; source/device comparisons pending |
| `scripts/journey_guidance.gd` | `src/mobile/gameGuidance.ts`, `src/mobile/GameplayGuidance.tsx` | Implemented / source priority for preview, threats, rescue, shields, phages, food and objectives; live rule tests |
| `scripts/journey_habitats.gd` | `src/campaign/journeyHabitats.ts` | Implemented / original route choices, algae counts, hunter scheduling, promised visitors, retry/save and schema-2 continuation tested |
| `scripts/journey_harvest.gd` | `src/campaign/journeyHarvest.ts` | Implemented current journey / blooms, rewards, objectives, discoveries, habitats and flow scoring; full playthrough pending |
| `scripts/journey_hud.gd` | `src/mobile/GameScreen.tsx` | Partial / mobile objectives, colony status and encounter states visible in iPhone playtest; full HUD parity pending |
| `scripts/journey_lesson.gd` | `src/campaign/journeyLesson.ts` | Implemented / two captures and recovery tested through phone-coordinate controller; initial iPhone gameplay reported, detailed lesson/device validation pending |
| `scripts/journey_mastery.gd` | `src/campaign/journeyMastery.ts`, `src/storage/journeyProfile.ts` | Implemented / awards, persistent memory deduplication and earned pond gardens tested |
| `scripts/journey_plan.gd` | `src/campaign/journeyPlan.ts`, `data/journey.json`, `src/content/creatureCatalogue.ts` | Implemented / authored data, 44 creature records and all three starting colonies with source traits and unlock eligibility |
| `scripts/journey_profile.gd` | `src/storage/journeyProfile.ts`, `src/storage/saveRepository.ts` | Implemented / records, resident actions, gardens, unlocks and profile-only save retry tested; desktop CFG import outside current mobile persistence |
| `scripts/journey_route.gd` | `src/campaign/journeyRoute.ts` | Partial / seeded 15-encounter route and special visits tested; legacy route/save validation pending |
| `scripts/journey_save.gd` | `src/storage/journeySnapshot.ts`, `src/storage/organismSnapshot.ts`, `src/storage/saveRepository.ts` | Current mobile state implemented / full snapshot continuation, validation, backup and failure tests pass; phone and desktop-save compatibility pending |
| `scripts/lens_optics.gd` | `src/rendering/EncounterView.tsx`, `src/rendering/shaders/lensOptics.ts` | Partial / dish-only runtime filter, lateral color, rim softness, bloom, grain and loss grade; dialog defocus included; explicit taps approximate mip LOD and native optical matching pending |
| `scripts/loop_geometry.gd` | `src/geometry/loopGeometry.ts` | Implemented / 4 local tests passed; upstream parity pending |
| `scripts/loop_resolver.gd` | `src/geometry/loopResolver.ts` | Partial / shared capture and real journey reward dispatch tested; legacy resolver branch pending |
| `scripts/loop_strain.gd` | `src/geometry/loopStrain.ts` | Implemented / local tests passed |
| `scripts/main.gd` | `App.tsx`, `src/mobile/JourneyApp.tsx`, `src/mobile/saveCoordinator.ts`, `src/mobile/GameScreen.tsx` | Implemented current mobile orchestration / saves, profile-only edits, overlays, offers and preferences; full native lifecycle verification pending |
| `scripts/microscope.gd` | `src/rendering/EncounterView.tsx`, `src/rendering/livingSpecimens.tsx`, `src/rendering/organismTextures.ts` | Implemented core presentation / 71 original PNG assets verified; tissue, injury, fusion, specialized forms, ambient layers and settings integrated; native visual/performance comparison pending |
| `scripts/mission_appearance.gd` | `src/rendering/missionAppearance.ts` | Implemented / independent Godot-compatible visual RNG, biome plates/grades, cell phenotypes and habitat tint; determinism tests passed |
| `scripts/mother_alert.gd` | `src/mobile/gameGuidance.ts` | Implemented / source contact-time model and directional threat selector; paused/live timing tests |
| `scripts/mother_appearance.gd` | `src/rendering/organismTextures.ts`, `src/evolution/motherAppearance.ts` | Implemented / fifteen specialized original textures, first-specialization branch and capacity variants; source hash verification passed |
| `scripts/mother_damage.gd` | `src/engine/motherDamage.ts` | Implemented / organelles, injuries, healing, batched contacts, pause and loss tested; native injury visuals pending |
| `scripts/mutation_card.gd` | `src/mobile/EvolutionPanel.tsx` | Implemented / source cards, guided opening demos, compare-details view, costs/tradeoffs and affordability |
| `scripts/mutations.gd` | `src/evolution/captureRules.ts`, `src/evolution/mutations.ts`, `src/campaign/journeyHarvest.ts` | Partial / journey catalogue, offers, costs and all capture effects implemented; native reveal and full fixture coverage pending |
| `scripts/organism_arrival.gd` | `src/ecology/organismArrival.ts` | Implemented / arrival regression now executed and passed |
| `scripts/phage_cluster.gd` | `src/ecology/phageCluster.ts` | Implemented / local attachment and lifetime integration pending full journey |
| `scripts/phage_system.gd` | `src/ecology/phageSystem.ts` | Implemented / local and headless encounter infection, rupture, salvage capture and snapshots tested; full journey/save validation pending |
| `scripts/phage_visual.gd` | `src/rendering/specializedSpecimens.tsx`, `src/rendering/specializedVisuals.ts` | Implemented / three articulated virions, docking, injection, host capsids and burst offspring/debris; CPU pixels passed, native comparison pending |
| `scripts/pond_life.gd` | `src/rendering/pondLife.ts`, `src/rendering/PondAmbient.tsx` | Implemented source recipes / original atlas, Catmull-Rom swimming, focal depths, fluid transport and giant traveller; suspension uses batched path approximations for subpixel optics; native comparison pending |
| `scripts/producer_lab.gd` | `src/experiments/producerLab.ts`, `src/mobile/ExperimentsScreen.tsx` | Implemented / all three public experiments, original overlay goals, capture actions, retry and foreground lifecycle; nine CPU test groups |
| `scripts/producer_lab_rules.gd` | `src/experiments/producerLabRules.ts` | Implemented / escort, two-current layouts, final shield-break phase, scoring and isolation tested |
| `scripts/readable_ui.gd` | `src/mobile/AccessibleText.tsx`, `src/mobile/textAppearance.ts` | Implemented / original Inter, proportional body enlargement, contrast and native scaling; CPU text metrics tested |
| `scripts/records.gd` | `src/storage/journeyProfile.ts` | Legacy-only source store / main invokes records only for full_run and not journey; current public journey records use JourneyProfile, Experiments disables records |
| `scripts/reticle_cursor.gd` | `src/mobile/touchController.ts`, `src/rendering/EncounterView.tsx` | Adapted / direct touch selection, nucleus highlights and nudge preview replace desktop mouse cursor |
| `scripts/run_controller.gd` | `src/engine/encounterSimulation.ts`, `src/campaign/journeySession.ts` | Implemented current journey / content, lessons, progression, evolution, growth, colonies, habitats, retry and durable saves; earlier legacy modes remain separate scope |
| `scripts/run_plan.gd` | `src/campaign/runPlan.ts` | Scope review pending |
| `scripts/soundscape.gd` | `src/audio/soundscape.ts`, `src/audio/soundscapePlayback.ts`, `src/audio/useSoundscape.ts` | Implemented / source music, ambience, cues, pitches, ducking, crossfade, foreground and cleanup tested; native listening pending |
| `scripts/tissue_motion.gd` | `src/rendering/tissueMotion.ts`, `src/rendering/EncounterView.tsx` | Implemented source geometry / cilia and granules batched into native Paths/Points with opacity/width buckets; source vertex curves retained, subpixel raster matching pending |
| `scripts/title_screen.gd` | `src/mobile/JourneyApp.tsx`, `src/mobile/TitleScene.tsx`, `src/mobile/titlePond.ts` | Implemented with adapted presentation / Continue, new-journey confirmation, original colony choices, home pond, journal, settings, help and public experiments entry; original title logo and tagline over an isolated living microscope in the mobile layout; staged desktop entrance omitted, native title review pending |
| `scripts/ui_style.gd` | `src/mobile/AccessibleText.tsx`, `src/mobile/CollectionScreen.tsx` | Adapted / original Inter and pond palette, native press/scroll/dialog patterns and high-contrast text |
| `scripts/water_interaction.gd` | `src/rendering/waterInteraction.ts`, `src/rendering/EncounterView.tsx` | Implemented / pointer wakes, capture/nudge/injury pressure fronts and raw floating-point fluid texture integrated; local wake tests passed, native comparison pending |
| `scripts/water_tracers.gd` | `src/rendering/waterTracers.ts`, `src/rendering/EncounterView.tsx` | Implemented / CPU transport and source speed tails/glints, bounded native draw buckets; visual PRNG differs from Godot; native performance comparison pending |
| `shaders/amoeba_arm.gdshader` | `src/rendering/shaders/amoebaArm.ts` | Compatibility translation / CPU compile and pixel test passed; pinned current AmoebaVisual uses the joined amoeba_body surface instead |
| `shaders/amoeba_body.gdshader` | `src/rendering/shaders/amoebaBody.ts` | Implemented / source SDF union and stream sampling, finite-difference normal replaces fragment derivatives; CPU compile/pixels passed, native comparison pending |
| `shaders/cytoplasm_granules.gdshader` | `src/rendering/tissueMotion.ts` | Implemented CPU geometry equivalent / source granule pockets, energy, gold Mother granules and trails; bounded native batches approximate alpha/width rasterization |
| `shaders/depth_tissue.gdshader` | `src/rendering/shaders/depthTissue.ts` | Compatibility translation / CPU compile and pixel test passed; current microscope and pond use pond_specimen rather than this older shader |
| `shaders/fused_tissue.gdshader` | `src/rendering/shaders/fusedTissue.ts`, `src/rendering/livingSpecimens.tsx` | Implemented / joined tissue surface retires individual cell skins, source feeding/mastery optics; CPU compilation passed, native comparison pending |
| `shaders/lens_optics.gdshader` | `src/rendering/shaders/lensOptics.ts` | Implemented adaptation / CanvasKit compilation passed; explicit blur taps approximate source mip LOD, native color/performance matching pending |
| `shaders/living_bridge.gdshader` | `src/rendering/shaders/livingBridge.ts`, `src/rendering/livingSpecimens.tsx` | Implemented / paired nuclei use source textured breathing bridge; CPU compilation passed, native comparison pending |
| `shaders/living_cilia.gdshader` | `src/rendering/tissueMotion.ts` | Implemented CPU geometry equivalent / source eight-sample strands, delayed beats, morphology, flow drag and lure growth; batched path widths/alpha approximate rasterization |
| `shaders/living_tissue.gdshader` | `src/rendering/shaders/livingTissue.ts`, `src/rendering/tissueUniforms.ts` | Implemented / full source tissue math and host-aware invasion, anatomy, arrival, infection, wound/core erosion; CPU compilation and premultiplied pixel checks passed, native comparison pending |
| `shaders/membrane.gdshader` | `src/rendering/shaders/membrane.ts` | SkSL source translated and wired to diagnostic / native compilation and visual comparison pending |
| `shaders/microscope_field.gdshader` | `src/rendering/shaders/microscopeField.ts` | Implemented adaptation / original plates, pressure-front refraction, shared raw fluid map and eyepiece optics; explicit taps approximate mip LOD; CPU compile/render passed |
| `shaders/organic_motion.gdshaderinc` | `src/rendering/shaders/organicMotion.ts` | SkSL source translated / native compilation pending |
| `shaders/phage.gdshader` | `src/rendering/shaders/phage.ts` | Implemented / source rigid capsid, articulated sheath contraction and leg motion; CPU compile/pixels passed, native comparison pending |
| `shaders/pond_optics.gdshaderinc` | `src/rendering/shaders/pondOptics.ts` | SkSL source translated / native compilation pending |
| `shaders/pond_specimen.gdshader` | `src/rendering/shaders/pondSpecimen.ts`, `src/rendering/PondAmbient.tsx` | Implemented adaptation / original atlas deformation and depth; optical background sampled from field child rather than screen capture; CPU compilation passed, native comparison pending |
| `shaders/pond_suspension.gdshader` | `src/rendering/pondLife.ts`, `src/rendering/PondAmbient.tsx` | Partial equivalent / five source debris forms, seeded recipes and transported motion use batched native paths; fragment refraction, halo and subpixel softness approximated |
| `shaders/water_interaction.gdshaderinc` | `src/rendering/shaders/waterInteraction.ts`, `src/rendering/EncounterView.tsx` | Implemented / raw untagged opaque RGBA_F32 displacement, alpha fixed to one; native upload path integrated and field CPU compilation passed |
| `shaders/water_tracers.gdshader` | `src/rendering/EncounterView.tsx` | CPU geometry equivalent / source point sizes, velocity tails and phase glints batched into native paths/points; Gaussian halo and subpixel antialiasing approximated |
| `tests/amoeba.gd` | `tests/amoeba.test.ts` | Partial / specializedEcology.test.ts covers core crawl, safe rescue site, captivity and recovery; original full run and save assertions pending |
| `tests/amoeba_membrane_reel.gd` | `tests/amoebaMembraneReel.test.ts` | Pending |
| `tests/amoeba_motion.gd` | `tests/amoebaMotion.test.ts` | Pending |
| `tests/amoeba_pixels.gd` | `tests/amoebaPixels.test.ts` | Pending |
| `tests/audio.gd` | `tests/soundscape.test.ts`, `tests/soundscapeAssets.test.ts` | Source mixing/cues, verified assets, interruption and bounded native adapter tested; native listening pending |
| `tests/audio_playback.gd` | `tests/soundscape.test.ts` | Crossfades, pauses, cue routing, silent restores and disposal tested with playback adapter |
| `tests/boss_patterns.gd` | `tests/bossPatterns.test.ts` | Pending |
| `tests/boss_patterns_visual.gd` | `tests/bossPatternsVisual.test.ts` | Pending |
| `tests/campaign_reel.gd` | `tests/campaignReel.test.ts` | Pending |
| `tests/campaign_visual.gd` | `tests/campaignVisual.test.ts` | Pending |
| `tests/capture_confidence.gd` | `tests/captureConfidence.test.ts` | Pending |
| `tests/clot_recovery.gd` | `tests/clotRecovery.test.ts` | Partial / tests/livingPresentation.test.ts covers recovery model; run integration pending |
| `tests/cradle_story.gd` | `tests/cradleStory.test.ts` | Pending |
| `tests/cradle_story_visual.gd` | `tests/cradleStoryVisual.test.ts` | Pending |
| `tests/creature_arrivals.gd` | `tests/creatureArrivals.test.ts` | Pending |
| `tests/creature_cinema_integration.gd` | `tests/discoveryCinema.test.ts` | Offer/profile identity and held pause/playback tests passed; native lifecycle verification pending |
| `tests/creature_cinema_visual.gd` | `tests/creatureCinemaVisual.test.ts` | Pending |
| `tests/creature_films.gd` | `tests/discoveryCinema.test.ts` | All 44 live scenes, original scripts/audio and deterministic replay tested |
| `tests/cyst_nudge.gd` | `tests/nudgeFoodWeb.test.ts (partial)` | Partial / module regression tests written, not executed; original run and UI assertions pending |
| `tests/discovery_journal.gd` | `tests/creatureCatalogue.test.ts`, `tests/creaturePersistence.test.ts` | Partial / 44 records and discoveries/rescues covered; journal UI and cinema pending |
| `tests/dish_labels.gd` | `tests/dishLabels.test.ts` | Pending |
| `tests/drift_review.gd` | `tests/driftReview.test.ts` | Pending |
| `tests/ecology_visual.gd` | `tests/ecologyVisual.test.ts` | Pending |
| `tests/ecosystem_expansion.gd` | `tests/ecosystemExpansion.test.ts` | Pending |
| `tests/encounter_rhythm.gd` | `tests/encounterRhythm.test.ts` | Pending |
| `tests/evolution_comparison.gd` | `tests/evolutionPresentation.test.ts` | All twelve trait previews match live capture rules and do not mutate simulation/RNG |
| `tests/evolution_reel.gd` | `tests/evolutionReel.test.ts` | Pending |
| `tests/evolution_rules.gd` | `tests/evolutionRules.test.ts` | Pending |
| `tests/evolution_visuals.gd` | `tests/evolutionPresentation.test.ts`, `tests/journeyProgression.test.ts` | Anatomy/growth/readiness models tested; source native visual comparison pending |
| `tests/expedition_creatures.gd` | `tests/creatureEcology.test.ts`, `tests/creaturePersistence.test.ts` | Partial / all 12 roles, seeded unseen preference, crowd limits, save/retry and rescue identities covered; native fixture pending |
| `tests/feel_reel.gd` | `tests/feelReel.test.ts` | Pending |
| `tests/finale_pacing.gd` | `tests/finalePacing.test.ts` | Pending |
| `tests/fluid_dynamics.gd` | `tests/fluidDynamics.test.ts` | Partial / fluidCapture.test.ts and livingPresentation.test.ts cover CPU field, board and constant-flow tracer assertions; actual journey and native tracer integration pending |
| `tests/food_web.gd` | `tests/nudgeFoodWeb.test.ts (partial)` | Partial / module regression tests written, not executed; full journey and save assertions pending |
| `tests/frame_sample.gd` | `tests/frameSample.test.ts` | Pending |
| `tests/free_polygons.gd` | `tests/freePolygons.test.ts` | Partially covered by tests/boardInput.test.ts; original run/GUI assertions pending |
| `tests/full_run.gd` | `tests/fullRun.test.ts` | Pending |
| `tests/game_feel.gd` | `tests/gameFeel.test.ts` | Nine source-derived feedback, cue, counter and purity tests passed |
| `tests/habitat_events.gd` | `tests/habitatEvents.test.ts` | Pending |
| `tests/habitat_events_visual.gd` | `tests/habitatEventsVisual.test.ts` | Pending |
| `tests/habitats_visual.gd` | `tests/habitatsVisual.test.ts` | Pending |
| `tests/harvest_feasibility.gd` | `tests/harvestFeasibility.test.ts` | Pending |
| `tests/harvest_pacing.gd` | `tests/harvestPacing.test.ts` | Pending |
| `tests/harvest_rules.gd` | `tests/harvestRules.test.ts` | Pending |
| `tests/harvest_visual.gd` | `tests/harvestVisual.test.ts` | Pending |
| `tests/home_pond.gd` | `tests/homePond.test.ts` | Resident naming, welcomes, growth, pages, companions and gardens tested; native UI comparison pending |
| `tests/home_pond_visual.gd` | `tests/homePondVisual.test.ts` | Pending |
| `tests/human_pacing.gd` | `tests/humanPacing.test.ts` | Pending |
| `tests/integration.gd` | `tests/integration.test.ts` | Pending |
| `tests/interface_dialogs.gd` | `tests/saveCoordinator.test.ts`, `src/mobile/JourneyApp.tsx` | Partial / unfinished-journey protection covered; native alert interaction and remaining dialogs pending |
| `tests/journey_clarity.gd` | `tests/journeyClarity.test.ts` | Pending |
| `tests/journey_ecology.gd` | `tests/nudgeFoodWeb.test.ts`, `tests/encounterSimulation.test.ts` | Partial / food-web and gate integration coverage passed; full fixture pending |
| `tests/journey_feasibility.gd` | `tests/journeyFeasibility.test.ts` | Pending |
| `tests/journey_habitats.gd` | `tests/journeyHabitats.test.ts` | Source bloom/hunter/visitor rules, saved choice and historical schema-2 continuation tested |
| `tests/journey_mastery.gd` | `tests/encounterSimulation.test.ts` | Partial / capture and completion mastery assertions passed; full fixture pending |
| `tests/journey_mutations.gd` | `tests/journeyMutations.test.ts` | Pending |
| `tests/journey_rules.gd` | `tests/journeyRules.test.ts` | Pending |
| `tests/journey_visual.gd` | `tests/journeyVisual.test.ts` | Pending |
| `tests/loop_routes.gd` | `tests/loopRoutes.test.ts` | Pending |
| `tests/mission_appearance.gd` | `tests/missionAppearance.test.ts` | Pending |
| `tests/mother_boundary.gd` | `tests/motherBoundary.test.ts` | Partially covered by tests/boardInput.test.ts; original run/GUI assertions pending |
| `tests/mother_damage.gd` | `tests/encounterSimulation.test.ts` | Partial / CPU injury, contact, pause and loss assertions passed; native visual fixture pending |
| `tests/mother_damage_reel.gd` | `tests/motherDamageReel.test.ts` | Pending |
| `tests/mother_invasion_reel.gd` | `tests/motherInvasionReel.test.ts` | Pending |
| `tests/motion_pixels.gd` | `tests/motionPixels.test.ts` | Pending |
| `tests/motion_reel.gd` | `tests/motionReel.test.ts` | Pending |
| `tests/node_drift.gd` | `tests/nodeDrift.test.ts` | Partially covered by tests/boardInput.test.ts; original run/GUI assertions pending |
| `tests/onboarding.gd` | `tests/onboarding.test.ts` | Pending |
| `tests/petriverse_trailer_capture.gd` | `tests/petriverseTrailerCapture.test.ts` | Pending |
| `tests/phage_visuals.gd` | `tests/phageVisuals.test.ts` | Pending |
| `tests/phages.gd` | `tests/phages.test.ts` | Partial / specializedEcology.test.ts covers host filtering, infection deadline, rupture and snapshot; nudge, journey rewards, pause and full save assertions pending |
| `tests/pond_cohesion_reel.gd` | `tests/pondCohesionReel.test.ts` | Pending |
| `tests/pond_memories.gd` | `tests/homePond.test.ts`, `tests/journeyEpilogue.test.ts` | Garden unlock/count and source epilogue record selection tested |
| `tests/pond_memories_visual.gd` | `tests/pondMemoriesVisual.test.ts` | Pending |
| `tests/pond_motion.gd` | `tests/pondMotion.test.ts` | Pending |
| `tests/pond_review.gd` | `tests/pondReview.test.ts` | Pending |
| `tests/procedural_journey.gd` | `tests/proceduralJourney.test.ts` | Pending |
| `tests/producer_improvements.gd` | `tests/producerImprovements.test.ts` | Pending |
| `tests/producer_lab.gd` | `tests/producerLab.test.ts` | Nine source-derived groups passed / all three real capture modes, timing, retry and isolation; native scene comparison pending |
| `tests/rare_visitors.gd` | `tests/creatureEcology.test.ts`, `tests/creaturePersistence.test.ts` | Partial / helping behavior, active clocks, capture/rescue and Moonlace bloom saves covered |
| `tests/rare_visitors_visual.gd` | `tests/creatureRendering.test.ts` | Partial / original hashes, nucleus offsets and extents covered; rendered device comparison pending |
| `tests/save_recovery.gd` | `tests/saveRecovery.test.ts`, `tests/journeySaveSnapshot.test.ts`, `tests/journeyProfile.test.ts`, `tests/persistenceIntegration.test.ts` | Partial / corruption, backup fallback, malformed/future data, failed writes and JSON-profile defaults covered; desktop legacy CFG migration pending |
| `tests/showcase_capture.gd` | `tests/showcaseCapture.test.ts` | Pending |
| `tests/test_suite.gd` | `tests/testSuite.test.ts` | Pending |
| `tests/title_screen.gd` | `tests/saveCoordinator.test.ts`, `tests/persistenceIntegration.test.ts` | Partial / startup, Continue, replacement, ordering and failure behavior tested; native presentation/device checks pending |
| `tests/trailer_capture.gd` | `tests/trailerCapture.test.ts` | Pending |
| `tests/visual_motion.gd` | `tests/visualMotion.test.ts` | Pending |
| `tests/visual_review.gd` | `tests/visualReview.test.ts` | Pending |
