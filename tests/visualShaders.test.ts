import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {livingTissueShader} from '../src/rendering/shaders/livingTissue';
import {fusedTissueShader} from '../src/rendering/shaders/fusedTissue';
import {microscopeFieldShader} from '../src/rendering/shaders/microscopeField';
import {pondSpecimenShader} from '../src/rendering/shaders/pondSpecimen';
import {lensOpticsShader} from '../src/rendering/shaders/lensOptics';
import {livingBridgeShader} from '../src/rendering/shaders/livingBridge';
import {membraneShader} from '../src/rendering/shaders/membrane';
import {tissueDefaults,bodyPose,bodyTissue,sceneTissue,motherTissue} from '../src/rendering/tissueUniforms';
import type {TissueUniforms} from '../src/rendering/tissueUniforms';
import {missionAppearance} from '../src/rendering/missionAppearance';
import {pondPopulation,swimmingPosition,samplePondSpecimen} from '../src/rendering/pondLife';
import {EncounterSimulation} from '../src/engine/encounterSimulation';
import {Bacterium} from '../src/ecology/bacterium';
const require=createRequire(import.meta.url);
const kitPromise=require('canvaskit-wasm')({locateFile:(file:string)=>require.resolve('canvaskit-wasm/bin/'+file)});
const source={livingTissueShader,fusedTissueShader,microscopeFieldShader,pondSpecimenShader,lensOpticsShader,livingBridgeShader,membraneShader};
function pack(effect:any,uniforms:TissueUniforms){
 const values=new Float32Array(effect.getUniformFloatCount());
 for(let i=0;i<effect.getUniformCount();i++){
  const name=effect.getUniformName(i),info=effect.getUniform(i),value=uniforms[name];
  assert.notEqual(value,undefined,`Missing ${name}`);
  const array=Array.isArray(value)?value:[value];assert.equal(array.length,info.columns*info.rows,`Shape ${name}`);
  assert.ok(array.every(Number.isFinite),`Finite ${name}`);values.set(array,info.slot);
 }return values;
}
const digest=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
test('all integrated SkSL compiles in CanvasKit CPU backend',async()=>{
 const kit=await kitPromise;for(const [name,code]of Object.entries(source)){let errors='';const effect=kit.RuntimeEffect.Make(code,(message:string)=>errors+=message);assert.ok(effect,`${name}: ${errors}`);effect.delete();}
});
test('tissue draws premultiplied pixels and source motion, wounds and erosion change them',async()=>{
 const kit=await kitPromise,effect=kit.RuntimeEffect.Make(livingTissueShader),image=kit.MakeImageFromEncoded(readFileSync('assets/organisms/mother-young.png'));
 assert.ok(image);const child=image.makeShaderOptions(kit.TileMode.Clamp,kit.TileMode.Clamp,kit.FilterMode.Linear,kit.MipmapMode.None);
 const surface=kit.MakeSurface(256,256),canvas=surface.getCanvas(),paint=new kit.Paint();
 const base={...tissueDefaults(),textureSize:[image.width(),image.height()],hostTextureSize:[image.width(),image.height()],displaySize:[120,120],spriteOrigin:[68,68],spriteAnchor:[128,128],spriteRotation:0,kind:1};
 const render=(overrides:TissueUniforms)=>{canvas.clear(kit.TRANSPARENT);const shader=effect.makeShaderWithChildren(pack(effect,{...base,...overrides}),[child,child]);paint.setShader(shader);canvas.drawRect(kit.XYWHRect(32,32,192,192),paint);surface.flush();const snap=surface.makeImageSnapshot(),pixels=snap.readPixels(0,0,{width:256,height:256,colorType:kit.ColorType.RGBA_8888,alphaType:kit.AlphaType.Premul,colorSpace:kit.ColorSpace.SRGB});snap.delete();shader.delete();return pixels as Uint8Array;};
 const still=render({motion:0,clock:0}),moving=render({motion:1,clock:6}),wound=render({motion:0,core_damage:[1,0,1,0,1,0,0],fatal_damage:1});
 assert.ok(still.some((value:number,i:number)=>i%4===3&&value>200));assert.ok(still.some((value:number,i:number)=>i%4===3&&value===0));assert.notEqual(digest(still),digest(moving));assert.notEqual(digest(still),digest(wound));
 for(let i=0;i<still.length;i+=4){assert.ok(still[i]<=still[i+3]+1);assert.ok(still[i+1]<=still[i+3]+1);assert.ok(still[i+2]<=still[i+3]+1);}
 paint.delete();surface.delete();child.delete();image.delete();effect.delete();
});
test('appearance and ambient routes are stable, continuous and independent of gameplay RNG',()=>{
 const run=new EncounterSimulation({stage:4,food:10,target:0,duration:60,mode:'feed'},{seed:91}),before=run.rng.saveState(),look=missionAppearance(91,4),again=missionAppearance(91,4);
 assert.deepEqual(look,again);assert.notDeepEqual(look,missionAppearance(92,4));assert.equal(look.cells.length,24);assert.equal(look.biome,1);
 const p=pondPopulation(look);assert.equal(p.specimens.length,look.lifeCount);assert.equal(p.debris.length,look.dustCount);
 for(const s of p.specimens){const a=swimmingPosition(s,10),b=swimmingPosition(s,10.0001);assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<.01);const frozen=samplePondSpecimen(s,10,0,look,run.fluid);assert.deepEqual(frozen.at,s.at);assert.equal(frozen.angle,s.phase);}
 assert.deepEqual(run.rng.saveState(),before);const frozen=sceneTissue(run,look,true);run.elapsed=99;assert.deepEqual(sceneTissue(run,look,true),frozen);
});
test('infection uses infection age and reduced motion preserves semantic injury state',()=>{
 const body=new Bacterium(1,{x:400,y:300});body.age=30;assert.equal(bodyTissue(body,false).infection,0);assert.equal(bodyTissue(body,false).dissolve,0);body.infectionAge=8.5;assert.ok(Number(bodyTissue(body,false).infection)>.9);assert.ok(Number(bodyTissue(body,false).dissolve)>0);const at={...body.nucleus},pose=bodyPose(body,{x:640,y:450},20,true);assert.ok(pose.scaleX>1&&pose.scaleY>pose.scaleX);assert.deepEqual(body.nucleus,at);
 const run=new EncounterSimulation({stage:0,food:10,target:0,duration:60,mode:'feed'});run.motherDamage.record(1,{x:700,y:400},run.board.center);run.motherDamage.step(.8);
 assert.deepEqual(motherTissue(run,true).core_damage,motherTissue(run,false).core_damage);assert.equal(motherTissue(run,true).shock,0);
});
