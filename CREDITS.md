# Credits and attribution

**Petriverse**: original game, design, code, art and audio by Marco van Hylckama Vlieg, as credited in the upstream README. Original project: https://github.com/TheMarco/petriverse. Reference: version 0.3.0, commit be96d3e0641571cc37255fb8701ea83e20c28aee.

**Mobile adaptation**: Henri Hubert / AI Engineer Hub (https://aiengineerhub.com/). The adaptation changes the engine, application UI and controls to support landscape iOS and Android gameplay. Development changes include GDScript-to-TypeScript simulation and journey ports, touch controls, a Skia gameplay screen and initial Godot-to-SkSL shader translations. Complete feature integration and native visual verification are still in progress. See DEVLOG.md for the dated record of modifications.

The 21 PNG files currently in `assets/organisms` are unmodified original artwork from the pinned commit. Their byte lengths and Git blob hashes match `docs/ASSET_MANIFEST.json`. The original authored journey and mutation text is carried into `data/journey.json`. No original audio, narration or font files are included in this checkpoint.

The seeded RNG adapts PCG32 by M.E. O'Neill (Apache-2.0) and Godot RandomPCG range sampling (MIT). Applicable notices are retained in `licenses/PCG.txt` and `licenses/Godot.txt`. The mobile engine is a TypeScript adaptation, not a distribution of the Godot engine.

Original material is licensed under CC BY-NC 4.0: https://creativecommons.org/licenses/by-nc/4.0/. See LICENSE for the verbatim original license. Preserve attribution, notice of changes and applicable notices. The original README also credits Godot Engine (MIT), Inter (SIL OFL 1.1), and ElevenLabs-generated narration (voice: Willa Ashford) and sound effects. Review upstream dist/THIRD-PARTY-NOTICES.txt and prototype/assets/fonts/OFL.txt before asset import; retain applicable notices and verify distribution rights, including generated assets and app-store terms. Henri supplied a screenshot of Marco's message inviting him to fork the game and contribute the work back. Retain that correspondence and confirm store distribution scope before release.

No monetization is intended.
