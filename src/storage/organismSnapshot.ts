// Explicit simulation records adapted from the original journey_save.gd.
// Constructors and field lists are trusted code; saved data never selects a prototype.
import {Drifter} from '../ecology/drifter';
import {HarvestOrganism} from '../ecology/harvestOrganism';
import {EcologyEnemy} from '../ecology/ecologyEnemy';
import {Amoeba} from '../ecology/amoeba';
import {Bacterium} from '../ecology/bacterium';
import {PhageCluster} from '../ecology/phageCluster';
import {Conjoined} from '../ecology/conjoined';
import {JourneyBoss} from '../campaign/journeyBoss';
import type {Board} from '../geometry/board';
import type {Point} from '../geometry/loopGeometry';
import {validForm} from '../content/creatureCatalogue';

type FieldValue=number|string|boolean|number[]|Point;
type Fields=Record<string,FieldValue>;
type Validator=(value:unknown)=>FieldValue;
type Schema=Record<string,Validator>;
export type OrganismType='drifter'|'harvest'|'ecology'|'amoeba'|'bacterium'|'phage'|'conjoined'|'boss';
export interface OrganismSnapshot {type:OrganismType;common:Fields;specific:Fields}

function invalid():never{throw new Error('Invalid organism save data');}
function object(value:unknown):Record<string,unknown>{
  if(!value||typeof value!=='object'||Array.isArray(value))return invalid();
  const prototype=Object.getPrototypeOf(value);
  if(prototype!==Object.prototype&&prototype!==null)return invalid();
  return value as Record<string,unknown>;
}
const number=(min=0,max=1e9,integer=false):Validator=>(value)=>{
  if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max||(integer&&!Number.isInteger(value)))return invalid();
  return value;
};
const integer=(min=0,max=1e9)=>number(min,max,true);
const boolean:Validator=value=>typeof value==='boolean'?value:invalid();
const string:Validator=value=>typeof value==='string'&&value.length<=512?value:invalid();
const point:Validator=value=>{
  const data=object(value);if(Object.keys(data).length!==2||!Object.hasOwn(data,'x')||!Object.hasOwn(data,'y'))return invalid();
  return {x:number(-1e6,1e6)(data.x) as number,y:number(-1e6,1e6)(data.y) as number};
};
const ids=(max:number,length:number):Validator=>value=>{
  if(!Array.isArray(value)||value.length>length)return invalid();
  const result=value.map(v=>integer(0,max)(v) as number);
  if(new Set(result).size!==result.length)return invalid();return result;
};
function parse(value:unknown,schema:Schema):Fields{
  const data=object(value),keys=Object.keys(schema);
  if(Object.keys(data).length!==keys.length||keys.some(key=>!Object.hasOwn(data,key)))return invalid();
  const result:Fields={};for(const key of keys)result[key]=schema[key](data[key]);return result;
}
function capture(body:Drifter,schema:Schema):Fields{
  const record=body as unknown as Record<string,unknown>,data:Record<string,unknown>={};
  for(const key of Object.keys(schema))data[key]=record[key];
  return parse(data,schema);
}
const common:Schema={
  id:integer(1),nucleus:point,speed:number(0,10000),kind:string,heading:point,health:integer(0,100),age:number(),form:string,
  gateIds:ids(1e9,100),shieldRemaining:number(),cradle:boolean,cradleOpenAge:number(-1),story:string,visitor:boolean,
  // Moonlace releases deliberately use negative bloom IDs, distinct from ordinary blooms.
  bloomReleases:integer(),bloomId:integer(-1e10),huntTarget:integer(-1),huntTime:number(),forageRemaining:number(),foragingDone:boolean,
  fedRemaining:number(),carriedFood:integer(),stunned:number(),slowed:number(),hitFlash:number(),shieldFlash:number(),
  pairAngle:number(-1e12,1e12),pairSpan:number(0,10000),lureVector:point,lureElapsed:number(),
};
const harvest:Schema={origin:point,drift:point,phase:number(-1e12,1e12),nudgeVector:point,nudgeElapsed:number()};
const ecology:Schema={destination:point,targetId:integer(-1),targetNode:integer(-1,23),siteNodes:ids(23,24),latched:boolean,
  actionClock:number(),storedFood:integer(),daughter:boolean,sector:integer(0,100),spawning:number()};
const amoeba:Schema={phase:value=>typeof value==='string'&&['seeking','approaching','reaching','digesting','sated'].includes(value)?value:invalid(),
  targetNode:integer(-1,23),captiveNode:integer(-1,23),siteNodes:ids(23,24),destination:point,reachPoint:point,ingestAxis:point,
  reachAge:number(),digestionAge:number(),restAge:number(),armExtension:number(0,1),victimHome:point,searchAfter:number()};
const conjoined:Schema={hitCycle:integer(-1),attackCount:integer()};
const schemas:Record<OrganismType,Schema>={
  drifter:{},harvest,ecology,amoeba,
  bacterium:{...ecology,infectionAge:number(-1)},
  phage:{...harvest,hostId:integer(-1),attachedFrom:point},
  conjoined,
  boss:{...conjoined,variant:integer(0,2),openRemaining:number(),resetRemaining:number(),roundIndex:integer(),patternTime:number(),juvenile:boolean},
};
function typeOf(body:Drifter):OrganismType{
  // Exact classes prevent future subclasses silently losing their extra fields.
  if(body.constructor===JourneyBoss)return 'boss';
  if(body.constructor===Conjoined)return 'conjoined';
  if(body.constructor===PhageCluster)return 'phage';
  if(body.constructor===Bacterium)return 'bacterium';
  if(body.constructor===Amoeba)return 'amoeba';
  if(body.constructor===EcologyEnemy)return 'ecology';
  if(body.constructor===HarvestOrganism)return 'harvest';
  if(body.constructor===Drifter)return 'drifter';
  throw new Error('Unsupported organism class');
}
function checkKind(type:OrganismType,kind:string,specific:Fields):void{
  const allowed:Record<Exclude<OrganismType,'boss'>,readonly string[]>={
    drifter:['drifter','shellback','twinspore'],harvest:['food','cyst','spore'],ecology:['grazer','parasite','divider','warden'],
    amoeba:['amoeba'],bacterium:['bacterium'],phage:['phage'],conjoined:['conjoined'],
  };
  if(type==='boss'){
    const expected=['bellwether','regent','conjoined'][specific.variant as number];
    if(specific.juvenile){if(specific.variant!==0||kind!=='bell_bud')invalid();}
    else if(kind!==expected)invalid();
  }else if(!allowed[type].includes(kind))invalid();
}
function checkIdentity(type:OrganismType,fields:Fields):void{
  if(!validForm(fields.form as string,fields.kind as string))invalid();
  if(fields.visitor&&(type!=='harvest'||fields.kind!=='spore'||
    !['moonlace','glass_harp','glowdrift'].includes(fields.form as string)))invalid();
}
export function captureOrganism(body:Drifter):OrganismSnapshot{
  const type=typeOf(body),data={type,common:capture(body,common),specific:capture(body,schemas[type])};
  checkKind(type,data.common.kind as string,data.specific);checkIdentity(type,data.common);return data;
}
export function restoreOrganism(value:unknown,board:Board):Drifter{
  const data=object(value);
  if(Object.keys(data).length!==3||!Object.hasOwn(data,'type')||!Object.hasOwn(data,'common')||!Object.hasOwn(data,'specific')||
      typeof data.type!=='string'||!Object.hasOwn(schemas,data.type))return invalid();
  const type=data.type as OrganismType,fields=parse(data.common,common),specific=parse(data.specific,schemas[type]);
  const id=fields.id as number,position=fields.nucleus as Point,kind=fields.kind as string;
  checkKind(type,kind,specific);
  checkIdentity(type,fields);
  let body:Drifter;
  switch(type){
    case 'drifter':body=new Drifter(id,position,fields.speed as number,kind);break;
    case 'harvest':body=new HarvestOrganism(id,kind,position,specific.drift as Point,specific.phase as number);break;
    case 'ecology':body=new EcologyEnemy(id,kind,position,specific.sector as number);break;
    case 'amoeba':body=new Amoeba(id,position);break;
    case 'bacterium':body=new Bacterium(id,position,specific.sector as number);break;
    case 'phage':body=new PhageCluster(id,position);break;
    case 'conjoined':body=new Conjoined(id,board);break;
    case 'boss':body=new JourneyBoss(id,board,specific.variant as 0|1|2);break;
  }
  // Every assigned key was checked against an explicit schema above.
  Object.assign(body,fields,specific);return body;
}
