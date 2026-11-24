// Development-time import only. No runtime downloads or network dependency.
import { readFile, mkdir, writeFile, rename, unlink } from 'node:fs/promises';
import { resolve, dirname, relative, isAbsolute } from 'node:path';
import { createHash } from 'node:crypto';
const root=resolve(import.meta.dirname,'..');
const manifest=JSON.parse(await readFile(resolve(root,'docs/ASSET_MANIFEST.json'),'utf8'));
const hash=bytes=>createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
const dry=process.argv.includes('--dry-run');
const allowed=manifest.files.filter(f=>/\.(png|ogg|ttf)$/i.test(f.source));
let imported=0,skipped=0;
for(const entry of allowed){
  const destination=resolve(root,entry.destination);
  const rel=relative(resolve(root,'assets'),destination);
  if(!rel||rel.startsWith('..')||isAbsolute(rel)||!entry.source.startsWith('prototype/assets/')||entry.destination!==entry.source.slice('prototype/'.length))throw Error('Invalid manifest path');
  if(dry){console.log(entry.destination,entry.bytes);continue;}
  let existing;
  try{existing=await readFile(destination);}catch(e){if(e.code!=='ENOENT')throw e;}
  if(existing){if(existing.length===entry.bytes&&hash(existing)===entry.gitBlob){skipped++;continue;}throw Error('Existing asset differs from upstream: '+entry.destination);}
  const url='https://raw.githubusercontent.com/'+manifest.source+'/'+manifest.commit+'/'+entry.source.split('/').map(encodeURIComponent).join('/');
  const response=await fetch(url,{signal:AbortSignal.timeout(120000)});
  if(!response.ok)throw Error('Download failed: '+entry.source+' ('+response.status+')');
  const bytes=Buffer.from(await response.arrayBuffer());
  if(bytes.length!==entry.bytes||hash(bytes)!==entry.gitBlob)throw Error('Integrity check failed: '+entry.source);
  await mkdir(dirname(destination),{recursive:true});
  const temp=destination+'.part';
  try{await writeFile(temp,bytes,{flag:'wx'});await rename(temp,destination);}catch(e){await unlink(temp).catch(()=>{});throw e;}
  imported++;console.log('Verified '+entry.destination);
}
console.log(dry?'Dry run: '+allowed.length+' binary assets planned.':imported+' imported; '+skipped+' already verified.');
console.log('Text notices excluded from automatic import; review and preserve required license notices separately before shipping.');
