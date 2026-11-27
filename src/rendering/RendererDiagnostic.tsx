import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {Canvas, Circle, Group, LinearGradient, RadialGradient, Path, Shader, Skia, vec} from '@shopify/react-native-skia';
import {useSharedValue, useDerivedValue, useFrameCallback} from 'react-native-reanimated';

import {membraneShader,membraneDefaults} from './shaders/membrane';

// Synthetic diagnostic, with the original membrane shader translated to SkSL.
const membraneEffect=Skia.RuntimeEffect.Make(membraneShader);
const membranePath='M 626.93 325.68 L 593.82 212.45 L 766.9 254.59 Z';
export function RendererDiagnostic({running}:{running:boolean}) {
  const [size,setSize]=useState({width:0,height:0});
  const time=useSharedValue(0);
  const frame=useFrameCallback(info => {
    time.value += Math.min(info.timeSincePreviousFrame ?? 0,50)/1000;
  },false);
  useEffect(() => { frame.setActive(running); return () => frame.setActive(false); },[frame,running]);
  const r=Math.min(size.width,size.height)*0.45;
  const cx=size.width/2,cy=size.height/2;
  const pulse=useDerivedValue(()=>r*0.18*(1+0.055*Math.sin(time.value*2)));
  const uniforms=useDerivedValue(()=>({...membraneDefaults,clock:time.value,strength:0.55}));
  const scale=r/392;
  return <View style={styles.wrap} onLayout={e=>setSize(e.nativeEvent.layout)}>
    {r>0 && <Canvas style={StyleSheet.absoluteFill}>
      <Circle cx={cx} cy={cy} r={r}><RadialGradient c={vec(cx,cy)} r={r} colors={['#24505b','#102b35','#091c23']}/></Circle>
      <Group>
        {Array.from({length:12},(_,i)=>{
          const a=i*Math.PI/6;
          return <Circle key={i} cx={cx+Math.cos(a)*r*0.64} cy={cy+Math.sin(a)*r*0.64} r={r*0.08}><LinearGradient start={vec(cx,cy-r)} end={vec(cx,cy+r)} colors={['#92d2da','#386780']}/></Circle>;
        })}
      </Group>
      <Group transform={[{translateX:cx-640*scale},{translateY:cy-450*scale}]}>
        <Group transform={[{scale}]}>
          {membraneEffect ? <Path path={membranePath}><Shader source={membraneEffect} uniforms={uniforms}/></Path> : <Path path={membranePath} color="rgba(120,180,190,0.3)"/>}
          <Path path={membranePath} style="stroke" strokeWidth={2} color="#92d2da"/>
        </Group>
      </Group>
      <Circle cx={cx} cy={cy} r={pulse} color="#72aaa8"/>
      <Circle cx={cx} cy={cy} r={r} style="stroke" strokeWidth={1.5} color="#54838a"/>
    </Canvas>}
    <Text style={styles.caption}>{membraneEffect?'Membrane RuntimeEffect loaded':'Membrane RuntimeEffect failed: fallback active'} · synthetic diagnostic</Text>
  </View>;
}
const styles=StyleSheet.create({wrap:{flex:1},caption:{position:'absolute',bottom:4,left:12,color:'#9cc2c5',fontSize:11}});
