import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {CREATURE_FORMS} from '../src/content/creatureCatalogue';

// Metro turns PNG requires into opaque asset handles. Give the CPU renderer
// metadata tests filename handles, without importing React Native or a GPU.
const localRequire=createRequire(resolve('tests/creatureRendering.test.ts'));
const previous=localRequire.extensions['.png'];
localRequire.extensions['.png']=(module,filename)=>{module.exports=filename;};
let textures:typeof import('../src/rendering/organismTextures');
try{textures=localRequire('../src/rendering/organismTextures');}
finally{if(previous)localRequire.extensions['.png']=previous;else delete localRequire.extensions['.png'];}
const {organismTextures,textureKey,spriteMetrics}=textures;

test('every creature form has its pinned original artwork, registered to its nucleus',()=>{
  const manifest=JSON.parse(readFileSync('docs/ASSET_MANIFEST.json','utf8')) as {files:{destination:string;bytes:number;gitBlob:string}[]};
  const registry=organismTextures as Record<string,string>;
  assert.equal(CREATURE_FORMS.length,27);
  for(const form of CREATURE_FORMS){
    const key=textureKey(form.kind,form.id);
    assert.equal(key,form.id);
    const path=registry[key],entry=manifest.files.find(e=>resolve(e.destination)===path);
    assert.ok(entry,`Missing pinned asset record: ${form.id}`);
    const bytes=readFileSync(path);
    assert.equal(bytes.length,entry.bytes,form.id);
    assert.equal(createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex'),entry.gitBlob,form.id);
    assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
    assert.deepEqual(spriteMetrics(form.kind,form.id).uv,form.uv,form.id);
    assert.ok(form.uv.x>0&&form.uv.x<1&&form.uv.y>0&&form.uv.y<1);
  }
});

test('form lookup preserves family art and registration for unknown or mismatched forms',()=>{
  assert.equal(textureKey('food','sail_spore'),'food');
  assert.equal(textureKey('spore','unrecognized-form'),'spore');
  assert.equal(textureKey('spore',''),'spore');
  assert.equal(textureKey('toString'),'drifter');
  assert.equal(textureKey('bell_bud'),'bellwether');
  assert.equal(textureKey('warden'),'regent');
  assert.equal(textureKey('moonlace'),'moonlace');
  assert.deepEqual(spriteMetrics('food','sail_spore'),spriteMetrics('food'));
  assert.deepEqual(spriteMetrics('spore','unrecognized-form'),spriteMetrics('spore'));
});

test('rare absorption extent and form nucleus offsets match the original presentation',()=>{
  assert.deepEqual(spriteMetrics('spore','moonlace'),{width:90,uv:{x:0.485,y:0.499}});
  assert.deepEqual(spriteMetrics('spore','sail_spore'),{width:43,uv:{x:0.5,y:0.629}});
  assert.deepEqual(spriteMetrics('shellback','amber_nautilus'),{width:90,uv:{x:0.453,y:0.487}});
  assert.equal(spriteMetrics('shellback').width,84);
  assert.equal(spriteMetrics('mother7').width,120);
});
