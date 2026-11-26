import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import manifest from '../docs/ASSET_MANIFEST.json';
import derivatives from '../docs/AUDIO_DERIVATIVES.json';
const bytes=(path:string)=>readFileSync(new URL('../'+path,import.meta.url));
const gitBlob=(data:Buffer)=>createHash('sha1').update(`blob ${data.length}\0`).update(data).digest('hex');
test('soundscape runtime copies and original audio retain verifiable provenance',()=>{
  assert.equal(derivatives.files.length,20);assert.equal(new Set(derivatives.files.map(f=>f.source)).size,19);
  for(const file of derivatives.files){
    const original=manifest.files.find(f=>f.destination===file.source);assert.ok(original);
    const source=bytes(file.source);assert.equal(source.length,original.bytes);assert.equal(gitBlob(source),original.gitBlob);assert.equal(file.sourceGitBlob,original.gitBlob);
    const runtime=bytes(file.destination);assert.equal(runtime.length,file.bytes);assert.equal(createHash('sha256').update(runtime).digest('hex'),file.sha256);assert.ok(file.durationSeconds>0);
  }
});
test('font and license notices are the exact pinned upstream originals',()=>{
  for(const path of ['assets/fonts/Inter-Variable.ttf','assets/fonts/OFL.txt']){
    const expected=manifest.files.find(f=>f.destination===path);assert.ok(expected);
    const original=bytes(path);assert.equal(original.length,expected.bytes);assert.equal(gitBlob(original),expected.gitBlob);
  }
  assert.equal(gitBlob(bytes('licenses/UPSTREAM-THIRD-PARTY-NOTICES.txt')),'feda8902958ba727c6cdbf3fb9cfbe41351e4f04');
});
