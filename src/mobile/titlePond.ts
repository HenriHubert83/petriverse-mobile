import {EncounterSimulation} from '../engine/encounterSimulation';
import {HarvestOrganism} from '../ecology/harvestOrganism';
import {missionAppearance} from '../rendering/missionAppearance';
import {WaterTracers} from '../rendering/waterTracers';

// A title specimen never ages out. Only its visual movement is advanced here;
// gameplay lifetime, captures, food-web rules and discoveries are not evaluated.
class TitleSpecimen extends HarvestOrganism {
  override opacity():number{return 1;}
}

export interface TitlePondAppearance {reducedMotion?:boolean;visualQuality?:0|1|2}

/** A private decorative microscope, independent of the player's journey/profile. */
export class TitlePond {
  readonly run=new EncounterSimulation({stage:0,mode:'feed',food:9,target:0,duration:60},{
    seed:0x50455452,content:false,guidedLesson:false,creatureContentEnabled:false,habitatContentEnabled:false,
  });
  readonly tracers=new WaterTracers();
  private readonly look=missionAppearance(this.run.runSeed,this.run.stageIndex);

  constructor(){
    const {run}=this,center=run.board.center;
    // Active selects the clear optical presentation. Never call run.step(),
    // begin(), capture() or a journey coordinator for this decorative scene.
    run.state='active';
    const specimens=[
      {kind:'food',form:'',angle:.25,radius:178},
      {kind:'food',form:'fern_desmid',angle:.78,radius:272},
      {kind:'food',form:'',angle:1.52,radius:213},
      {kind:'spore',form:'snow_spore',angle:2.02,radius:300},
      {kind:'food',form:'fern_desmid',angle:2.65,radius:191},
      {kind:'cyst',form:'',angle:3.14,radius:303},
      {kind:'food',form:'',angle:3.62,radius:237},
      {kind:'food',form:'fern_desmid',angle:4.14,radius:310},
      {kind:'spore',form:'',angle:4.68,radius:181},
      {kind:'food',form:'',angle:5.05,radius:279},
      {kind:'cyst',form:'crown_cyst',angle:5.53,radius:215},
      {kind:'food',form:'fern_desmid',angle:5.97,radius:312},
    ];
    for(const [index,specimen] of specimens.entries()){
      const at={x:center.x+Math.cos(specimen.angle)*specimen.radius,y:center.y+Math.sin(specimen.angle)*specimen.radius};
      const body=new TitleSpecimen(index+1,specimen.kind,at,{x:9+index%3*3,y:7+index%4*2},index*1.71);
      body.age=4;body.form=specimen.form;body.step(0,center);run.addBody(body);
    }
    this.syncTracers(false,2);
  }

  private syncTracers(reducedMotion:boolean,quality:0|1|2):void{
    this.tracers.sync(this.run.elapsed,reducedMotion?0:1,this.run.fluid,{key:'title-pond',dustSeed:this.look.dustSeed},quality);
  }

  /** UI owns visibility/foreground scheduling; long wall-time gaps are discarded. */
  advance(delta:number,{reducedMotion=false,visualQuality=2}:TitlePondAppearance={}):void{
    if(!Number.isFinite(delta)||delta<0)throw new RangeError('Invalid title pond delta');
    if(!reducedMotion&&delta>0){
      const {run}=this,step=Math.min(delta,.1)*.65;
      run.elapsed+=step;
      run.fluid.sources=[
        {x:run.board.center.x-170,y:run.board.center.y-55,radial:0,curl:3},
        {x:run.board.center.x+180,y:run.board.center.y+90,radial:0,curl:-2.5},
      ];
      for(const body of run.enemies){
        const previous={...body.nucleus};body.step(step,run.board.center);
        run.fluid.stroke(previous,body.nucleus,.3);
      }
      run.fluid.step(step);run.board.stepMotion(step,[],run.fluid);
    }
    this.syncTracers(reducedMotion,visualQuality);
  }
}
