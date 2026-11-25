// Original catalogue and cosmetic form selection from prototype/scripts/journey_plan.gd,
// creature_forms.gd and expedition_creatures.gd, pinned at be96d3e.
// Names, descriptions, unlock stages and nucleus registration retain the source data.
// See CREDITS.md and LICENSE.
import {SeededRandom} from '../engine/seededRandom';
import type {Point} from '../geometry/loopGeometry';

export interface CreatureDefinition {
  readonly id:string;readonly kind:string;readonly name:string;readonly detail:string;
  readonly firstStage:number;readonly rare:boolean;readonly expedition:boolean;
}
export interface CreatureForm extends CreatureDefinition {readonly uv:Readonly<Point>}
export interface CreatureIdentity {kind:string;form:string}
export interface FormBody extends CreatureIdentity {id:number}

export const BASE_CREATURES:readonly CreatureDefinition[]=Object.freeze([
  Object.freeze({"id":"bacterium","name":"Copper bacterium","detail":"A rod-shaped bacterial food thief. Loop around its center to recover stolen food immediately, or nudge silver phages close. Infection ruptures it after 9s, releasing food to collect. Harmless to Mother.","kind":"bacterium","firstStage":2,"rare":false,"expedition":false}),
  Object.freeze({"id":"phage","name":"Silver bacteriophages","detail":"Tiny helpers with faceted heads, tails and delicate legs. Drag a cluster toward a copper bacterium; they attach and rupture it after 9s. Each cluster treats one host. Never infect Mother, blue cells or amoebas.","kind":"phage","firstStage":2,"rare":false,"expedition":false}),
  Object.freeze({"id":"amoeba","name":"Amber amoeba","detail":"Swallows one blue cell into a clear vacuole. Enclose its gold nucleus with other cells within 15 seconds to rescue it. If digested, the cell is lost until the next encounter. Never harms Mother.","kind":"amoeba","firstStage":5,"rare":false,"expedition":false}),
  Object.freeze({"id":"bell_bud","name":"Bell bud","detail":"A young Bellwether. Draws food inward while inhaling, then opens its gold center for sixteen seconds. Capture while OPEN. Counts as one removed threat.","kind":"bell_bud","firstStage":2,"rare":false,"expedition":false}),
  Object.freeze({"id":"food","name":"Desmid","detail":"Lobed green algae. Every captured desmid gives one food.","kind":"food","firstStage":0,"rare":false,"expedition":false}),
  Object.freeze({"id":"cyst","name":"Toxic cyst","detail":"Spiked violet husk. Drag it aside with Nudge, ready every 6s. Eating one costs a health core. Purification encounters allow cyst-only loops.","kind":"cyst","firstStage":0,"rare":false,"expedition":false}),
  Object.freeze({"id":"spore","name":"Pearl spore","detail":"A young colony. Enclose its bright center to rescue it. Every rescued spore lives on in your home pond; rescues also advance nursery goals.","kind":"spore","firstStage":1,"rare":false,"expedition":false}),
  Object.freeze({"id":"drifter","name":"Drifter","detail":"Amber hunter. Pursues nearby food or spores before Mother. Capture during its six-second meal to intervene; a fed hunter slows and gives stolen food back when captured.","kind":"drifter","firstStage":1,"rare":false,"expedition":false}),
  Object.freeze({"id":"shellback","name":"Shellback","detail":"A ridged glass shell protects its nucleus. Two pulses, or one wide Enzyme membrane.","kind":"shellback","firstStage":4,"rare":false,"expedition":false}),
  Object.freeze({"id":"twinspore","name":"Twinspore","detail":"Two linked violet bodies. Both nuclei must be inside the same membrane.","kind":"twinspore","firstStage":8,"rare":false,"expedition":false}),
  Object.freeze({"id":"bellwether","name":"Bellwether","detail":"Draws nearby food and poison inward while inhaling. Its gold center then opens for sixteen seconds. Each hit uses three food charge.","kind":"bellwether","firstStage":3,"rare":false,"expedition":false}),
  Object.freeze({"id":"regent","name":"Glass Regent","detail":"Break both linked shields together, or finish the second within eighteen seconds before they regrow. It then opens for fourteen seconds. Each hit uses three food charge.","kind":"regent","firstStage":7,"rare":false,"expedition":false}),
  Object.freeze({"id":"conjoined","name":"The Conjoined","detail":"Both hearts must fit in one loop. Each lost layer spreads them farther apart, then they meet again. Young pairs hatch nearby after each hit; catch them before they reach Mother.","kind":"conjoined","firstStage":11,"rare":false,"expedition":false}),
  Object.freeze({"id":"grazer","name":"Fan grazer","detail":"Steals nearby green food. Capture its fan-shaped body to recover everything still in its stomach.","kind":"grazer","firstStage":1,"rare":false,"expedition":false}),
  Object.freeze({"id":"parasite","name":"Coral parasite","detail":"A pink tether blocks one blue cell. Capture the curled parasite using the other cells around its body.","kind":"parasite","firstStage":4,"rare":false,"expedition":false}),
  Object.freeze({"id":"divider","name":"Divider","detail":"A ribbed rod that splits after twenty seconds. Stop it early, or catch both young hunters in one wider loop.","kind":"divider","firstStage":6,"rare":false,"expedition":false}),
  Object.freeze({"id":"warden","name":"Shield organism","detail":"Pale strands connect it to a protected organism. Break both together, or finish the second within eighteen seconds, to expose what lies inside.","kind":"warden","firstStage":6,"rare":false,"expedition":false}),
]);

export const LOCAL_FORMS:readonly CreatureForm[]=Object.freeze([
  Object.freeze({"id":"glowdrift","kind":"spore","name":"Glowdrift","detail":"Rare shelter organism. When its chambers shine, nearby ordinary hunters slow down. Leave it as shelter, or rescue its central pearl for your pond.","rare":true,"uv":{"x":0.574,"y":0.419},"firstStage":8,"expedition":false}),
  Object.freeze({"id":"glass_harp","kind":"spore","name":"Glass Harp","detail":"Rare filter feeder. Draws nearby green food inward and gently pushes purple cysts away. Leave it to separate a meal, or rescue its pearl for your pond.","rare":true,"uv":{"x":0.521,"y":0.497},"firstStage":4,"expedition":false}),
  Object.freeze({"id":"moonlace","kind":"spore","name":"Moonlace","detail":"Rare visitor. Releases green food as its petals open. Leave it to feed the water, or loop around its pearl to bring it home.","rare":true,"uv":{"x":0.485,"y":0.499},"firstStage":2,"expedition":false}),
  Object.freeze({"id":"lantern_grazer","kind":"grazer","name":"Lantern grazer","detail":"Pale-gold food thief. Capture its center to recover all food still in its stomach before it swims away.","uv":{"x":0.491,"y":0.487},"firstStage":1,"rare":false,"expedition":false}),
  Object.freeze({"id":"fern_desmid","kind":"food","name":"Fern desmid","detail":"Green food. Enclose its bright center for one nourishment. Its shape changes; the feeding rule stays the same.","uv":{"x":0.49,"y":0.485},"firstStage":1,"rare":false,"expedition":false}),
  Object.freeze({"id":"spiral_alga","kind":"food","name":"Spiral alga","detail":"Green food. Enclose its bright center for one nourishment. Its shape changes; the feeding rule stays the same.","uv":{"x":0.489,"y":0.484},"firstStage":4,"rare":false,"expedition":false}),
  Object.freeze({"id":"crown_cyst","kind":"cyst","name":"Crown cyst","detail":"Purple poison. A mixed meal costs one health. In purification missions, capture cysts alone to clear them safely.","uv":{"x":0.49,"y":0.49},"firstStage":2,"rare":false,"expedition":false}),
  Object.freeze({"id":"bramble_cyst","kind":"cyst","name":"Bramble cyst","detail":"Purple poison. A mixed meal costs one health. In purification missions, capture cysts alone to clear them safely.","uv":{"x":0.492,"y":0.481},"firstStage":5,"rare":false,"expedition":false}),
  Object.freeze({"id":"snow_spore","kind":"spore","name":"Snow spore","detail":"Pearl-white rescue spore. Enclose its center before it fades away. Counts toward your rescue goal.","uv":{"x":0.491,"y":0.486},"firstStage":1,"rare":false,"expedition":false}),
  Object.freeze({"id":"sail_spore","kind":"spore","name":"Sail spore","detail":"Pearl-white rescue spore. Enclose its center before it fades away. Counts toward your rescue goal.","uv":{"x":0.5,"y":0.629},"firstStage":6,"rare":false,"expedition":false}),
  Object.freeze({"id":"needle_hunter","kind":"drifter","name":"Needle hunter","detail":"Amber hunter. Enclose its gold center before it reaches the mother. One capture absorbs it.","uv":{"x":0.515,"y":0.483},"firstStage":2,"rare":false,"expedition":false}),
  Object.freeze({"id":"ribbon_hunter","kind":"drifter","name":"Ribbon hunter","detail":"Amber hunter. Enclose its gold center before it reaches the mother. One capture absorbs it.","uv":{"x":0.49,"y":0.489},"firstStage":6,"rare":false,"expedition":false}),
  Object.freeze({"id":"comb_grazer","kind":"grazer","name":"Comb grazer","detail":"Pale-gold food thief. Capture its center to recover all food still in its stomach before it swims away.","uv":{"x":0.49,"y":0.492},"firstStage":5,"rare":false,"expedition":false}),
  Object.freeze({"id":"lace_parasite","kind":"parasite","name":"Lace parasite","detail":"Pink cell parasite. Follow its tether and capture the body to free the blocked blue cell.","uv":{"x":0.49,"y":0.498},"firstStage":5,"rare":false,"expedition":false}),
  Object.freeze({"id":"hourglass_divider","kind":"divider","name":"Hourglass divider","detail":"Blue divider. Capture its central gold nucleus before it splits at twenty seconds, or catch its two young.","uv":{"x":0.49,"y":0.49},"firstStage":8,"rare":false,"expedition":false}),
]);

export const EXPEDITION_FORMS:readonly CreatureForm[]=Object.freeze([
  Object.freeze({"id":"chalice_grazer","kind":"grazer","name":"Chalice grazer","detail":"A rare trumpet-shaped food thief. Capture its golden center to recover stolen algae before it leaves.","rare":true,"expedition":true,"uv":{"x":0.49,"y":0.47},"firstStage":2}),
  Object.freeze({"id":"sundial_alga","kind":"food","name":"Sundial alga","detail":"Edible green algae with spiralling glass leaves. Enclose its golden center in a clean loop to feed Mother.","rare":true,"expedition":true,"uv":{"x":0.502,"y":0.51},"firstStage":2}),
  Object.freeze({"id":"glasswing_spore","kind":"spore","name":"Glasswing spore","detail":"A pearl spore with three glass wings. Rescue its golden center before it fades; it will live in your home pond.","rare":true,"expedition":true,"uv":{"x":0.503,"y":0.563},"firstStage":2}),
  Object.freeze({"id":"trident_hunter","kind":"drifter","name":"Trident hunter","detail":"A three-pronged amber hunter. One capture of its golden center stops it before it reaches Mother.","rare":true,"expedition":true,"uv":{"x":0.5,"y":0.464},"firstStage":2}),
  Object.freeze({"id":"crown_rotifer","kind":"grazer","name":"Crown rotifer","detail":"Twin filtering wheels steal nearby food. Capture its golden center to reclaim the algae in its stomach.","rare":true,"expedition":true,"uv":{"x":0.494,"y":0.5},"firstStage":4}),
  Object.freeze({"id":"amber_nautilus","kind":"shellback","name":"Amber nautilus","detail":"A hunter inside a spiral silica shell. Capture its golden center twice: first crack the shell, then finish it.","rare":true,"expedition":true,"uv":{"x":0.453,"y":0.487},"firstStage":4}),
  Object.freeze({"id":"veil_parasite","kind":"parasite","name":"Veil parasite","detail":"Pink lace clings to a blue cell and blocks it. Use other blue cells to enclose the parasite's golden center.","rare":true,"expedition":true,"uv":{"x":0.508,"y":0.51},"firstStage":4}),
  Object.freeze({"id":"thistle_capsule","kind":"cyst","name":"Thistle capsule","detail":"A violet poison pod. Nudge it out of a meal, or capture it alone when clearing poison. Mixing it with food hurts Mother.","rare":true,"expedition":true,"uv":{"x":0.5,"y":0.504},"firstStage":4}),
  Object.freeze({"id":"ribbon_divider","kind":"divider","name":"Ribbon divider","detail":"A ribbon-shaped hunter that divides if ignored. Capture its golden center early, or catch both daughters after the split.","rare":true,"expedition":true,"uv":{"x":0.503,"y":0.5},"firstStage":8}),
  Object.freeze({"id":"comet_spore","kind":"spore","name":"Comet spore","detail":"A pearl spore trailing silver filaments. Rescue its golden center before it fades to bring it into your home pond.","rare":true,"expedition":true,"uv":{"x":0.52,"y":0.335},"firstStage":8}),
  Object.freeze({"id":"prism_hunter","kind":"shellback","name":"Prism hunter","detail":"An amber hunter inside a pointed glass lattice. Enclose its golden center twice before it reaches Mother.","rare":true,"expedition":true,"uv":{"x":0.53,"y":0.493},"firstStage":8}),
  Object.freeze({"id":"sieve_alga","kind":"food","name":"Sieve alga","detail":"Edible green lace with a golden center suspended on a living bridge. Capture the center in a clean meal.","rare":true,"expedition":true,"uv":{"x":0.5,"y":0.493},"firstStage":8}),
]);

export const CREATURE_FORMS:readonly CreatureForm[]=Object.freeze([...LOCAL_FORMS,...EXPEDITION_FORMS]);
export const CREATURE_CATALOGUE:readonly CreatureDefinition[]=Object.freeze([...BASE_CREATURES,...CREATURE_FORMS]);
const formsById=new Map(CREATURE_FORMS.map(entry=>[entry.id,entry]));
const creaturesById=new Map(CREATURE_CATALOGUE.map(entry=>[entry.id,entry]));
const baseIds=new Set(BASE_CREATURES.map(entry=>entry.id));

export function creatureDefinition(id:string):CreatureDefinition|undefined{return creaturesById.get(id);}
export function formDefinition(id:string):CreatureForm|undefined{return formsById.get(id);}
/** An unassigned form is valid in existing journeys and for base artwork. */
export function validForm(form:string,kind:string):boolean{return form===''||formsById.get(form)?.kind===kind;}
/** Prefer an actual matching form; malformed forms never become discoveries. */
export function discoveryId(kind:string,form=''):string{
  if(form!==''&&formsById.get(form)?.kind===kind)return form;
  return baseIds.has(kind)?kind:'';
}
/** Cosmetic selection has its own PCG stream and never draws from encounter RNG. */
export function assignCreatureForm(body:FormBody,runSeed:number|bigint,stageIndex:number):string{
  if(!Number.isSafeInteger(body.id)||body.id<1||!Number.isSafeInteger(stageIndex)||stageIndex<0)
    throw new RangeError('Invalid creature form identity');
  if(typeof runSeed==='number'&&!Number.isSafeInteger(runSeed))throw new RangeError('Invalid creature form seed');
  const pool=['',...CREATURE_FORMS.filter(entry=>entry.kind===body.kind&&entry.firstStage<=stageIndex&&!entry.rare).map(entry=>entry.id)];
  // BigInt retains Godot's 64-bit seed mixing beyond JavaScript's 32-bit bitwise range.
  const seed=BigInt(runSeed)^(BigInt(body.id)*0x45d9f3bn)^(BigInt(stageIndex)*0x119de1f3n);
  body.form=new SeededRandom(seed).pick(pool);
  return body.form;
}
