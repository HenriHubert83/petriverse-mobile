// Exact anatomy weights from prototype/scripts/evolution_anatomy.gd. See CREDITS.md.
export const ANATOMY_IDS=['fission','elastic','symbiosis','enzyme','lure','filter','feast','grazer','catalyst','nursery','frenzy','residual'] as const;
export type AnatomyId=typeof ANATOMY_IDS[number];
export type AnatomyVector=[number,number,number,number];
export interface AnatomyRecipe {
  organs:number[];form:AnatomyVector;traits:AnatomyVector;adaptations:AnatomyVector;
  layers:number;growthFront:number;growthPulse:number;
}
export const ANATOMY_CHANGES:Record<AnatomyId,string>={
  fission:'A division network spreads through the Mother as her cells begin to bud.',
  elastic:'Layered, flexible membranes grow around the colony.',
  symbiosis:"A luminous network grows through the Mother's cytoplasm.",
  enzyme:'Digestive sacs form inside the Mother and her cells.',
  lure:'Long sensory hairs and fluid channels grow.',
  filter:'A fine, porous veil forms over the living tissue.',
  feast:'Large, folded storage chambers swell into shape.',
  grazer:'Delicate feeding brushes and narrow channels develop.',
  catalyst:'Dense catalytic granules gather in new vesicles.',
  nursery:'Pale nursery chambers grow throughout the colony.',
  frenzy:'Folded fluid channels develop throughout the colony.',
  residual:'Soft trailing membrane folds grow along the cell edges.',
};
const clamp=(value:number,low=0,high=1)=>Math.max(low,Math.min(high,value));
export function anatomyRecipe(owned:readonly string[],growing='',progress=1):AnatomyRecipe{
  const p=clamp(progress),weight=p*p*(3-2*p);
  const organs=ANATOMY_IDS.map(id=>owned.includes(id)?id===growing?weight:1:0),layers=organs.reduce((sum,v)=>sum+v,0);
  const form:AnatomyVector=[0,0,0,Math.min(layers/6,1)];
  for(const id of owned){const index=(ANATOMY_IDS as readonly string[]).indexOf(id);if(index>=0&&index<3){form[index]=organs[index];break;}}
  const budding=(organs[7]+organs[4]+organs[9])/3,chambers=(organs[3]+organs[6]+organs[5])/3,ribs=(organs[3]+organs[10]+organs[11])/3;
  form[0]=form[0]*(1+budding*0.55)+(form[0]===0?0.23*organs[0]:0);
  form[1]=form[1]*(1+chambers*0.55)+(form[1]===0?0.25*organs[1]:0);
  form[2]=form[2]*(1+ribs*0.55)+(form[2]===0?0.23*organs[2]:0);
  return {organs,form,traits:[organs[0],organs[3],organs[1],organs[4]],adaptations:[organs[5],organs[8],organs[2],organs[9]],
    layers,growthFront:progress,growthPulse:owned.includes(growing)?Math.sin(p*Math.PI):0};
}
export function membraneScale(angle:number,form:readonly number[]):number{
  let amount=(0.08+Math.cos(angle*3+0.5)*0.15)*form[0];
  amount+=(0.135+Math.cos(angle*5-0.2)*0.045)*form[1];
  amount+=(0.03+Math.cos(angle*2)*0.16+Math.cos(angle*6)*0.045)*form[2];
  return 1/(1-clamp(amount+form[3]*0.02,-0.22,0.34));
}
export function motherBranch(owned:readonly string[]):''|'fission'|'elastic'|'symbiosis'{
  return owned.find((id):id is 'fission'|'elastic'|'symbiosis'=>id==='fission'||id==='elastic'||id==='symbiosis')??'';
}
export {capacityForStage} from '../campaign/journeyPlan';
