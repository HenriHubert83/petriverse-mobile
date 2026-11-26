import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {createHash} from 'node:crypto';
import type {CanvasKit,RuntimeEffect,Shader,Image} from 'canvaskit-wasm';
import {amoebaArmShader} from '../src/rendering/shaders/amoebaArm';
import {amoebaBodyShader} from '../src/rendering/shaders/amoebaBody';
import {depthTissueShader} from '../src/rendering/shaders/depthTissue';
import {phageShader} from '../src/rendering/shaders/phage';
import {amoebaOutline,AMOEBA_OUTLINE_RESOLUTION} from '../src/rendering/amoebaOutline';
const require=createRequire(import.meta.url),modulePath=require.resolve('canvaskit-wasm/bin/full/canvaskit.js');
const ready:Promise<CanvasKit>=require(modulePath)({locateFile:(file:string)=>join(dirname(modulePath),file)});
const hash=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
function uniforms(effect:RuntimeEffect,values:Record<string,number|number[]>):Float32Array{
  const packed=new Float32Array(effect.getUniformFloatCount());
  for(let i=0;i<effect.getUniformCount();i++){
    const name=effect.getUniformName(i),info=effect.getUniform(i),value=values[name];assert.notEqual(value,undefined,`Uniform ${name}`);
    const numbers=typeof value==='number'?[value]:value;assert.equal(numbers.length,info.columns*info.rows,name);packed.set(numbers,info.slot);
  }
  return packed;
}
function image(C:CanvasKit,name:string):Image{
  const decoded=C.MakeImageFromEncoded(readFileSync(new URL(`../assets/organisms/${name}`,import.meta.url)));assert.ok(decoded);return decoded;
}
function child(C:CanvasKit,value:Image):Shader{return value.makeShaderOptions(C.TileMode.Clamp,C.TileMode.Clamp,C.FilterMode.Linear,C.MipmapMode.None);}
function render(C:CanvasKit,effect:RuntimeEffect,values:Record<string,number|number[]>,children:Shader[],width=320,height=260){
  const surface=C.MakeSurface(width,height)!;assert.ok(surface);const paint=new C.Paint(),shader=effect.makeShaderWithChildren(uniforms(effect,values),children);
  paint.setShader(shader);surface.getCanvas().clear(C.TRANSPARENT);surface.getCanvas().drawRect(C.XYWHRect(0,0,width,height),paint);surface.flush();
  const snapshot=surface.makeImageSnapshot(),pixels=snapshot.readPixels(0,0,{width,height,colorType:C.ColorType.RGBA_8888,alphaType:C.AlphaType.Premul,colorSpace:C.ColorSpace.SRGB}) as Uint8Array;
  const png=snapshot.encodeToBytes()!;assert.ok(pixels);snapshot.delete();shader.delete();paint.delete();surface.delete();return {pixels,png};
}
function opacity(bytes:Uint8Array){let count=0;for(let i=3;i<bytes.length;i+=4)if(bytes[i]>80)count++;return count;}

test('specialized source shaders compile, retain photographic tissue and render deterministic changing anatomy',async()=>{
  const C=await ready,effects=new Map<string,RuntimeEffect>();
  for(const [name,source] of Object.entries({amoebaArmShader,amoebaBodyShader,depthTissueShader,phageShader})){
    let error='';const effect=C.RuntimeEffect.Make(source,message=>{error+=message;});assert.ok(effect,`${name}: ${error}`);effects.set(name,effect);
  }
  const art=image(C,'amoeba-v2.png'),artChild=child(C,art),sourcePixels=art.readPixels(0,0,{width:art.width(),height:art.height(),colorType:C.ColorType.RGBA_8888,alphaType:C.AlphaType.Unpremul,colorSpace:C.ColorSpace.SRGB}) as Uint8Array;
  const field=amoebaOutline(sourcePixels,art.width(),art.height()),size=AMOEBA_OUTLINE_RESOLUTION;
  const outline=C.MakeImage({width:size,height:size,colorType:C.ColorType.RGBA_F32,alphaType:C.AlphaType.Opaque,colorSpace:C.ColorSpace.SRGB},new Uint8Array(field.buffer),size*16)!;assert.ok(outline);const outlineChild=child(C,outline);
  const values={textureSize:[art.width(),art.height()],outlineSize:[size,size],rectOrigin:[0,0],extent:[320,260],origin:[120,130],target:[85,0],clock:4,crawl:3,motion:1,phase:1,arrival:1,extension:0,ingestion:0,closure:0,meal:0,water_base:[.055,.115,.15]};
  const idle=render(C,effects.get('amoebaBodyShader')!,values,[artChild,outlineChild]);
  const reaching=render(C,effects.get('amoebaBodyShader')!,{...values,extension:1},[artChild,outlineChild]);
  const repeat=render(C,effects.get('amoebaBodyShader')!,{...values,extension:1},[artChild,outlineChild]);
  const closed=render(C,effects.get('amoebaBodyShader')!,{...values,extension:1,closure:1,ingestion:.5},[artChild,outlineChild]);
  assert.equal(hash(reaching.pixels),hash(repeat.pixels));assert.notEqual(hash(idle.pixels),hash(reaching.pixels));assert.notEqual(hash(closed.pixels),hash(reaching.pixels));
  assert.ok(opacity(idle.pixels)>2500);assert.ok(opacity(reaching.pixels)>opacity(idle.pixels)+1500);assert.ok(opacity(closed.pixels)>opacity(reaching.pixels));
  const colors=new Set<string>();for(let i=0;i<reaching.pixels.length;i+=4)if(reaching.pixels[i+3]>180)colors.add(Array.from(reaching.pixels.subarray(i,i+3)).join(','));assert.ok(colors.size>1000,'Photographic tissue is retained');
  // The golden capture nucleus remains registered while the cell reaches outward.
  const nucleus=(130*320+120)*4;assert.deepEqual(Array.from(idle.pixels.subarray(nucleus,nucleus+4)),Array.from(reaching.pixels.subarray(nucleus,nucleus+4)));
  writeFileSync('/tmp/petriverse-amoeba-reaching.png',reaching.png);writeFileSync('/tmp/petriverse-amoeba-closed.png',closed.png);
  const arm=render(C,effects.get('amoebaArmShader')!,{textureSize:[art.width(),art.height()],rectOrigin:[0,0],extent:[320,260],start:[120,130],target:[85,0],extension:1,clock:4,motion:1},[artChild]);assert.ok(opacity(arm.pixels)>1000);
  const phage=image(C,'silver-phage.png'),phageChild=child(C,phage),phageValues={textureSize:[phage.width(),phage.height()],displaySize:[128,192],spriteOrigin:[96,34],clock:3,phase:2,motion:1,contraction:0};
  const free=render(C,effects.get('phageShader')!,phageValues,[phageChild]),contracted=render(C,effects.get('phageShader')!,{...phageValues,contraction:1},[phageChild]);
  assert.ok(opacity(free.pixels)>1000);assert.notEqual(hash(free.pixels),hash(contracted.pixels));assert.equal(hash(contracted.pixels),hash(render(C,effects.get('phageShader')!,{...phageValues,contraction:1},[phageChild]).pixels));
  writeFileSync('/tmp/petriverse-phage-contracting.png',contracted.png);
  const depthValues={textureSize:[art.width(),art.height()],displaySize:[180,180],spriteOrigin:[60,40],spriteAnchor:[150,130],spriteRotation:0,blur:.03,clock:2,motion:1,phase:0};
  // Move the source world coordinates into the dish for the optical depth mask.
  const depth=render(C,effects.get('depthTissueShader')!,{...depthValues,spriteOrigin:[530,350],spriteAnchor:[620,440]},[artChild],1280,900);
  assert.ok(opacity(depth.pixels)>1000);assert.equal(depth.pixels[3],0);
  phageChild.delete();phage.delete();outlineChild.delete();outline.delete();artChild.delete();art.delete();for(const effect of effects.values())effect.delete();
});
