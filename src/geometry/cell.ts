// Port of prototype/scripts/cell.gd; see CREDITS.md and LICENSE.
export class Cell {
  remaining=0; duration=6; captor=-1; lost=false;
  isReady():boolean {return this.remaining<=0.000001&&this.captor<0&&!this.lost;}
  spend(seconds:number):void {this.duration=seconds;this.remaining=seconds;}
  step(delta:number):void {this.remaining=Math.max(0,this.remaining-delta);if(this.remaining<0.000001)this.remaining=0;}
  progress():number {return this.isReady()?1:1-this.remaining/this.duration;}
}
