// Presentation ports of journey_guidance.gd, capture_feedback.gd and mother_alert.gd.
// Touch wording replaces desktop keys. These selectors never change simulation.
import type {EncounterSimulation} from '../engine/encounterSimulation';
import type {HarvestOutcome,HarvestResult} from '../campaign/journeyHarvest';
import type {Point} from '../geometry/loopGeometry';
import {contains,polygonFor} from '../geometry/loopGeometry';
import {penalty} from '../geometry/loopStrain';
import {recovery} from '../evolution/captureRules';
import {mutationDefinition} from '../evolution/mutations';
import {Drifter,smooth,sub,unit} from '../ecology/drifter';
import {Amoeba} from '../ecology/amoeba';
import {Bacterium} from '../ecology/bacterium';
import {EcologyEnemy} from '../ecology/ecologyEnemy';
import {HarvestOrganism} from '../ecology/harvestOrganism';
import {MIN_DRAG} from '../ecology/cystNudge';
import {JourneyBoss} from '../campaign/journeyBoss';

export interface GuidanceMessage {title:string;detail:string;target:number;urgent:boolean}
const message=(title:string,detail:string,target=-1,urgent=false):GuidanceMessage=>({title,detail,target,urgent});
const hunters=['drifter','shellback','twinspore','divider'];
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
const length=(p:Point)=>Math.hypot(p.x,p.y);
export function targetOfKind(run:EncounterSimulation,kind:string):number{
  for(const body of run.enemies){
    if(body.kind!==kind)continue;
    if(kind==='food'&&run.harvest.spec.mode==='sectors'&&run.harvest.visited.length<run.harvest.spec.target){
      const angle=Math.atan2(body.nucleus.y-run.board.center.y,body.nucleus.x-run.board.center.x)/(Math.PI/4);
      const sector=((Math.sign(angle)*Math.floor(Math.abs(angle)+0.5))%8+8)%8;
      if(run.harvest.visited.includes(sector))continue;
    }
    return body.id;
  }
  return -1;
}
export function contactSeconds(run:EncounterSimulation,body:Drifter):number{
  if(body.isBoss()||!hunters.includes(body.kind)||body.speed<=0||body.huntTarget>=0)return Infinity;
  const gap=Math.min(...body.nuclei().map(p=>distance(p,run.board.center)-run.board.motherRadius-10));
  const grace=body instanceof EcologyEnemy&&body.kind==='divider'?body.spawning:0;
  return Math.max(0,gap)/body.speed+body.stunned+body.slowed*0.4+grace+body.fedRemaining*0.65;
}
export function motherAlert(run:EncounterSimulation):{strength:number;direction:Point;position:Point;seconds:number;id:number}{
  const result={strength:0,direction:{x:0,y:0},position:{...run.board.center},seconds:Infinity,id:-1};
  if(run.integrity<=0||['brief','complete','loss'].includes(run.state))return result;
  for(const body of run.enemies){
    const seconds=contactSeconds(run,body);
    if(seconds>=22||seconds>=result.seconds)continue;
    result.strength=1-smooth(1,22,seconds);result.direction=unit(sub(body.nucleus,run.board.center));
    result.position={...body.nucleus};result.seconds=seconds;result.id=body.id;
  }
  return result;
}
export function previewWarning(run:EncounterSimulation):string{
  if(!run.selection.canClose())return '';
  const polygon=polygonFor(run.selection.path,run.board.anchors);
  for(const body of run.enemies){
    const nuclei=body.nuclei();if(nuclei.length!==2)continue;
    const inside=nuclei.filter(p=>contains(p,polygon)).length;
    if(inside>0&&!body.canTakePulse())return 'The body is reforming';
    if(inside===1)return 'Fit both glowing nuclei';
  }
  return '';
}
function protectionInstruction(boss:JourneyBoss):string{
  if(boss.resetRemaining>0)return `It is reforming for ${Math.ceil(boss.resetRemaining)}s. Recharge and prepare the next loop.`;
  if(boss.variant===0)return `It is inhaling. Wait ${Math.ceil(boss.secondsUntilOpen())}s for its gold center to open, then release a clean loop.`;
  return 'Capture both linked shields together, or the second within 18 seconds. Removing the last shield creates the opening.';
}
export function nextAction(run:EncounterSimulation,clickMode=false):GuidanceMessage{
  const finish=clickMode?'Tap Capture':'Release',finishLower=clickMode?'tap Capture':'release';
  if(run.selection.motherBlocked())return message('Keep the mother outside the loop','Loops cannot surround her or cross her body. Backtrack to reshape it, or cancel for free.');
  if(run.nudge.targetId>=0){
    if(length(run.nudge.aim)>=MIN_DRAG&&length(run.nudge.displacement(run))<MIN_DRAG)return message('Keep it inside the dish','The rim blocks this push. Aim toward clear water inside the lens, or tap Cancel.');
    if(run.nudge.target(run)?.kind==='phage')return message('Guide phages to a bacterium',clickMode?'Tap toward a copper rod. Phages attach when close enough.':'Drag toward a copper rod and release. Phages attach when close enough; Nudge recharges in 6s.');
    return message('Make room for food',clickMode?'Tap clear water to nudge. Tap Cancel to stop.':'Drag away from the food, then release. The arrow shows the push. Tap Cancel to stop.');
  }
  if(run.selection.rejectionReason){
    const id=run.selection.rejectedId,cell=run.cells[id];
    if(cell?.lost)return message('Cell was digested','It regrows in the next encounter. Use the remaining blue cells.');
    if(cell&&cell.captor>=0)return message('An amoeba swallowed this cell','Loop around its gold nucleus using other blue cells before the 15s timer runs out.',cell.captor,true);
    if(cell&&!cell.isReady())return message('Cell is digesting',`Ready in ${cell.remaining.toFixed(1)}s. Use a different blue cell while it returns.`);
    if(cell&&run.harvest.ecology.blocked(run,id))return message('A parasite blocks this cell','Capture the attached parasite using other blue cells to free it.');
    if(!run.selection.rejectionReason.startsWith('This cell is busy'))return message('Connection blocked',run.selection.rejectionReason);
  }
  if(run.lessonActive()&&!run.selection.closed){
    const lesson=run.lesson.instruction(run);
    return message(lesson.title,clickMode?lesson.detail.replace('Drag through','Tap through').replace('Drag 1','Tap 1').replace('then release.','then tap Capture.'):lesson.detail);
  }
  const harvest=run.harvest,spec=harvest.spec,bossBody=run.boss(),boss=bossBody instanceof JourneyBoss?bossBody:undefined;
  if(run.selection.active){
    if(!run.selection.canClose())return message('Connect the blue cells','Choose any ready blue cells. Use at least 3, then return to START. Avoid crossing your loop.');
    const outcome=run.harvestPreview(),polygon=polygonFor(run.selection.path,run.board.anchors);
    if(outcome.poison>=run.integrity)return message('This loop will kill you','Too many purple cysts. Tap Cancel. Nudge a cyst away, then draw a clean loop.',-1,true);
    if(!run.selection.closed)return message('Return to START',`Move back to the first blue cell to close your loop. Then ${finishLower}.`);
    if(outcome.bossLayers>0)return message(`${finish} to attack`,'The boss is inside. This uses 3 charge and removes one of its remaining layers.',boss?.id);
    if(outcome.wardens>0)return message(`${finish} to break shields`,'Break both together, or the second within 18 seconds. '+(boss?'Then attack the Regent while OPEN.':'Then rescue the exposed pearl.'));
    if(outcome.purified>0)return message(`${finish} to clear poison`,`${outcome.purified} purple cysts will be safely removed. No health will be lost.`);
    if(outcome.rescued>0)return message(`${finish} to rescue`,`${outcome.rescued} pearl spores are inside your loop.`);
    if(outcome.cellsRescued>0)return message(`${finish} to save your cell`,'This captures the amoeba and releases the blue cell back to your colony.');
    if(outcome.threats>0)return message(`${finish} to defend`,`This loop removes ${outcome.threats} threats to your colony.`);
    const ids=run.preview(),shell=run.enemies.find(b=>b.kind==='shellback'&&ids.includes(b.id));
    if(shell)return message(`${finish} to crack its shell`,'Capture this armored hunter once more after your blue cells return.',shell.id);
    if(boss){
      const inside=boss.nuclei().filter(p=>contains(p,polygon)).length;
      if(inside>0&&harvest.nourishment<3&&outcome.food===0)return message(`Need ${3-harvest.nourishment} more food charge`,'The boss is inside, but this loop cannot hurt it yet. Cancel and collect green food first.',boss.id);
      if(inside>0&&harvest.nourishment>=3&&!boss.canTakePulse())return message('The boss is protected',protectionInstruction(boss),boss.id);
      if(inside===1&&boss.nuclei().length===2)return message('Include BOTH gold centers','The Conjoined has two hearts. Both must be inside the same closed loop.',boss.id);
      if(outcome.food===0&&harvest.nourishment>=3)return message('The boss is outside',"Move your loop around the boss's gold center. Tap Cancel to stop this loop.",boss.id);
    }
    for(const body of run.enemies){
      if(body.kind==='bell_bud'&&!body.canTakePulse()&&contains(body.nucleus,polygon)&&outcome.food===0)return message('The bell bud is inhaling','Wait until it is OPEN, then enclose its gold center. Tap Cancel for free.',body.id);
      if(body.cradle&&body.gateIds.length&&contains(body.nucleus,polygon))return message('The pearl is shielded','Capture its two small shield organisms first. The last shield exposes the pearl.',body.id);
    }
    if(outcome.food>0)return message(`${finish} to collect food`,`${outcome.food} food will be collected.`+(outcome.poison>0?` You will also lose ${outcome.poison} health.`:' No health will be lost.'),-1,outcome.poison>0);
    if(previewWarning(run)==='Fit both glowing nuclei')return message('Include BOTH gold centers','This linked hunter has two hearts. Both must fit inside the same closed loop.');
    return message('Nothing useful inside',"Tap Cancel for free. Enclose an organism's center, then close your loop.");
  }
  let danger:Drifter|undefined,soonest=20;
  for(const body of run.enemies){const seconds=contactSeconds(run,body);if(seconds<soonest){soonest=seconds;danger=body;}}
  const captive=run.enemies.filter((b):b is Amoeba=>b instanceof Amoeba&&b.captiveNode>=0).sort((a,b)=>a.rescueRemaining()-b.rescueRemaining())[0];
  if(captive&&(!danger||captive.rescueRemaining()<soonest))return message(`Save your blue cell · ${Math.ceil(captive.rescueRemaining())}s`,"Loop around the amoeba's gold nucleus using other cells. If time runs out, the cell is lost until next encounter.",captive.id,true);
  if(danger)return message('Protect the mother first',`About ${Math.ceil(soonest)}s until it eats a health core. Enclose ${danger.kind==='twinspore'?'BOTH gold centers':'its gold center'}, then close and ${finishLower}.`,danger.id,true);
  for(const hunter of run.enemies){
    const prey=hunter.huntTarget>=0?harvest.ecology.foodWeb.preyFor(run,hunter):undefined;
    if(prey?.kind==='spore')return message('A hunter wants the spore','Rescue the pearl-white spore. Catch both together for an optional reward.',prey.id,true);
    if(hunter.carriedFood>0)return message("Recover the hunter's meal",`It swallowed ${hunter.carriedFood} food and is moving slowly while digesting. Capture it to recover the food.`,hunter.id);
  }
  if(boss){
    if(harvest.nourishment<3)return message(`Collect ${3-harvest.nourishment} more food`,'Loop around green organisms. Each boss attack uses 3 food charge.',targetOfKind(run,'food'));
    if(!boss.canTakePulse()){
      if(boss.resetRemaining>0)return message('Boss is reforming',`Recover and recharge. Its next pattern begins in ${Math.ceil(boss.resetRemaining)}s.`,boss.id);
      if(boss.variant===0)return message('Wait for the exhale',`It draws food and poison inward. In ${Math.ceil(boss.secondsUntilOpen())}s its gold center opens for 16 seconds. Prepare a clean loop.`,boss.id);
      if(boss.shieldRemaining>0)return message('Break the last shield',`Capture it within ${Math.ceil(boss.shieldRemaining)}s or both shields regrow. Then the boss opens for 14 seconds.`,boss.gateIds[0],true);
      return message('Break 2 shields','Capture both together, or the second within 18 seconds of the first. The boss opens for 14 seconds.',targetOfKind(run,'warden'));
    }
    if(boss.variant===2)return message('Enclose BOTH hearts','Capture both together. They spread farther after each hit. Wait for them to meet, or draw wider. Young pairs hatch nearby.',boss.id);
    return message('Attack the boss now',`${Math.ceil(boss.openRemaining)}s before it closes. Enclose ${boss.nuclei().length===2?'BOTH gold centers':'its gold center'}, close at START, then ${finishLower}.`,boss.id,true);
  }
  for(const body of run.enemies){
    if(body.cradle&&body.gateIds.length)return message('Open the glass cradle','Capture its two linked shields together, or finish the second within 18 seconds. Then rescue the pearl.',body.gateIds[0]);
    if(body instanceof HarvestOrganism&&body.cradle&&body.hatchRemaining()>=0)return message('Rescue now, or let it hatch',`Loop around its pearl now for one rescue. Protect it for ${Math.ceil(body.hatchRemaining())}s to hatch two young. Hunters can eat it.`,body.id);
  }
  const parasite=run.enemies.find(b=>b instanceof EcologyEnemy&&b.kind==='parasite'&&b.latched);
  if(parasite)return message('Free the blocked cell','Capture the coral parasite at the other end of its pink tether. Use the cells around its body.',parasite.id);
  if(spec.mode==='rescue'&&harvest.rescued<spec.target){
    const spore=run.enemies.find((b):b is HarvestOrganism=>b instanceof HarvestOrganism&&b.kind==='spore'&&!b.visitor&&b.lifetime()-b.age<18);
    if(spore)return message('Rescue the fading spore',`It escapes in ${Math.ceil(spore.lifetime()-spore.age)}s. Enclose the pearl-white center before collecting more food.`,spore.id,true);
  }
  const divider=run.enemies.find((b):b is EcologyEnemy=>b instanceof EcologyEnemy&&b.kind==='divider'&&!b.daughter&&b.splitRemaining()<7);
  if(divider)return message('Divider is about to split',`Two hunters in ${Math.ceil(divider.splitRemaining())}s. Capture the ribbed blue body now, or catch both young hunters together.`,divider.id,true);
  const helpers=run.phages.freeCluster(),host=helpers&&!run.phages.learned?run.phages.nearestHost(run,helpers.nucleus,180):undefined;
  if(host)return message('Put the tiny phages to work','Drag the silver cluster toward the copper rod. It ruptures after 9s. You can also loop around the bacterium yourself.',host.id);
  const infected=run.enemies.find((b):b is Bacterium=>b instanceof Bacterium&&b.infectionAge>=0);
  if(infected)return message(`Phages are treating the thief · ${Math.ceil(infected.infectionRemaining())}s`,'Keep collecting food. When the bacterium ruptures, loop around the food it releases.',infected.id);
  const thief=run.enemies.find((b):b is EcologyEnemy=>b instanceof EcologyEnemy&&['grazer','bacterium'].includes(b.kind)&&b.storedFood>0&&harvest.nourishment<spec.food);
  if(thief)return message('Recover the stolen food',`This grazer carries ${thief.storedFood} food. Enclose its gold center to get that food back before it swims away.`,thief.id);
  const foodLeft=Math.max(0,spec.food-harvest.nourishment);
  if(foodLeft>0){
    const event=harvest.events.sample(run),food=run.enemies.find(b=>harvest.events.food.includes(b.id));
    if(event&&event.age>=0&&event.age<22&&food)return event.kind==='hatching'?
      message('Harvest before the garden wakes',`Cysts hatch in ${Math.ceil(22-event.age)}s. Loop around green food now; leave the purple cysts outside.`,food.id):
      message('Catch the drifting bloom','Loop around this passing green bloom. A food thief follows it.',food.id);
    return message(`Collect ${foodLeft} more food`,'Loop around green organisms. Leave purple spikes outside to avoid losing health.',targetOfKind(run,'food'));
  }
  if(harvest.hunterQuota()>harvest.huntersCaptured){
    const target=run.enemies.find(b=>hunters.includes(b.kind))?.id??-1;
    return message(`Capture ${harvest.hunterQuota()-harvest.huntersCaptured} more hunters`,target>=0?'Catch the approaching hunters before this feeding visit can end.':'Watch the arrival marks. The next hunter is coming with the bloom.',target);
  }
  switch(spec.mode){
    case 'rescue':return message(`Rescue ${Math.max(0,spec.target-harvest.rescued)} more spores`,'Enclose the pearl-white organisms. Their bright centers mark what to rescue.',targetOfKind(run,'spore'));
    case 'purify':return message(`Clear ${Math.max(0,spec.target-harvest.purified)} more cysts`,'Enclose purple spikes ALONE. Leave every green organism outside. This costs no health.',targetOfKind(run,'cyst'));
    case 'sectors':return message(`Feed in ${Math.max(0,spec.target-harvest.visited.length)} new areas`,'Collect green food in a dim sector. Each newly lit arc marks another area completed.',targetOfKind(run,'food'));
    case 'defend':{
      const target=run.enemies.find(b=>[...hunters,'grazer','bacterium','parasite','bell_bud'].includes(b.kind))?.id??-1;
      return message(`Capture ${Math.max(0,spec.target-harvest.defended)} more threats`,target>=0?'Capture hunters, food thieves, or parasites. Each protects the colony.':'The next threat arrives with the bloom. Prepare a clear route.',target);
    }
    default:return message('Meal complete','Your cells are returning. Evolution comes next.');
  }
}
type Meal=Partial<HarvestResult>;
export function captureSummary(meal:Meal):string{
  const parts:string[]=[];
  if(meal.food)parts.push(`+${meal.food} food`);
  if(meal.bossLayers)parts.push('Boss hit · −3 charge');
  if(meal.wardens)parts.push(`${meal.wardens} shields broken`);
  if(meal.rescued)parts.push(`${meal.rescued} rescued`);
  if(meal.cellsRescued)parts.push('Blue cell freed');
  if(meal.purified)parts.push(`${meal.purified} cysts neutralized`);
  if(meal.threats)parts.push(`${meal.threats} threats removed`);
  if(meal.armorHits)parts.push('Armor cracked');
  return parts.length?parts.join(' · '):'Nothing captured';
}
export function captureHealthText(meal:Meal,health:number):string{
  return meal.poison?`−${meal.poison} health · ${Math.max(0,health-meal.poison)} remaining`:'No health lost';
}
export function foodBonusText(meal:Meal):string{
  const entries=Object.entries(meal.foodBonuses??{}).sort(([a,av],[b,bv])=>bv-av||(a<b?-1:a>b?1:0));
  if(!entries.length)return '';
  const [id,value]=entries[0],name=id==='feeder'?'Feeder organelle':mutationDefinition(id)?.name??id;
  const other=entries.slice(1).reduce((sum,[,value])=>sum+value,0);
  return `${name} +${value}`+(other>0?` · other bonuses +${other}`:'');
}
export class CaptureFeedback {
  previousPoison=-1;warningRemaining=0;warningSerial=0;outcome:HarvestOutcome|undefined;
  clear():void{this.previousPoison=-1;this.warningRemaining=0;this.outcome=undefined;}
  observe(run:EncounterSimulation,delta:number):void{
    if(run.state==='paused')return;
    this.warningRemaining=Math.max(0,this.warningRemaining-delta);
    if(run.state!=='active'||!run.selection.canClose()){this.previousPoison=-1;this.outcome=undefined;return;}
    this.outcome=run.harvestPreview();
    if(this.previousPoison>=0&&this.outcome.poison>this.previousPoison){this.warningRemaining=1.8;this.warningSerial++;}
    this.previousPoison=this.outcome.poison;
  }
}
export function selectedLoopConfidence(run:EncounterSimulation,feedback?:CaptureFeedback){
  if(run.state!=='active'||!run.selection.canClose())return;
  const outcome=run.harvestPreview(),strain=penalty(run.selection.path,run.board.anchors);
  const returnTime=recovery(run.mutations,run.selection.path.length,run.board.tuning.recovery_seconds)+strain;
  const bonus=foodBonusText(outcome),timing=`Cells return in ${returnTime.toFixed(1)}s`+(strain>=0.1?` · long links +${strain.toFixed(1)}s`:'');
  const poisonEntered=(feedback?.warningRemaining??0)>0&&outcome.poison>0;
  return {outcome,poisonEntered,returnTime,strain,warning:previewWarning(run),
    summary:(poisonEntered?'POISON ENTERED · ':'')+captureSummary(outcome)+' · '+captureHealthText(outcome,run.integrity),
    detail:(bonus?'Includes '+bonus+' · ':'')+timing};
}
export function guidanceGoals(run:EncounterSimulation):string[]{
  const h=run.harvest,s=h.spec;
  if(s.mode==='boss')return ['Collect 3 food to charge each attack.',
    ['Wait through its inhale; attack during the 16-second exhale.','Break both shields together, or the second within 18 seconds.','Enclose BOTH hearts. They spread farther after each hit.'][Math.floor(run.stageIndex/4)],
    'Hit 3 times. '+(run.stageIndex===11?'Young pairs hatch nearby. Catch them before they reach Mother.':'Recharge with green food between attacks.')];
  const result=[`Collect ${s.food} green food.`];
  switch(s.mode){
    case 'feed':if(h.hunterQuota()>0)result.push(`Capture ${h.hunterQuota()} approaching hunters before leaving.`);break;
    case 'rescue':result.push(`Rescue ${s.target} pearl-white spores.`);break;
    case 'purify':result.push(`Clear ${s.target} purple cysts in cyst-only loops.`);break;
    case 'defend':result.push(`Capture ${s.target} threats: hunters, grazers, or parasites.`);break;
    case 'sectors':result.push(`Collect food in ${s.target} different marked areas.`);break;
  }
  return [...result,'Keep the mother alive. Purple cysts in a meal cost health.'];
}
