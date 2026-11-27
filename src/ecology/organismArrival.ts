// Port of prototype/scripts/organism_arrival.gd; see CREDITS.md and LICENSE.
export function arrivalProgress(body:{id:number;age:number;isBoss():boolean}):number {
  const duration=body.isBoss()?2.8:2.2+((body.id%5+5)%5)*0.09;
  return Math.max(0,Math.min(1,body.age/duration));
}
