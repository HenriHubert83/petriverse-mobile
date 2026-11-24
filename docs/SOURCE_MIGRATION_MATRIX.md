# Source migration matrix

Pinned source: be96d3e0641571cc37255fb8701ea83e20c28aee. Every source file is accounted for; destination paths are proposed. Pending means not ported; Implemented/unverified means code exists but parity tests are not executed; Verified requires regression evidence. Test files may map to multiple tests and visual fixtures require device evidence.

| Original source | Proposed mobile target | Status |
|---|---|---|
| `scripts/amoeba.gd` | `src/ecology/amoeba.ts` | Pending |
| `scripts/amoeba_outline.gd` | `src/rendering/amoebaOutline.ts` | Pending |
| `scripts/amoeba_system.gd` | `src/ecology/amoebaSystem.ts` | Pending |
| `scripts/amoeba_visual.gd` | `src/rendering/amoebaVisual.ts` | Pending |
| `scripts/bacterium.gd` | `src/ecology/bacterium.ts` | Pending |
| `scripts/board.gd` | `src/geometry/board.ts` | Implemented / local regression tests passed; upstream integration pending |
| `scripts/capture_feedback.gd` | `src/geometry/captureFeedback.ts` | Pending |
| `scripts/cell.gd` | `src/geometry/cell.ts` | Implemented / local regression tests passed; upstream integration pending |
| `scripts/clot.gd` | `src/geometry/clot.ts` | Pending |
| `scripts/conjoined.gd` | `src/ecology/conjoined.ts` | Pending |
| `scripts/creature_cinema.gd` | `src/cinema/creatureCinema.ts` | Pending |
| `scripts/creature_film_stage.gd` | `src/cinema/creatureFilmStage.ts` | Pending |
| `scripts/creature_forms.gd` | `src/campaign/creatureForms.ts` | Pending |
| `scripts/cyst_nudge.gd` | `src/ecology/cystNudge.ts` | Pending |
| `scripts/dish_labels.gd` | `src/components/dishLabels.ts` | Pending |
| `scripts/drifter.gd` | `src/ecology/drifter.ts` | Pending |
| `scripts/ecology_enemy.gd` | `src/ecology/ecologyEnemy.ts` | Pending |
| `scripts/encounter.gd` | `src/campaign/encounter.ts` | Scope review pending |
| `scripts/encounter_rhythm.gd` | `src/campaign/encounterRhythm.ts` | Pending |
| `scripts/evolution_anatomy.gd` | `src/evolution/evolutionAnatomy.ts` | Pending |
| `scripts/evolution_comparison.gd` | `src/components/evolutionComparison.ts` | Pending |
| `scripts/evolution_reveal.gd` | `src/components/evolutionReveal.ts` | Pending |
| `scripts/expedition_creatures.gd` | `src/campaign/expeditionCreatures.ts` | Pending |
| `scripts/fluid_field.gd` | `src/engine/fluidField.ts` | Pending |
| `scripts/game_feel.gd` | `src/rendering/gameFeel.ts` | Pending |
| `scripts/habitat_events.gd` | `src/campaign/habitatEvents.ts` | Pending |
| `scripts/harvest.gd` | `src/campaign/harvest.ts` | Scope review pending |
| `scripts/harvest_flow.gd` | `src/campaign/harvestFlow.ts` | Pending |
| `scripts/harvest_organism.gd` | `src/ecology/harvestOrganism.ts` | Pending |
| `scripts/home_pond.gd` | `src/components/homePond.ts` | Pending |
| `scripts/hud.gd` | `src/components/hud.ts` | Pending |
| `scripts/injury_motes.gd` | `src/rendering/injuryMotes.ts` | Pending |
| `scripts/input_controller.gd` | `src/geometry/inputController.ts` | Implemented / local regression tests passed; upstream integration pending |
| `scripts/journey_boss.gd` | `src/campaign/journeyBoss.ts` | Pending |
| `scripts/journey_discoveries.gd` | `src/campaign/journeyDiscoveries.ts` | Pending |
| `scripts/journey_ecology.gd` | `src/ecology/journeyEcology.ts` | Pending |
| `scripts/journey_guidance.gd` | `src/components/journeyGuidance.ts` | Pending |
| `scripts/journey_habitats.gd` | `src/campaign/journeyHabitats.ts` | Pending |
| `scripts/journey_harvest.gd` | `src/campaign/journeyHarvest.ts` | Pending |
| `scripts/journey_hud.gd` | `src/components/journeyHud.ts` | Pending |
| `scripts/journey_lesson.gd` | `src/campaign/journeyLesson.ts` | Pending |
| `scripts/journey_mastery.gd` | `src/campaign/journeyMastery.ts` | Pending |
| `scripts/journey_plan.gd` | `src/campaign/journeyPlan.ts` | Pending |
| `scripts/journey_profile.gd` | `src/storage/journeyProfile.ts` | Pending |
| `scripts/journey_route.gd` | `src/campaign/journeyRoute.ts` | Pending |
| `scripts/journey_save.gd` | `src/storage/journeySave.ts` | Pending |
| `scripts/lens_optics.gd` | `src/rendering/lensOptics.ts` | Pending |
| `scripts/loop_geometry.gd` | `src/geometry/loopGeometry.ts` | Implemented / 4 local tests passed; upstream parity pending |
| `scripts/loop_resolver.gd` | `src/geometry/loopResolver.ts` | Pending |
| `scripts/loop_strain.gd` | `src/geometry/loopStrain.ts` | Pending |
| `scripts/main.gd` | `src/engine/main.ts` | Pending |
| `scripts/microscope.gd` | `src/rendering/microscope.ts` | Pending |
| `scripts/mission_appearance.gd` | `src/rendering/missionAppearance.ts` | Pending |
| `scripts/mother_alert.gd` | `src/engine/motherAlert.ts` | Pending |
| `scripts/mother_appearance.gd` | `src/rendering/motherAppearance.ts` | Pending |
| `scripts/mother_damage.gd` | `src/engine/motherDamage.ts` | Pending |
| `scripts/mutation_card.gd` | `src/components/mutationCard.ts` | Pending |
| `scripts/mutations.gd` | `src/evolution/mutations.ts` | Pending |
| `scripts/organism_arrival.gd` | `src/ecology/organismArrival.ts` | Pending |
| `scripts/phage_cluster.gd` | `src/ecology/phageCluster.ts` | Pending |
| `scripts/phage_system.gd` | `src/ecology/phageSystem.ts` | Pending |
| `scripts/phage_visual.gd` | `src/rendering/phageVisual.ts` | Pending |
| `scripts/pond_life.gd` | `src/rendering/pondLife.ts` | Pending |
| `scripts/producer_lab.gd` | `src/fixtures/producerLab.ts` | Scope review pending |
| `scripts/producer_lab_rules.gd` | `src/fixtures/producerLabRules.ts` | Scope review pending |
| `scripts/readable_ui.gd` | `src/components/readableUi.ts` | Pending |
| `scripts/records.gd` | `src/storage/records.ts` | Pending |
| `scripts/reticle_cursor.gd` | `src/rendering/reticleCursor.ts` | Pending |
| `scripts/run_controller.gd` | `src/engine/runController.ts` | Pending |
| `scripts/run_plan.gd` | `src/campaign/runPlan.ts` | Scope review pending |
| `scripts/soundscape.gd` | `src/audio/soundscape.ts` | Pending |
| `scripts/tissue_motion.gd` | `src/rendering/tissueMotion.ts` | Pending |
| `scripts/title_screen.gd` | `src/components/titleScreen.ts` | Pending |
| `scripts/ui_style.gd` | `src/components/uiStyle.ts` | Pending |
| `scripts/water_interaction.gd` | `src/rendering/waterInteraction.ts` | Pending |
| `scripts/water_tracers.gd` | `src/rendering/waterTracers.ts` | Pending |
| `shaders/amoeba_arm.gdshader` | `src/rendering/shaders/amoebaArm.ts` | Pending |
| `shaders/amoeba_body.gdshader` | `src/rendering/shaders/amoebaBody.ts` | Pending |
| `shaders/cytoplasm_granules.gdshader` | `src/rendering/shaders/cytoplasmGranules.ts` | Pending |
| `shaders/depth_tissue.gdshader` | `src/rendering/shaders/depthTissue.ts` | Pending |
| `shaders/fused_tissue.gdshader` | `src/rendering/shaders/fusedTissue.ts` | Pending |
| `shaders/lens_optics.gdshader` | `src/rendering/shaders/lensOptics.ts` | Pending |
| `shaders/living_bridge.gdshader` | `src/rendering/shaders/livingBridge.ts` | Pending |
| `shaders/living_cilia.gdshader` | `src/rendering/shaders/livingCilia.ts` | Pending |
| `shaders/living_tissue.gdshader` | `src/rendering/shaders/livingTissue.ts` | Pending |
| `shaders/membrane.gdshader` | `src/rendering/shaders/membrane.ts` | Pending |
| `shaders/microscope_field.gdshader` | `src/rendering/shaders/microscopeField.ts` | Pending |
| `shaders/organic_motion.gdshaderinc` | `src/rendering/shaders/organicMotion.ts` | Pending |
| `shaders/phage.gdshader` | `src/rendering/shaders/phage.ts` | Pending |
| `shaders/pond_optics.gdshaderinc` | `src/rendering/shaders/pondOptics.ts` | Pending |
| `shaders/pond_specimen.gdshader` | `src/rendering/shaders/pondSpecimen.ts` | Pending |
| `shaders/pond_suspension.gdshader` | `src/rendering/shaders/pondSuspension.ts` | Pending |
| `shaders/water_interaction.gdshaderinc` | `src/rendering/shaders/waterInteraction.ts` | Pending |
| `shaders/water_tracers.gdshader` | `src/rendering/shaders/waterTracers.ts` | Pending |
| `tests/amoeba.gd` | `tests/amoeba.test.ts` | Pending |
| `tests/amoeba_membrane_reel.gd` | `tests/amoebaMembraneReel.test.ts` | Pending |
| `tests/amoeba_motion.gd` | `tests/amoebaMotion.test.ts` | Pending |
| `tests/amoeba_pixels.gd` | `tests/amoebaPixels.test.ts` | Pending |
| `tests/audio.gd` | `tests/audio.test.ts` | Pending |
| `tests/audio_playback.gd` | `tests/audioPlayback.test.ts` | Pending |
| `tests/boss_patterns.gd` | `tests/bossPatterns.test.ts` | Pending |
| `tests/boss_patterns_visual.gd` | `tests/bossPatternsVisual.test.ts` | Pending |
| `tests/campaign_reel.gd` | `tests/campaignReel.test.ts` | Pending |
| `tests/campaign_visual.gd` | `tests/campaignVisual.test.ts` | Pending |
| `tests/capture_confidence.gd` | `tests/captureConfidence.test.ts` | Pending |
| `tests/clot_recovery.gd` | `tests/clotRecovery.test.ts` | Pending |
| `tests/cradle_story.gd` | `tests/cradleStory.test.ts` | Pending |
| `tests/cradle_story_visual.gd` | `tests/cradleStoryVisual.test.ts` | Pending |
| `tests/creature_arrivals.gd` | `tests/creatureArrivals.test.ts` | Pending |
| `tests/creature_cinema_integration.gd` | `tests/creatureCinemaIntegration.test.ts` | Pending |
| `tests/creature_cinema_visual.gd` | `tests/creatureCinemaVisual.test.ts` | Pending |
| `tests/creature_films.gd` | `tests/creatureFilms.test.ts` | Pending |
| `tests/cyst_nudge.gd` | `tests/cystNudge.test.ts` | Pending |
| `tests/discovery_journal.gd` | `tests/discoveryJournal.test.ts` | Pending |
| `tests/dish_labels.gd` | `tests/dishLabels.test.ts` | Pending |
| `tests/drift_review.gd` | `tests/driftReview.test.ts` | Pending |
| `tests/ecology_visual.gd` | `tests/ecologyVisual.test.ts` | Pending |
| `tests/ecosystem_expansion.gd` | `tests/ecosystemExpansion.test.ts` | Pending |
| `tests/encounter_rhythm.gd` | `tests/encounterRhythm.test.ts` | Pending |
| `tests/evolution_comparison.gd` | `tests/evolutionComparison.test.ts` | Pending |
| `tests/evolution_reel.gd` | `tests/evolutionReel.test.ts` | Pending |
| `tests/evolution_rules.gd` | `tests/evolutionRules.test.ts` | Pending |
| `tests/evolution_visuals.gd` | `tests/evolutionVisuals.test.ts` | Pending |
| `tests/expedition_creatures.gd` | `tests/expeditionCreatures.test.ts` | Pending |
| `tests/feel_reel.gd` | `tests/feelReel.test.ts` | Pending |
| `tests/finale_pacing.gd` | `tests/finalePacing.test.ts` | Pending |
| `tests/fluid_dynamics.gd` | `tests/fluidDynamics.test.ts` | Pending |
| `tests/food_web.gd` | `tests/foodWeb.test.ts` | Pending |
| `tests/frame_sample.gd` | `tests/frameSample.test.ts` | Pending |
| `tests/free_polygons.gd` | `tests/freePolygons.test.ts` | Partially covered by tests/boardInput.test.ts; original run/GUI assertions pending |
| `tests/full_run.gd` | `tests/fullRun.test.ts` | Pending |
| `tests/game_feel.gd` | `tests/gameFeel.test.ts` | Pending |
| `tests/habitat_events.gd` | `tests/habitatEvents.test.ts` | Pending |
| `tests/habitat_events_visual.gd` | `tests/habitatEventsVisual.test.ts` | Pending |
| `tests/habitats_visual.gd` | `tests/habitatsVisual.test.ts` | Pending |
| `tests/harvest_feasibility.gd` | `tests/harvestFeasibility.test.ts` | Pending |
| `tests/harvest_pacing.gd` | `tests/harvestPacing.test.ts` | Pending |
| `tests/harvest_rules.gd` | `tests/harvestRules.test.ts` | Pending |
| `tests/harvest_visual.gd` | `tests/harvestVisual.test.ts` | Pending |
| `tests/home_pond.gd` | `tests/homePond.test.ts` | Pending |
| `tests/home_pond_visual.gd` | `tests/homePondVisual.test.ts` | Pending |
| `tests/human_pacing.gd` | `tests/humanPacing.test.ts` | Pending |
| `tests/integration.gd` | `tests/integration.test.ts` | Pending |
| `tests/interface_dialogs.gd` | `tests/interfaceDialogs.test.ts` | Pending |
| `tests/journey_clarity.gd` | `tests/journeyClarity.test.ts` | Pending |
| `tests/journey_ecology.gd` | `tests/journeyEcology.test.ts` | Pending |
| `tests/journey_feasibility.gd` | `tests/journeyFeasibility.test.ts` | Pending |
| `tests/journey_habitats.gd` | `tests/journeyHabitats.test.ts` | Pending |
| `tests/journey_mastery.gd` | `tests/journeyMastery.test.ts` | Pending |
| `tests/journey_mutations.gd` | `tests/journeyMutations.test.ts` | Pending |
| `tests/journey_rules.gd` | `tests/journeyRules.test.ts` | Pending |
| `tests/journey_visual.gd` | `tests/journeyVisual.test.ts` | Pending |
| `tests/loop_routes.gd` | `tests/loopRoutes.test.ts` | Pending |
| `tests/mission_appearance.gd` | `tests/missionAppearance.test.ts` | Pending |
| `tests/mother_boundary.gd` | `tests/motherBoundary.test.ts` | Partially covered by tests/boardInput.test.ts; original run/GUI assertions pending |
| `tests/mother_damage.gd` | `tests/motherDamage.test.ts` | Pending |
| `tests/mother_damage_reel.gd` | `tests/motherDamageReel.test.ts` | Pending |
| `tests/mother_invasion_reel.gd` | `tests/motherInvasionReel.test.ts` | Pending |
| `tests/motion_pixels.gd` | `tests/motionPixels.test.ts` | Pending |
| `tests/motion_reel.gd` | `tests/motionReel.test.ts` | Pending |
| `tests/node_drift.gd` | `tests/nodeDrift.test.ts` | Partially covered by tests/boardInput.test.ts; original run/GUI assertions pending |
| `tests/onboarding.gd` | `tests/onboarding.test.ts` | Pending |
| `tests/petriverse_trailer_capture.gd` | `tests/petriverseTrailerCapture.test.ts` | Pending |
| `tests/phage_visuals.gd` | `tests/phageVisuals.test.ts` | Pending |
| `tests/phages.gd` | `tests/phages.test.ts` | Pending |
| `tests/pond_cohesion_reel.gd` | `tests/pondCohesionReel.test.ts` | Pending |
| `tests/pond_memories.gd` | `tests/pondMemories.test.ts` | Pending |
| `tests/pond_memories_visual.gd` | `tests/pondMemoriesVisual.test.ts` | Pending |
| `tests/pond_motion.gd` | `tests/pondMotion.test.ts` | Pending |
| `tests/pond_review.gd` | `tests/pondReview.test.ts` | Pending |
| `tests/procedural_journey.gd` | `tests/proceduralJourney.test.ts` | Pending |
| `tests/producer_improvements.gd` | `tests/producerImprovements.test.ts` | Pending |
| `tests/producer_lab.gd` | `tests/producerLab.test.ts` | Pending |
| `tests/rare_visitors.gd` | `tests/rareVisitors.test.ts` | Pending |
| `tests/rare_visitors_visual.gd` | `tests/rareVisitorsVisual.test.ts` | Pending |
| `tests/save_recovery.gd` | `tests/saveRecovery.test.ts` | Pending |
| `tests/showcase_capture.gd` | `tests/showcaseCapture.test.ts` | Pending |
| `tests/test_suite.gd` | `tests/testSuite.test.ts` | Pending |
| `tests/title_screen.gd` | `tests/titleScreen.test.ts` | Pending |
| `tests/trailer_capture.gd` | `tests/trailerCapture.test.ts` | Pending |
| `tests/visual_motion.gd` | `tests/visualMotion.test.ts` | Pending |
| `tests/visual_review.gd` | `tests/visualReview.test.ts` | Pending |
