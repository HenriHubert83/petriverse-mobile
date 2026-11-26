import React from 'react';
import {Circle,Group,Path,RadialGradient,Text,useFont,vec} from '@shopify/react-native-skia';
import type {SkFont} from '@shopify/react-native-skia';
import type {EncounterSimulation} from '../engine/encounterSimulation';
import {GameFeel,sampleGameFeel} from './gameFeel';
import type {FeelLabel} from './gameFeel';

function FeedbackLabel({label,font}:{label:FeelLabel;font:SkFont}){
  const factor=label.size/24*label.scale,width=font.measureText(label.text).width;
  return <Group transform={[{translateX:label.at.x},{translateY:label.at.y},{scale:factor}]} opacity={label.opacity}>
    <Text text={label.text} x={-width/2} y={0} font={font} color="#031418" style="stroke" strokeWidth={4}/>
    <Text text={label.text} x={-width/2} y={0} font={font} color={label.color}/>
  </Group>;
}
/** Last board-space layer: world graphics share the exact touch viewport. */
export function GameFeelLayer({feel,run}:{feel:GameFeel;run:EncounterSimulation}){
  const font=useFont(require('../../assets/fonts/Inter-Variable.ttf'),24),frame=sampleGameFeel(feel,run);
  if(!frame.visible)return null;
  return <Group>
    <Group blendMode="plus">
      {frame.discs.filter(disc=>disc.color!=='#010507').map((disc,index)=><Circle key={`glow${index}`} cx={disc.at.x} cy={disc.at.y} r={disc.radius} opacity={disc.opacity}>
        <RadialGradient c={vec(disc.at.x,disc.at.y)} r={disc.radius} colors={disc.rim?
          [`${disc.color}00`,`${disc.color}00`,`${disc.color}73`,disc.color,`${disc.color}00`]:[disc.color,`${disc.color}b8`,`${disc.color}29`,`${disc.color}00`]}
          positions={disc.rim?[0,0.8,0.93,0.985,1]:[0,0.22,0.55,1]}/>
      </Circle>)}
      {frame.rings.map((ring,index)=><Circle key={`ring${index}`} cx={ring.at.x} cy={ring.at.y} r={ring.radius} color={ring.color} opacity={ring.opacity} style="stroke" strokeWidth={ring.width}/>)}
      {frame.strokes.map((stroke,index)=><Path key={`light${index}`} path={`M ${stroke.points.map(point=>`${point.x} ${point.y}`).join(' L ')}`} color={stroke.color} opacity={stroke.opacity} style="stroke" strokeWidth={stroke.width}/>)}
    </Group>
    {frame.discs.filter(disc=>disc.color==='#010507').map((disc,index)=><Circle key={`well${index}`} cx={disc.at.x} cy={disc.at.y} r={disc.radius} opacity={disc.opacity}>
      <RadialGradient c={vec(disc.at.x,disc.at.y)} r={disc.radius} colors={[disc.color,`${disc.color}a0`,`${disc.color}00`]}/>
    </Circle>)}
    {font&&frame.labels.map((label,index)=><FeedbackLabel key={index} label={label} font={font}/>)}
  </Group>;
}
