// Unmodified artwork from the pinned original. See CREDITS.md and ASSET_MANIFEST.json.
export const organismTextures={
  cell:require('../../assets/organisms/cell.png'),
  mother3:require('../../assets/organisms/mother-young.png'),
  mother4:require('../../assets/organisms/mother-growing.png'),
  mother5:require('../../assets/organisms/mother.png'),
  mother6:require('../../assets/organisms/mother-six.png'),
  mother7:require('../../assets/organisms/mother-seven.png'),
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
} as const;
export type TextureKey=keyof typeof organismTextures;
export function textureKey(kind:string):TextureKey{
  if(kind==='bell_bud')return 'bellwether';if(kind==='warden')return 'regent';
  return kind in organismTextures?kind as TextureKey:'drifter';
}
// Sprite width and nucleus registration from microscope.gd, not hit geometry.
export function spriteMetrics(kind:string):{width:number;uv:{x:number;y:number}}{
  const widths:Record<string,number>={cell:63,bacterium:112,amoeba:142,bell_bud:74,grazer:84,parasite:88,divider:95,warden:52,bellwether:130,regent:145,spore:43,food:47,cyst:43,conjoined:112,twinspore:70,shellback:84,phage:26};
  const uvs:Record<string,[number,number]>={bacterium:[0.636,0.5],amoeba:[0.534,0.463],grazer:[0.5,0.485],parasite:[0.425,0.405],divider:[0.492,0.516],warden:[0.501,0.505],bell_bud:[0.502,0.485],bellwether:[0.502,0.485],regent:[0.501,0.505],spore:[0.514,0.526],food:[0.499,0.547],cyst:[0.5,0.51],twinspore:[0.498,0.5873],shellback:[0.4996,0.5119],conjoined:[0.5005,0.506]};
  const uv=uvs[kind]??[0.5,0.5];return {width:kind.startsWith('mother')?120:widths[kind]??78,uv:{x:uv[0],y:uv[1]}};
}
