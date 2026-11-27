import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {creatureFilms,creatureFilm,visibleFilmSpecies,newFilmOffers} from '../src/cinema/creatureFilms';
import {CreatureFilmStage} from '../src/cinema/creatureFilmStage';
import {FilmPlayback,narrationDurations} from '../src/cinema/filmPlayback';
import {DiscoveryOfferQueue,markFilmOffered,markFilmIntroduced} from '../src/cinema/discoveryOffers';
import {BASE_CREATURES,LOCAL_FORMS,EXPEDITION_FORMS} from '../src/content/creatureCatalogue';
import {createJourneyProfile,parseJourneyProfile} from '../src/storage/journeyProfile';
import {HarvestOrganism} from '../src/ecology/harvestOrganism';
import manifest from '../src/cinema/narrationManifest.json';
import type {HarvestResult} from '../src/campaign/journeyHarvest';

test('every catalogue entry has its original title, narrated script and verified native audio',()=>{
  const catalogue=[...BASE_CREATURES,...LOCAL_FORMS,...EXPEDITION_FORMS];assert.equal(catalogue.length,44);
  assert.deepEqual(Object.keys(creatureFilms).sort(),catalogue.map(c=>c.id).sort());
  assert.deepEqual(manifest.files.map(f=>f.id).sort(),Object.keys(creatureFilms).sort());
  const script=readFileSync(new URL('../src/cinema/creatureFilms.json',import.meta.url));
  assert.equal(createHash('sha1').update(`blob ${script.length}\0`).update(script).digest('hex'),manifest.script.gitBlob);
  for(const entry of catalogue){
    const film=creatureFilm(entry.id)!;assert.equal(film.name,entry.name);assert.equal(film.kind,entry.kind);assert.ok(film.narration.length>80);
    const source=manifest.files.find(file=>file.id===entry.id)!;
    const bytes=readFileSync(new URL(`../${source.source}`,import.meta.url));
    assert.equal(createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex'),source.sourceGitBlob);
    const native=readFileSync(new URL(`../${source.destination}`,import.meta.url));
    assert.equal(native.length,source.bytes);assert.equal(createHash('sha256').update(native).digest('hex'),source.sha256);assert.ok(source.duration>5);
    assert.ok(new FilmPlayback(entry.id).finishAt>=source.duration+1);
  }
  assert.equal(creatureFilm('__proto__'),undefined);assert.throws(()=>new CreatureFilmStage('missing'));
});

for(const [id,entry] of Object.entries(creatureFilms))test(`live original demonstration: ${id}`,()=>{
  const stage=new CreatureFilmStage(id);for(let frame=0;frame<Math.ceil(stage.duration*30);frame++)stage.advance(1/30);
  const failed=stage.events.filter(event=>'error'in event||('valid'in event&&!event.valid));assert.deepEqual(failed,[]);
  const captures=stage.events.filter((event):event is HarvestResult&{strain:number}=>'valid'in event&&event.valid);
  const total=(key:'food'|'kills'|'rescued'|'armorHits'|'cellsRescued'|'bossLayers')=>captures.reduce((sum,event)=>sum+event[key],0);
  switch(entry.scene){
    case 'food':assert.ok(total('food')>=1);break;
    case 'spore':assert.equal(total('rescued'),1);break;
    case 'cyst':assert.ok(stage.milestones.nudged);break;
    case 'hunter':case 'grazer':assert.ok(stage.milestones.ate&&total('food')>=1&&total('kills')>=1);break;
    case 'shellback':assert.ok(total('armorHits')>=1&&total('kills')>=1);break;
    case 'twinspore':assert.ok(total('kills')>=1);break;
    case 'amoeba':assert.ok(stage.milestones.swallowed);assert.equal(total('cellsRescued'),1);break;
    case 'phage':assert.ok(stage.milestones.infected&&stage.milestones.ruptured);assert.equal(stage.run.enemies.filter(b=>b.kind==='food').length,2);break;
    case 'parasite':assert.ok(stage.milestones.latched&&total('kills')>=1);break;
    case 'divider':assert.ok(stage.milestones.split&&total('kills')>=2);break;
    case 'moonlace':assert.ok(stage.milestones.bloomed);break;
    case 'glowdrift':assert.ok(stage.milestones.sheltered);break;
    case 'glass_harp':{
      const helper=stage.subject,food=stage.run.enemies.find(body=>body.kind==='food') as HarvestOrganism,cyst=stage.run.enemies.find(body=>body.kind==='cyst') as HarvestOrganism;
      assert.ok(Math.hypot(food.nucleus.x-helper.nucleus.x,food.nucleus.y-helper.nucleus.y)<68);
      assert.ok(Math.hypot(cyst.nucleus.x-helper.nucleus.x,cyst.nucleus.y-helper.nucleus.y)>68);break;
    }
    case 'regent':case 'warden':assert.ok(stage.milestones.opened);break;
    case 'bellwether':assert.ok(stage.milestones.opened&&captures.length>0);break;
    case 'conjoined':assert.ok(total('bossLayers')>=1);break;
    default:assert.fail(`Uncovered scene: ${entry.scene}`);
  }
  // Filmed captures can never complete or modify a real campaign encounter.
  assert.equal(stage.run.state,'active');assert.equal(stage.run.contentEnabled,false);
});

test('replay recreates a deterministic scene without carrying any capture state',()=>{
  const first=new CreatureFilmStage('amoeba'),second=new CreatureFilmStage('amoeba');
  for(let frame=0;frame<510;frame++){first.advance(1/30);second.advance(1/30);}
  assert.deepEqual(first.events,second.events);assert.deepEqual(first.milestones,second.milestones);
  const replay=new CreatureFilmStage('amoeba');assert.equal(replay.elapsed,0);assert.deepEqual(replay.events,[]);assert.equal(replay.run.totalRescued,0);
});

test('clock independently holds user, background and loading pauses, drops wall-time gaps and completes once',()=>{
  const clock=new FilmPlayback('food');clock.tick(0);clock.tick(100);assert.ok(clock.elapsed>0);
  const before=clock.elapsed;clock.hold('user',true);clock.tick(5000);clock.hold('background',true);clock.hold('user',false);clock.tick(9000);
  assert.equal(clock.elapsed,before);assert.equal(clock.paused,true);
  clock.hold('background',false);clock.tick(20000);assert.equal(clock.elapsed,before);
  // Reapplying the same held value must not reset every animation frame.
  for(let i=1;i<=4;i++){clock.hold('background',false);clock.tick(20000+i*100);}
  assert.ok(clock.elapsed>before);const resumed=clock.elapsed;clock.tick(90000);assert.ok(clock.elapsed-resumed<=0.100001);
  clock.hold('loading',true);clock.tick(91000);assert.equal(clock.paused,true);clock.hold('loading',false);
  let at=92000;for(let i=0;i<2000&&!clock.completed;i++){clock.tick(at);at+=100;}
  assert.equal(clock.completed,true);assert.equal(clock.progress,1);assert.ok(clock.elapsed>=narrationDurations.food+1);
  const events=clock.stage.events.length;clock.tick(at+1000);assert.equal(clock.stage.events.length,events);
});

test('offers wait for actual arrival, do not interrupt gestures and persist independently of journal completion',()=>{
  const stage=new CreatureFilmStage('food'),run=stage.run,queue=new DiscoveryOfferQueue();let profile=createJourneyProfile();
  stage.subject.age=1.39;assert.deepEqual(queue.poll(run,profile),[]);stage.subject.age=1.4;
  assert.deepEqual(queue.poll(run,profile,true),[]);assert.deepEqual(queue.poll(run,profile),['food']);
  assert.deepEqual(queue.pendingIds,['food']);assert.deepEqual(queue.poll(run,profile),[]);
  const old=profile;profile=markFilmOffered(profile,['food','missing','food']);assert.deepEqual(old.offeredSpecies,[]);assert.deepEqual(profile.offeredSpecies,['food']);assert.deepEqual(profile.discovered,['food']);
  assert.equal(markFilmOffered(profile,['food']),profile);assert.equal(queue.takeNext(),'food');assert.deepEqual(queue.pendingIds,[]);
  profile=markFilmIntroduced(profile,'food');assert.deepEqual(profile.introducedSpecies,['food']);assert.equal(markFilmIntroduced(profile,'food'),profile);assert.equal(markFilmIntroduced(profile,'missing'),profile);
  assert.deepEqual(parseJourneyProfile(profile),profile);assert.deepEqual(newFilmOffers(run,profile.introducedSpecies,[]),[]);
  stage.subject.form='fern_desmid';assert.deepEqual(visibleFilmSpecies(run),['fern_desmid']);
  run.selection.active=true;assert.deepEqual(queue.poll(run,profile),[]);run.selection.active=false;run.nudge.targetId=1;assert.deepEqual(queue.poll(run,profile),[]);run.nudge.targetId=-1;
  assert.deepEqual(queue.poll(run,profile),['fern_desmid']);queue.later();assert.deepEqual(queue.pendingIds,[]);assert.deepEqual(queue.poll(run,profile),[]);
});

test('encounter transitions drop pending notices while offered films remain in the journal',()=>{
  const queue=new DiscoveryOfferQueue(),first=new CreatureFilmStage('food'),second=new CreatureFilmStage('shellback');
  let profile=createJourneyProfile();profile=markFilmOffered(profile,queue.poll(first.run,profile));assert.deepEqual(queue.pendingIds,['food']);
  profile=markFilmOffered(profile,queue.poll(second.run,profile));assert.deepEqual(queue.pendingIds,['shellback']);assert.deepEqual(profile.offeredSpecies,['food','shellback']);
  const phage=new CreatureFilmStage('phage');phage.companion!.age=1.39;assert.equal(visibleFilmSpecies(phage.run).includes('phage'),false);
  phage.companion!.age=1.4;assert.equal(visibleFilmSpecies(phage.run).includes('phage'),true);
});
