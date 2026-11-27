// Port of prototype/scripts/phage_cluster.gd; see CREDITS.md and LICENSE.
import type {Point} from '../geometry/loopGeometry';
import {HarvestOrganism} from './harvestOrganism';
export class PhageCluster extends HarvestOrganism {
  hostId=-1;attachedFrom:Point={x:0,y:0};
  constructor(id:number,position:Point){super(id,'phage',position,{x:5,y:4},id*0.71);}
  override lifetime():number{return this.hostId<0?72:9999;}
}
