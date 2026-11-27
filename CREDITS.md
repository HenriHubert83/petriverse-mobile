# Credits and attribution

**Petriverse**: original game, design, code, art and audio by Marco van Hylckama Vlieg, as credited in the upstream README. Original project: https://github.com/TheMarco/petriverse. Reference: version 0.3.0, commit be96d3e0641571cc37255fb8701ea83e20c28aee.

**Mobile adaptation**: Henri Hubert / AI Engineer Hub (https://aiengineerhub.com/). The adaptation changes the engine, application UI and controls to support landscape iOS and Android gameplay. Development changes include GDScript-to-TypeScript simulation and journey ports, touch controls, Skia rendering and Godot-to-SkSL shader translations, a field journal and home pond, discovery films, durable local preferences, and native audio playback. Native visual and playback verification remains a separate device check. See DEVLOG.md for the dated record of modifications.

The 71 PNG files in `assets/organisms` and `assets/biomes` are unmodified original artwork from the pinned commit. Their byte lengths and Git blob hashes match `docs/ASSET_MANIFEST.json`. The original authored journey and mutation text is carried into `data/journey.json`; original creature names and descriptions are retained in `src/content/creatureCatalogue.ts`.

The illustrated title logo in `assets/branding/petriverse-title-v2.png` is also an unmodified original from that commit, verified against the same manifest. The mobile title presents it over a separate, decorative living microscope using the shared renderer, adapted to the landscape menu layout.

The mobile app icon in `assets/branding/app-icon.png` is a modified derivative of that title logo, not an unmodified source asset. On 2026-11-26 the organic P emblem was adapted with image generation, with the wordmark removed and a fully opaque dark background added. Expo's icon pipeline normalized the result to a 1024-by-1024 RGB PNG. The original logo is preserved separately. Icon SHA-256: `04a2d566b443cb034f8a2af78a1920c54b0e0a3315887d236096dcf58f2410fd`. The original artwork attribution and CC BY-NC 4.0 terms continue to apply.

Original audio imports are 19 unmodified OGG soundscape files in `assets/audio` (three music tracks, fourteen effects, and two ambient layers) and 44 unmodified OGG introductions in `assets/audio/introductions`. All source byte lengths and Git blob hashes were verified against `docs/ASSET_MANIFEST.json`. The original README credits ElevenLabs-generated narration, voice Willa Ashford, and sound effects. The mobile port retains those recordings and their original dialogue.

Native playback uses AAC M4A compatibility copies in `assets/audio/mobile` and `assets/audio/introductions-mobile`, encoded at 128 kbps and 44.1 kHz. The connection sound also has an octave copy so the original higher notes can be reproduced within the native playback rate limit. These format and pitch derivatives are recorded with source Git hashes, output SHA-256 hashes, sizes and durations in `docs/AUDIO_DERIVATIVES.json` and `src/cinema/narrationManifest.json`. The soundtrack sequencing, pentatonic connection notes, event feedback, narration ducking and volume defaults are adapted from the original `soundscape.gd`.

The unmodified Inter variable font and its SIL Open Font License 1.1 notice are retained in `assets/fonts/Inter-Variable.ttf` and `assets/fonts/OFL.txt`, verified against the same source manifest. Inter is credited to the Inter Project authors. The exact upstream `dist/THIRD-PARTY-NOTICES.txt` is preserved as `licenses/UPSTREAM-THIRD-PARTY-NOTICES.txt` (Git blob `feda8902958ba727c6cdbf3fb9cfbe41351e4f04`); it includes historical Godot distribution notices and is not an inventory of this mobile app's runtime dependencies.

The seeded RNG adapts PCG32 by M.E. O'Neill (Apache-2.0) and Godot RandomPCG range sampling (MIT). Applicable notices are retained in `licenses/PCG.txt` and `licenses/Godot.txt`. The mobile engine is a TypeScript adaptation, not a distribution of the Godot engine.

Original material is licensed under CC BY-NC 4.0: https://creativecommons.org/licenses/by-nc/4.0/. See LICENSE for the verbatim original license. Preserve attribution, notice of changes and applicable notices. The original README also credits Godot Engine (MIT). Henri supplied a screenshot of Marco's message inviting him to fork the game and contribute the work back. Retain that correspondence and confirm store distribution scope before release.

No monetization is intended.
