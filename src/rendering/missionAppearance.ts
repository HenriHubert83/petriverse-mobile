// Deterministic visual recipe from mission_appearance.gd. Separate RNG stream.
import {SeededRandom} from '../engine/seededRandom';
export const WATER_BASE=[[0.055,0.115,0.150],[0.070,0.120,0.140],[0.030,0.040,0.085]] as const;
const WATER=[[.76,1.10,1.02],[.93,1.02,1.18],[.72,1.13,.92],[.87,1.03,1.13],[.82,1.08,1.10],[1.02,1.01,1.02],[.88,.82,1.20],[.65,.98,1.07],[1,.87,1.17]];
const COLONY=[[.79,1.10,1.12],[.94,.97,1.17],[.85,1.06,1.02]];
export function missionAppearance(seed:number,stage:number,habitat='bloom'){
 const rng=new SeededRandom(BigInt(seed)^BigInt((stage+1)*0x45d9f3b)),biome=Math.max(0,Math.min(2,Math.floor(stage/4)));
 const grade=WATER[biome*3+rng.int(0,2)],intensity=rng.float(.96,1.04);
 const waterGrade=grade.map((v,i)=>v*intensity*(habitat==='refuge'?[.89,1.01,1.12][i]:1));
 const shape=rng.int(0,2),cells=Array.from({length:24},()=>{
  const stretch=shape===0?rng.float(.91,1.07):shape===1?rng.float(.86,.96):rng.float(1.05,1.14);
  return [stretch,1/stretch,3+shape*2,rng.float(.018,.05)];
 });
 const colonyGrade=COLONY[rng.int(0,2)],plateTurn=rng.float(-Math.PI,Math.PI),plateOffset=[rng.float(-.025,.025),rng.float(-.025,.025)],plateScale=rng.float(.89,1.04);
 const angle=rng.float(-2.8,-.35),lightDirection=[Math.cos(angle),Math.sin(angle)],sediment=rng.float(.78,1.12)*(habitat==='refuge'?1.12:1);
 return {biome,waterGrade,waterBase:WATER_BASE[biome],colonyGrade,plateTurn,plateOffset,plateScale,lightDirection,sediment,lifeSeed:rng.uint32(),dustSeed:rng.uint32(),lifeCount:rng.int(40,46),dustCount:[224,240,264][rng.int(0,2)],cells};
}
export type MissionAppearance=ReturnType<typeof missionAppearance>;
