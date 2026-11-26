// Original controls: prototype/scripts/main.gd and soundscape.gd.
import {UnsupportedSaveVersionError} from '../storage/saveRepository';

export interface Preferences {
  version:1;
  musicVolume:number;
  effectsVolume:number;
  muted:boolean;
  subtitles:boolean;
  reducedMotion:boolean;
  highContrast:boolean;
  largeText:boolean;
  assistedClosure:boolean;
  deliberateCapture:boolean;
  clickMode:boolean;
  visualQuality:0|1|2;
}
export type PreferencesPatch=Partial<Omit<Preferences,'version'>>;
export const DEFAULT_PREFERENCES:Readonly<Preferences>=Object.freeze({
  version:1,musicVolume:.65,effectsVolume:.70,muted:false,subtitles:true,
  reducedMotion:false,highContrast:false,largeText:false,assistedClosure:false,
  deliberateCapture:false,clickMode:false,visualQuality:2,
});
const flags=['muted','subtitles','reducedMotion','highContrast','largeText','assistedClosure','deliberateCapture','clickMode'] as const;

// Version 0 was a partial flat preference object. Only that schema may fill
// missing values; a damaged current schema must use its verified backup.
export function parsePreferences(input:unknown):Preferences {
  if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Invalid preferences.');
  const data=input as Record<string,unknown>,version=data.version;
  if(typeof version==='number'&&Number.isInteger(version)&&version>1)throw new UnsupportedSaveVersionError('These preferences need a newer version of Petriverse.');
  if(version!==undefined&&version!==0&&version!==1)throw new Error('Invalid preferences version.');
  const migrated=version!==1?{...DEFAULT_PREFERENCES,...data,version:1}:data;
  for(const key of flags)if(typeof migrated[key]!=='boolean')throw new Error(`Invalid ${key}.`);
  for(const key of ['musicVolume','effectsVolume']){
    const value=migrated[key];
    if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>1)throw new Error(`Invalid ${key}.`);
  }
  if(migrated.visualQuality!==0&&migrated.visualQuality!==1&&migrated.visualQuality!==2)throw new Error('Invalid visual quality.');
  return Object.fromEntries(Object.keys(DEFAULT_PREFERENCES).map(key=>[key,migrated[key]])) as unknown as Preferences;
}
