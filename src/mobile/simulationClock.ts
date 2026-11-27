// Bounded fixed simulation steps keep gesture/render frame timing out of rules.
export class SimulationClock {
  private previous:number|undefined;private accumulator=0;
  reset():void{this.previous=undefined;this.accumulator=0;}
  advance(timestamp:number,running:boolean,step:(delta:number)=>void):number{
    if(!Number.isFinite(timestamp)){this.reset();return 0;}
    if(this.previous===undefined||!running){this.previous=timestamp;this.accumulator=0;return 0;}
    const delta=Math.max(0,Math.min(0.25,(timestamp-this.previous)/1000));this.previous=timestamp;this.accumulator+=delta;
    let steps=0;
    while(this.accumulator>=1/60-1e-9){this.accumulator=Math.max(0,this.accumulator-1/60);step(1/60);steps++;}
    return steps;
  }
}
