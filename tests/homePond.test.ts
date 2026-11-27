import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createJourneyProfile,parseJourneyProfile,renameResident,welcomeResidents,newResidents,residentLabel,residentMaturity,
  residentCompanion,residentRelationship,residentHabit,residentOrigin,keepsakeUnlocked} from '../src/storage/journeyProfile';
import type {JourneyProfile,ProfileResident} from '../src/storage/journeyProfile';
import {buildHomePond,sampleHomePond,pickPondResident,HomePondClock,POND_PAGE_SIZE} from '../src/pond/homePond';
import {godotStringHash} from '../src/pond/godotHash';

const json=<T>(value:T):T=>JSON.parse(JSON.stringify(value));
const resident=(i:number,form=''):ProfileResident=>({token:`73:2:${i}`,form,stage:2,encounter:3,rare:false,story:'',arrivedAfter:0,welcomed:true});
const profile=(records:ProfileResident[]):JourneyProfile=>({...createJourneyProfile(),residents:records});

test('resident names sanitize and persist without inventing records or modifying earlier profiles',()=>{
  const original=profile([resident(1),resident(2,'moonlace')]),before=json(original);
  const named=renameResident(original,original.residents[0].token,'  Aurora\nBorealis\t ');
  assert.equal(residentLabel(named.residents[0]),'Aurora Borealis');assert.deepEqual(original,before);
  assert.equal(residentLabel(named.residents[1]),'Moonlace');
  assert.strictEqual(renameResident(named,'missing','Ghost'),named);
  assert.strictEqual(renameResident(named,named.residents[0].token,'Aurora Borealis'),named);
  assert.equal(named.residents.length,2);assert.deepEqual(parseJourneyProfile(json(named)),named);
  const truncated=renameResident(named,named.residents[0].token,'🌱'.repeat(30));
  assert.equal(Array.from(truncated.residents[0].nickname!).length,24);
  assert.deepEqual(parseJourneyProfile(json(truncated)),truncated);
  assert.equal(residentLabel(renameResident(named,named.residents[0].token,'').residents[0]),'Pearl spore');
});

test('maturity follows four unique completed encounters and source origin and habit text stays truthful',()=>{
  const record={...resident(1,'glasswing_spore'),arrivedAfter:2},p=profile([record]);
  for(let clears=0;clears<=8;clears++){
    p.clearedEncounters=Array.from({length:clears},(_,i)=>`73:route:${i}`);
    assert.equal(residentMaturity(p,record),Math.max(0,Math.min(1,(clears-2)/4)));
  }
  assert.equal(residentHabit(record),'Unfurls its three glass wings into the current.');
  assert.equal(residentHabit({...record,form:'comet_spore'}),'Trails a soft silver wake through the pond.');
  assert.equal(residentOrigin(record),'Rescued in Stillwater, encounter 3.');
  assert.equal(residentOrigin({...record,stage:6,story:'hatchling'}),'Hatched in Glassgarden after you opened its cradle.');
  assert.equal(residentOrigin({...record,stage:6,story:'cradle'}),'Rescued inside the glass cradle in Glassgarden.');
  assert.equal(residentOrigin({...record,stage:10,encounter:14}),'Rescued in Blue Deep, encounter 14.');
});

test('companions are real visible residents and young residents prefer an older guide',()=>{
  const young={...resident(1,'snow_spore'),arrivedAfter:4},peer={...resident(2,'snow_spore'),arrivedAfter:4};
  const guide={...resident(3,'sail_spore'),nickname:'Luna'},p=profile([young,peer,guide]);
  p.clearedEncounters=['a','b','c','d'];
  assert.equal(residentCompanion(p,young,p.residents)?.token,guide.token);
  assert.equal(residentRelationship(p,young,guide),'Shelters near Luna while growing.');
  assert.equal(residentCompanion(p,young,[young]),undefined);
  assert.equal(residentRelationship(p,young),'The first resident has this quiet pond to itself.');
  assert.equal(residentCompanion(p,young,[young,peer])?.token,peer.token);
  p.clearedEncounters.push('e','f','g','h');
  assert.equal(residentCompanion(p,young,p.residents)?.token,peer.token);
  assert.equal(residentRelationship(p,young,guide),'Often drifts beside Luna.');
});

test('gardens and keepsakes reflect earned memories and never create rescued residents',()=>{
  const empty=createJourneyProfile();empty.discovered=['spore','moonlace','snow_spore'];
  assert.equal(buildHomePond(empty).residents.length,0);assert.equal(buildHomePond(empty).algae.length,0);
  empty.pondMemories=[{token:'73:2:guardian',id:'guardian',stage:2},{token:'73:4:gatherer',id:'gatherer',stage:4},{token:'73:8:clear_water',id:'clear_water',stage:8}];
  const gardens=buildHomePond(empty);assert.equal(gardens.residents.length,0);assert.equal(gardens.keepsakes.length,18);
  assert.deepEqual(gardens.gardens.map(g=>g.name),['Pearl nursery','Fern meadow','Glass garden']);
  assert.equal(keepsakeUnlocked(empty,'guardian'),true);assert.equal(keepsakeUnlocked(empty,'unknown'),false);
  const p=profile([resident(1),resident(2,'snow_spore')]);assert.equal(buildHomePond(p).algae.length,0);
  p.residents.push(resident(3,'sail_spore'));assert.equal(buildHomePond(p).algae.length,9);
  empty.pondMemories.push({token:'73:9:guardian',id:'guardian',stage:9});assert.equal(buildHomePond(empty).keepsakes.length,18);
});

test('home pages include actual records once and epilogue shows only the latest twelve rescues',()=>{
  const p=profile(Array.from({length:75},(_,i)=>resident(i+1)));assert.equal(POND_PAGE_SIZE,36);
  assert.deepEqual([0,1,2].map(page=>buildHomePond(p,page).residents.length),[36,36,3]);
  const tokens=[0,1,2].flatMap(page=>buildHomePond(p,page).residents.map(s=>s.record.token));
  assert.deepEqual(tokens,p.residents.map(r=>r.token));assert.equal(new Set(tokens).size,75);
  assert.equal(buildHomePond(p,100).page,2);assert.equal(buildHomePond(p,-1).page,0);
  assert.deepEqual(buildHomePond(p,0,true).residents.map(s=>s.record.token),p.residents.slice(-12).map(r=>r.token));
  assert.equal(buildHomePond(p,0,true).mother.width,217);assert.equal(buildHomePond(p).mother.width,145);
  const layout=buildHomePond(p);layout.residents[0].record.nickname='Frame copy';assert.equal(p.residents[0].nickname,undefined);
});

test('welcome presentation finds the first newcomer, pauses behind overlays and commits once after six seconds',()=>{
  const p=profile(Array.from({length:40},(_,i)=>({...resident(i+1),welcomed:i<37}))),before=json(p),clock=new HomePondClock();
  const opened=clock.open(p);assert.equal(opened.page,1);assert.equal(opened.selectedToken,p.residents[37].token);
  assert.equal(clock.welcomeRemaining,6);assert.equal(newResidents(p).length,3);
  assert.deepEqual(clock.step(20,{blocked:true}),[]);assert.equal(clock.time,0);assert.equal(clock.welcomeRemaining,6);
  assert.deepEqual(clock.step(3,{reducedMotion:true}),[]);assert.equal(clock.time,0);assert.equal(clock.welcomeRemaining,3);
  const done=clock.step(3,{reducedMotion:true});assert.deepEqual(done,p.residents.slice(37).map(r=>r.token));
  assert.deepEqual(clock.step(6),[]);assert.deepEqual(p,before);
  const welcomed=welcomeResidents(p,done);assert.equal(newResidents(welcomed).length,0);
  assert.deepEqual(parseJourneyProfile(json(welcomed)),welcomed);assert.strictEqual(welcomeResidents(welcomed,done),welcomed);
  assert.strictEqual(welcomeResidents(p,['not-a-resident']),p);
});

test('resident poses reconstruct from their independent clock, stay bounded and never change saved progress',()=>{
  const p=profile([resident(1,'snow_spore'),resident(2,'snow_spore'),{...resident(3,'glowdrift'),rare:true}]);
  p.clearedEncounters=['a','b','c','d'];p.pondMemories=[{token:'guardian',id:'guardian',stage:2}];
  const before=json(p),layout=buildHomePond(p),layoutBefore=json(layout);
  assert.deepEqual(buildHomePond(p),layout);
  const first=sampleHomePond(layout,0),later=sampleHomePond(layout,60);assert.notDeepEqual(later.residents.map(r=>r.position),first.residents.map(r=>r.position));
  for(const time of [0,1,20,3600])for(const pose of sampleHomePond(layout,time).residents){
    assert.ok(Math.hypot(pose.position.x-640,pose.position.y-450)<=332.000001);assert.equal(pose.width,pose.extent);
  }
  assert.deepEqual(sampleHomePond(layout,0),first);assert.deepEqual(json(layout),layoutBefore);assert.deepEqual(p,before);
  assert.equal(pickPondResident(first,first.residents[0].position),p.residents[0].token);
  assert.equal(pickPondResident(first,{x:0,y:0}),undefined);
  const clock=new HomePondClock();clock.step(5);const frozen=sampleHomePond(layout,clock.time,{reducedMotion:true});
  clock.step(10,{reducedMotion:true});assert.deepEqual(sampleHomePond(layout,clock.time,{reducedMotion:true}),frozen);
  clock.step(10,{blocked:true});assert.equal(clock.time,5);
});

test('newcomer movement uses the source arrival radius and reduced motion omits the entrance travel',()=>{
  const p=profile([{...resident(1),welcomed:false}]),layout=buildHomePond(p),tokens=[p.residents[0].token];
  const arrived=sampleHomePond(layout,0),entry=sampleHomePond(layout,0,{welcomeTokens:tokens,welcomeRemaining:6});
  assert.ok(Math.abs(Math.hypot(entry.residents[0].position.x-640,entry.residents[0].position.y-450)-350)<1e-6);
  const settled=sampleHomePond(layout,0,{welcomeTokens:tokens,welcomeRemaining:3});assert.deepEqual(settled.residents[0].position,arrived.residents[0].position);
  const reduced=sampleHomePond(layout,0,{welcomeTokens:tokens,welcomeRemaining:6,reducedMotion:true});assert.deepEqual(reduced.residents[0].position,arrived.residents[0].position);
});

test('resident hashing uses original unsigned UTF-32 DJB2 identities including non-BMP names',()=>{
  // Independent Python implementation over Unicode scalar values, modulo 2^32.
  assert.deepEqual(['','73:2:91','Luna','Луна','🌱'].map(godotStringHash),[5381,145733983,2089335957,2125468368,305366]);
  assert.equal(godotStringHash('Luna\0ignored'),godotStringHash('Luna'));
});
