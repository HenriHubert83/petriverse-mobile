import React from 'react';
import {Circle,Group,Path} from '@shopify/react-native-skia';
import type {Clot} from '../geometry/clot';
import type {Point} from '../geometry/loopGeometry';
import {sampleHarvestFlow} from './harvestFlow';
const path=(points:readonly Point[])=>points.map((p,i)=>`${i?'L':'M'} ${p.x} ${p.y}`).join(' ');

/** Source capture reward streams, in board coordinates and independent of run state. */
export function HarvestFlow({clots,target,reducedMotion=false}:{clots:readonly Clot[];target:Point;reducedMotion?:boolean}){
  return <>{sampleHarvestFlow(clots,target,reducedMotion).map(flow=><Group key={flow.serial}>
    {flow.reducedMotion?<Circle cx={target.x} cy={target.y} r={48} style="stroke" strokeWidth={1} color={flow.color} opacity={flow.fade*0.4}/>:<>
      {flow.strands.map((points,i)=><Path key={`strand${i}`} path={path(points)} color={flow.color} opacity={flow.fade*0.085} style="stroke" strokeWidth={0.65}/>)}
      {flow.particles.map((particle,i)=><Group key={i}>
        <Path path={path(particle.trail)} color={flow.color} opacity={particle.alpha*0.27} style="stroke" strokeWidth={1.3}/>
        <Circle cx={particle.position.x} cy={particle.position.y} r={2.6} color={flow.color} opacity={particle.alpha*0.07}/>
        <Circle cx={particle.position.x} cy={particle.position.y} r={particle.radius} color={flow.color} opacity={particle.alpha*0.8}/>
        <Circle cx={particle.position.x-0.2} cy={particle.position.y-0.3} r={0.32} color="#eaf4d5" opacity={particle.alpha}/>
      </Group>)}
    </>}
  </Group>)}</>;
}
