import {CreatureFilmStage} from './creatureFilmStage';
import narrationManifest from './narrationManifest.json';
export const narrationDurations:Readonly<Record<string,number>>=Object.fromEntries(narrationManifest.files.map(file=>[file.id,file.duration]));
/** Fixed-step cinema clock. Pauses never consume elapsed wall-clock time. */
export class FilmPlayback {
  readonly stage:CreatureFilmStage;readonly finishAt:number;
  private previous:number|undefined;private accumulator=0;private holds=new Set<string>();
  elapsed=0;completed=false;
  constructor(speciesId:string,reducedMotion=false){
    this.stage=new CreatureFilmStage(speciesId,reducedMotion);
    const audioDuration=narrationDurations[speciesId],readingTime=this.stage.entry.narration.split(/\s+/).length/2.6+1.2;
    this.finishAt=Math.max(this.stage.duration,audioDuration?audioDuration+1:readingTime);
  }
  get paused():boolean{return this.holds.size>0;}
  get progress():number{return Math.min(1,this.elapsed/this.finishAt);}
  hold(reason:string,active:boolean):void{
    if(this.holds.has(reason)===active)return;
    if(active)this.holds.add(reason);else this.holds.delete(reason);this.previous=undefined;this.accumulator=0;
  }
  tick(timestamp:number):number{
    if(!Number.isFinite(timestamp)){this.previous=undefined;return 0;}
    if(this.previous===undefined||this.paused||this.completed){this.previous=timestamp;return 0;}
    this.accumulator+=Math.max(0,Math.min(0.1,(timestamp-this.previous)/1000));this.previous=timestamp;let steps=0;
    while(this.accumulator>=1/30-1e-9&&!this.completed){
      this.accumulator=Math.max(0,this.accumulator-1/30);this.elapsed+=1/30;this.stage.advance(1/30);steps++;
      if(this.elapsed+1e-9>=this.finishAt){this.elapsed=this.finishAt;this.completed=true;}
    }
    return steps;
  }
}
