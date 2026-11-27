// Unmodified artwork from the pinned original. See CREDITS.md and ASSET_MANIFEST.json.
import {formDefinition} from '../content/creatureCatalogue';
export const organismTextures={
  cell:require('../../assets/organisms/cell.png'),
  mother3:require('../../assets/organisms/mother-young.png'),
  mother4:require('../../assets/organisms/mother-growing.png'),
  mother5:require('../../assets/organisms/mother.png'),
  mother6:require('../../assets/organisms/mother-six.png'),
  mother7:require('../../assets/organisms/mother-seven.png'),
  motherFission3:require('../../assets/organisms/mother-fission-young.png'),
  motherFission4:require('../../assets/organisms/mother-fission-growing.png'),
  motherFission5:require('../../assets/organisms/mother-fission.png'),
  motherFission6:require('../../assets/organisms/mother-fission-six.png'),
  motherFission7:require('../../assets/organisms/mother-fission-seven.png'),
  motherElastic3:require('../../assets/organisms/mother-elastic-young.png'),
  motherElastic4:require('../../assets/organisms/mother-elastic-growing.png'),
  motherElastic5:require('../../assets/organisms/mother-elastic.png'),
  motherElastic6:require('../../assets/organisms/mother-elastic-six.png'),
  motherElastic7:require('../../assets/organisms/mother-elastic-seven.png'),
  motherSymbiosis3:require('../../assets/organisms/mother-symbiosis-young.png'),
  motherSymbiosis4:require('../../assets/organisms/mother-symbiosis-growing.png'),
  motherSymbiosis5:require('../../assets/organisms/mother-symbiosis.png'),
  motherSymbiosis6:require('../../assets/organisms/mother-symbiosis-six.png'),
  motherSymbiosis7:require('../../assets/organisms/mother-symbiosis-seven.png'),
  plate0:require('../../assets/biomes/stillwater-v2.png'),
  plate1:require('../../assets/biomes/glassgarden-v2.png'),
  plate2:require('../../assets/biomes/blue-deep-v2.png'),
  pondLife:require('../../assets/organisms/pond-brightfield-life.png'),
  food:require('../../assets/organisms/desmid.png'),
  cyst:require('../../assets/organisms/toxic-cyst.png'),
  spore:require('../../assets/organisms/pearl-spore.png'),
  drifter:require('../../assets/organisms/drifter.png'),
  shellback:require('../../assets/organisms/shellback-v2.png'),
  twinspore:require('../../assets/organisms/twinspore-lobe-v2.png'),
  grazer:require('../../assets/organisms/grazer.png'),
  parasite:require('../../assets/organisms/parasite.png'),
  divider:require('../../assets/organisms/divider.png'),
  amoeba:require('../../assets/organisms/amoeba-v2.png'),
  bacterium:require('../../assets/organisms/copper-bacterium.png'),
  phage:require('../../assets/organisms/silver-phage.png'),
  bellwether:require('../../assets/organisms/bellwether.png'),
  regent:require('../../assets/organisms/glass-regent.png'),
  conjoined:require('../../assets/organisms/conjoined-lobe-v2.png'),
  glowdrift:require('../../assets/organisms/glowdrift.png'),
  glass_harp:require('../../assets/organisms/glass_harp.png'),
  moonlace:require('../../assets/organisms/moonlace.png'),
  lantern_grazer:require('../../assets/organisms/lantern_grazer.png'),
  fern_desmid:require('../../assets/organisms/fern_desmid.png'),
  spiral_alga:require('../../assets/organisms/spiral_alga.png'),
  crown_cyst:require('../../assets/organisms/crown_cyst.png'),
  bramble_cyst:require('../../assets/organisms/bramble_cyst.png'),
  snow_spore:require('../../assets/organisms/snow_spore.png'),
  sail_spore:require('../../assets/organisms/sail_spore.png'),
  needle_hunter:require('../../assets/organisms/needle_hunter.png'),
  ribbon_hunter:require('../../assets/organisms/ribbon_hunter.png'),
  comb_grazer:require('../../assets/organisms/comb_grazer.png'),
  lace_parasite:require('../../assets/organisms/lace_parasite.png'),
  hourglass_divider:require('../../assets/organisms/hourglass_divider.png'),
  chalice_grazer:require('../../assets/organisms/chalice_grazer.png'),
  sundial_alga:require('../../assets/organisms/sundial_alga.png'),
  glasswing_spore:require('../../assets/organisms/glasswing_spore.png'),
  trident_hunter:require('../../assets/organisms/trident_hunter.png'),
  crown_rotifer:require('../../assets/organisms/crown_rotifer.png'),
  amber_nautilus:require('../../assets/organisms/amber_nautilus.png'),
  veil_parasite:require('../../assets/organisms/veil_parasite.png'),
  thistle_capsule:require('../../assets/organisms/thistle_capsule.png'),
  ribbon_divider:require('../../assets/organisms/ribbon_divider.png'),
  comet_spore:require('../../assets/organisms/comet_spore.png'),
  prism_hunter:require('../../assets/organisms/prism_hunter.png'),
  sieve_alga:require('../../assets/organisms/sieve_alga.png'),
} as const;
export type TextureKey=keyof typeof organismTextures;
export function textureKey(kind:string,form=''):TextureKey{
  const definition=formDefinition(form);
  if(definition?.kind===kind&&Object.hasOwn(organismTextures,form))return form as TextureKey;
  if(kind==='bell_bud')return 'bellwether';if(kind==='warden')return 'regent';
  return Object.hasOwn(organismTextures,kind)?kind as TextureKey:'drifter';
}
// Sprite width and nucleus registration from microscope.gd, not hit geometry.
// Rare-form absorption ghosts use the original 90-pixel extent. Live bodies
// explicitly use their family extent, or 90 pixels when marked as a visitor.
export function spriteMetrics(kind:string,form=''):{width:number;uv:{x:number;y:number}}{
  const widths:Record<string,number>={cell:63,bacterium:112,amoeba:142,bell_bud:74,grazer:84,parasite:88,divider:95,warden:52,bellwether:130,regent:145,spore:43,food:47,cyst:43,conjoined:112,twinspore:70,shellback:84,phage:26};
  const uvs:Record<string,[number,number]>={bacterium:[0.636,0.5],amoeba:[0.534,0.463],grazer:[0.5,0.485],parasite:[0.425,0.405],divider:[0.492,0.516],warden:[0.501,0.505],bell_bud:[0.502,0.485],bellwether:[0.502,0.485],regent:[0.501,0.505],spore:[0.514,0.526],food:[0.499,0.547],cyst:[0.5,0.51],twinspore:[0.498,0.5873],shellback:[0.4996,0.5119],conjoined:[0.5005,0.506]};
  const definition=formDefinition(form),valid=definition?.kind===kind?definition:undefined;
  const uv=uvs[kind]??[0.5,0.5];return {width:valid?.rare?90:kind.startsWith('mother')?120:widths[kind]??78,
    uv:valid?{...valid.uv}:{x:uv[0],y:uv[1]}};
}

// mother_appearance.gd: the first specialization fixes the anatomical branch.
export function motherTextureKey(capacity:number,mutations:readonly string[]):TextureKey{
  const branch=mutations.find(id=>['fission','elastic','symbiosis'].includes(id))??'';
  const suffix=branch?branch[0].toUpperCase()+branch.slice(1):'';
  return `mother${suffix}${Math.max(3,Math.min(7,Math.trunc(capacity)))}` as TextureKey;
}
