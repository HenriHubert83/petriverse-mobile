// Hash-verified originals and AAC compatibility copies: docs/AUDIO_DERIVATIVES.json.
import type {EffectName,MusicTrack} from './soundscape';
export const MUSIC:Record<MusicTrack,number>={
  stillwater:require('../../assets/audio/mobile/petriverse-stillwater.m4a'),
  glassgarden:require('../../assets/audio/mobile/petriverse-glassgarden.m4a'),
  deepwater:require('../../assets/audio/mobile/petriverse-blue-deep.m4a'),
};
export const SOUNDS:Record<EffectName,number>={
  connect:require('../../assets/audio/mobile/connect.m4a'),close:require('../../assets/audio/mobile/close.m4a'),
  absorb:require('../../assets/audio/mobile/absorb.m4a'),injury:require('../../assets/audio/mobile/injury.m4a'),
  fracture:require('../../assets/audio/mobile/fracture.m4a'),evolve:require('../../assets/audio/mobile/evolve.m4a'),
  warning:require('../../assets/audio/mobile/warning.m4a'),victory:require('../../assets/audio/mobile/victory.m4a'),
  loss:require('../../assets/audio/mobile/loss.m4a'),mastery:require('../../assets/audio/mobile/mastery.m4a'),
  heartbeat:require('../../assets/audio/mobile/heartbeat.m4a'),swell:require('../../assets/audio/mobile/swell.m4a'),
  ui_press:require('../../assets/audio/mobile/ui_press.m4a'),ui_hover:require('../../assets/audio/mobile/ui_hover.m4a'),
};
export const POND=require('../../assets/audio/mobile/pond.m4a') as number;
export const CURRENT=require('../../assets/audio/mobile/current-layer.m4a') as number;
export const CONNECT_OCTAVE=require('../../assets/audio/mobile/connect-octave.m4a') as number;
