import React,{useCallback,useEffect,useMemo,useState} from 'react';
import {PanResponder,Pressable,StyleSheet,Text,View} from 'react-native';
import type {GestureResponderEvent,NativeTouchEvent} from 'react-native';
import {Canvas,Circle,Group,Image,Path,RadialGradient,Shader,Skia,useImage,vec} from '@shopify/react-native-skia';
import type {SkImage} from '@shopify/react-native-skia';
import type {EncounterSimulation} from '../engine/encounterSimulation';
import type {TouchController} from '../mobile/touchController';
import {MAX_BOARD_ZOOM,toScreen} from '../mobile/boardViewport';
import type {Point} from '../geometry/loopGeometry';
import {Amoeba} from '../ecology/amoeba';
import {EcologyEnemy} from '../ecology/ecologyEnemy';
import {HarvestOrganism} from '../ecology/harvestOrganism';
import {arrivalProgress} from '../ecology/organismArrival';
import {add} from '../ecology/drifter';
import {organismTextures,spriteMetrics,textureKey} from './organismTextures';
import type {TextureKey} from './organismTextures';
import type {WaterTracers} from './waterTracers';
import {membraneDefaults,membraneShader} from './shaders/membrane';

type Images=Partial<Record<TextureKey,SkImage>>;
const pathFor=(points:readonly Point[],closed=false)=>points.length?`M ${points.map(p=>`${p.x} ${p.y}`).join(' L ')}${closed?' Z':''}`:'';
const palette:Record<string,string>={cell:'#82c5d4',food:'#b8d78c',cyst:'#b075a4',spore:'#e9e8bf',drifter:'#e6ad78'};
function TextureLoader({name,loaded}:{name:TextureKey;loaded:(name:TextureKey,image:SkImage|null)=>void}){
  const image=useImage(organismTextures[name]);
  useEffect(()=>{if(image)loaded(name,image);return()=>loaded(name,null);},[image,loaded,name]);return null;
}
function Sprite({kind,form='',at,images,opacity=1,angle=0,width}:{kind:string;form?:string;at:Point;images:Images;opacity?:number;angle?:number;width?:number}){
  const image=images[textureKey(kind,form)],metric=spriteMetrics(kind,form),w=width??metric.width;
  const h=image?w*image.height()/image.width():w;
  return <Group opacity={opacity} origin={vec(at.x,at.y)} transform={[{rotate:angle}]}>
    {image?<Image image={image} x={at.x-w*metric.uv.x} y={at.y-h*metric.uv.y} width={w} height={h} fit="fill"/>:
      <Circle cx={at.x} cy={at.y} r={w*0.25} color={palette[kind]??'#d9b07e'}/>}
  </Group>;
}
export function EncounterView({run,touch,tracers,onInteraction}:{run:EncounterSimulation;touch:TouchController;tracers:WaterTracers;onInteraction:()=>void}){
  const [size,setSize]=useState({width:0,height:0}),[,refreshCamera]=useState(0),[images,setImages]=useState<Images>({});
  const loaded=useCallback((name:TextureKey,image:SkImage|null)=>setImages(previous=>{
    if((previous[name]??null)===image)return previous;const next={...previous};if(image)next[name]=image;else delete next[name];return next;
  }),[]);
  const mother=`mother${run.maxIntegrity}` as TextureKey;
  const wanted=[...new Set<TextureKey>(['cell',mother,...run.enemies.map(b=>textureKey(b.kind,b.form)),...run.phages.clusters.map(()=> 'phage' as const),...run.clots.flatMap(c=>c.positions.map((_,i)=>textureKey(c.preyKinds[i]??'food',c.preyForms[i])))])];
  const effect=useMemo(()=>{try{return Skia.RuntimeEffect.Make(membraneShader);}catch{return null;}},[]);
  const pan=useMemo(()=>{
    // The touch surface has no interactive children. Fix its page-space origin
    // at grant, then map every finger from page coordinates into that one basis.
    // A second finger's native locationX can otherwise refer to a different target.
    let origin={x:0,y:0};
    const points=(touches:readonly NativeTouchEvent[])=>touches.map(p=>({id:p.identifier,x:p.pageX-origin.x,y:p.pageY-origin.y}));
    const ended=(event:GestureResponderEvent)=>{touch.endTouches(points(event.nativeEvent.touches),points(event.nativeEvent.changedTouches));onInteraction();};
    return PanResponder.create({
      onStartShouldSetPanResponder:()=>run.state==='active',onMoveShouldSetPanResponder:()=>false,
      onPanResponderGrant:e=>{
        origin={x:e.nativeEvent.pageX-e.nativeEvent.locationX,y:e.nativeEvent.pageY-e.nativeEvent.locationY};
        touch.startTouches(points(e.nativeEvent.touches),true);onInteraction();
      },
      onPanResponderStart:e=>{touch.startTouches(points(e.nativeEvent.touches));onInteraction();},
      onPanResponderMove:e=>{touch.moveTouches(points(e.nativeEvent.touches));onInteraction();},
      onPanResponderEnd:ended,onPanResponderRelease:ended,
      onPanResponderTerminationRequest:()=>true,onPanResponderTerminate:()=>{touch.cancel();onInteraction();},
      onShouldBlockNativeResponder:()=>true,
    });
  },[touch,run,onInteraction]);
  useEffect(()=>{
    touch.resize(size.width,size.height);refreshCamera(value=>value+1);
    return()=>touch.cancel();
  },[touch,size.width,size.height]);
  const view=touch.view,center=run.board.center,radius=run.board.dishRadius;
  const clip=useMemo(()=>Skia.PathBuilder.Make().addCircle(center.x,center.y,radius).detach(),[center.x,center.y,radius]);
  const selected=new Set(run.selection.path),preview=new Set(run.preview());
  const recovery=new Map<number,Point>();for(const clot of run.clots)clot.nodes.forEach((n,i)=>recovery.set(n,clot.cellPosition(i)));
  const selectionPoints=run.selection.path.map(i=>run.board.anchors[i]);
  const event=run.harvest.events.sample(run),nudge=run.nudge.target(run);
  const lessonNodes=run.lessonActive()&&[0,2].includes(run.lesson.stepIndex)?run.lesson.route():[];
  return <View style={styles.view}>
    <View style={styles.touchSurface} {...pan.panHandlers} onLayout={e=>{
      const {width,height}=e.nativeEvent.layout;touch.resize(width,height);setSize({width,height});
    }} accessibilityLabel="Petri dish. Use one finger to capture loops. Pinch with two fingers to zoom, or drag with two fingers to move the view.">
    {wanted.map(name=><TextureLoader key={name} name={name} loaded={loaded}/>)}
    {view.scale>0&&<Canvas pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Group transform={[{translateX:view.x},{translateY:view.y}]}><Group transform={[{scale:view.scale}]}>
        <Circle cx={center.x} cy={center.y} r={radius}><RadialGradient c={vec(center.x,center.y-80)} r={radius*1.25} colors={['#24535b','#12383f','#081c23']}/></Circle>
        <Circle cx={center.x} cy={center.y} r={radius} color="#527d7d" style="stroke" strokeWidth={3}/>
        <Group clip={clip}>
          {tracers.motes.slice(0,tracers.visible?tracers.visibleCount:0).map((m,i)=><Circle key={`dust${i}`} cx={m.at.x} cy={m.at.y} r={m.size*1.5} color="#a2cac4" opacity={m.depth*0.2}/>)}
          {event?.kind==='traveller'&&event.age>=0&&<Circle cx={event.position.x} cy={event.position.y} r={100} opacity={event.strength*0.15}><RadialGradient c={vec(event.position.x,event.position.y)} r={100} colors={['#99c8bf','#0d303800']}/></Circle>}
          {run.residuals.map((m,i)=><Path key={`res${i}`} path={pathFor(m.polygon,true)} color="#81c2c0" style="stroke" strokeWidth={3} opacity={m.remaining/4*0.3}/>)}
          {run.harvest.ecology.warningSites(run).map((w,i)=><Circle key={`warn${i}`} cx={w.position.x} cy={w.position.y} r={18+Math.sin(run.elapsed*3)*3} style="stroke" strokeWidth={2} color="#e7c591" opacity={0.6}/>)}
          {event?.kind==='hatching'&&event.age>=14&&event.age<22&&run.harvest.events.sites.map((p,i)=><Circle key={`hatch${i}`} cx={p.x} cy={p.y} r={18} style="stroke" strokeWidth={2} color="#ba91b8"/>)}
          {run.enemies.flatMap(body=>body.gateIds.map(id=>{
            const guard=run.enemies.find(b=>b.id===id);return guard?<Path key={`gate${body.id}:${id}`} path={pathFor([body.nucleus,guard.nucleus])} color="#cab6e8" opacity={0.45} style="stroke" strokeWidth={2}/>:null;
          }))}
          {run.enemies.map(body=>{
            const nuclei=body.nuclei(),alpha=arrivalProgress(body)*(body instanceof HarvestOrganism?body.opacity():1);
            return <Group key={`body${body.id}`}>
              {nuclei.length===2&&<Path path={pathFor(nuclei)} color="#9ab8b3" style="stroke" strokeWidth={9} opacity={alpha*0.35}/>}
              {body instanceof EcologyEnemy&&body.latched&&<Path path={pathFor([body.nucleus,run.board.anchors[body.targetNode]])} color="#c08c97" style="stroke" strokeWidth={2}/>}
              {body instanceof Amoeba&&body.phase==='reaching'&&<Path path={pathFor([body.nucleus,body.reachPoint])} color="#d2c99b" opacity={0.6} style="stroke" strokeWidth={5}/>}
              {nuclei.map((p,i)=><Group key={i}>
                <Sprite kind={body.kind} form={body.form} at={p} images={images} width={body.visitor?90:spriteMetrics(body.kind).width} opacity={alpha} angle={nuclei.length===2?Math.atan2(nuclei[1-i].y-p.y,nuclei[1-i].x-p.x):Math.atan2(body.heading.y,body.heading.x)}/>
                {preview.has(body.id)&&<Circle cx={p.x} cy={p.y} r={9} color={body.kind==='cyst'?'#df91bb':'#f1da9a'} style="stroke" strokeWidth={2.5}/>}
                {body.health>1&&<Circle cx={p.x} cy={p.y} r={13+body.health*2} color="#d5be8e" style="stroke" strokeWidth={1.5} opacity={0.6}/>}
              </Group>)}
              {body instanceof Amoeba&&body.captiveNode>=0&&<Sprite kind="cell" at={body.captivePosition()} images={images} width={45} opacity={0.6}/>}
            </Group>;
          })}
          {run.phages.clusters.map(body=><Sprite key={`phage${body.id}`} kind="phage" at={body.nucleus} images={images} opacity={arrivalProgress(body)}/>) }
          <Sprite kind={mother} at={center} images={images}/>
          {run.motherDamage.activeIndices().filter(i=>run.motherDamage.lost[i]).map(i=>{
            const p=add(center,run.motherDamage.coreOffset(i));return <Circle key={`loss${i}`} cx={p.x} cy={p.y} r={8} color="#17393e" opacity={0.8*run.motherDamage.coreProgress(i)}/>;
          })}
          {run.clots.map(clot=><Group key={`clot${clot.serial}`}>
            {clot.positions.map((_,i)=><Sprite key={i} kind={clot.preyKinds[i]??'food'} form={clot.preyForms[i]} at={clot.preyPosition(i)} images={images} opacity={Math.max(0,1-clot.progress()*2)}/>)}
            <Circle cx={clot.center.x} cy={clot.center.y} r={20+clot.nodes.length*2} color="#b6d7b0" opacity={clot.digestion()*0.18}/>
          </Group>)}
          {run.board.anchors.map((anchor,id)=>{
            const cell=run.cells[id];if(cell.lost||cell.captor>=0)return null;
            const returning=run.amoebas.returnFor(id),at=returning?run.amoebas.returnPosition(returning):recovery.get(id)??anchor;
            return <Group key={`cell${id}`}>
              <Sprite kind="cell" at={at} images={images} angle={id*2.399} opacity={run.isReady(id)?1:0.58}/>
              {selected.has(id)&&<Circle cx={at.x} cy={at.y} r={24} style="stroke" strokeWidth={3} color="#d8eee2"/>}
              {run.harvest.ecology.blocked(run,id)&&<Circle cx={at.x} cy={at.y} r={22} style="stroke" strokeWidth={3} color="#b6819c"/>}
            </Group>;
          })}
          {selectionPoints.length>=3&&run.selection.canClose()&&<Path path={pathFor(selectionPoints,true)} color="#96cfb955">
            {effect?<Shader source={effect} uniforms={{...membraneDefaults,clock:run.elapsed,strength:run.selection.closed?0.65:0.3}}/>:undefined}
          </Path>}
          {selectionPoints.length>1&&<Path path={pathFor(selectionPoints,run.selection.closed)} style="stroke" strokeWidth={3} color={run.selection.motherBlocked()?'#e3949a':'#c6e9d7'}/>}
          {nudge&&<Path path={pathFor([nudge.nucleus,add(nudge.nucleus,run.nudge.displacement(run))])} style="stroke" strokeWidth={3} color="#c8a5d0"/>}
        </Group>
      </Group></Group>
    </Canvas>}
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {lessonNodes.map((id,i)=>{const at=toScreen(run.board.anchors[id],view);return <Text key={id} style={[styles.number,{left:at.x-10,top:at.y-10}]}>{i+1}</Text>;})}
    </View>
    </View>
    <View style={styles.cameraControls}>
      <Pressable accessibilityRole="button" accessibilityLabel="Zoom in on the petri dish" disabled={touch.zoom>=MAX_BOARD_ZOOM-0.001}
        accessibilityState={{disabled:touch.zoom>=MAX_BOARD_ZOOM-0.001}} onPress={()=>{touch.zoomBy(1.3);onInteraction();}}
        style={({pressed})=>[styles.cameraButton,(pressed||touch.zoom>=MAX_BOARD_ZOOM-0.001)&&styles.dim]}><Text style={styles.zoomText}>+</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Zoom out on the petri dish" disabled={touch.zoom<=1.001}
        accessibilityState={{disabled:touch.zoom<=1.001}} onPress={()=>{touch.zoomBy(1/1.3);onInteraction();}}
        style={({pressed})=>[styles.cameraButton,(pressed||touch.zoom<=1.001)&&styles.dim]}><Text style={styles.zoomText}>−</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Fit the whole petri dish" onPress={()=>{touch.resetView();onInteraction();}}
        style={({pressed})=>[styles.cameraButton,pressed&&styles.dim]}><Text style={styles.fitText}>Fit</Text></Pressable>
    </View>
  </View>;
}
const styles=StyleSheet.create({view:{flex:1,minWidth:0,overflow:'hidden'},
  touchSurface:{position:'absolute',left:0,top:0,bottom:0,right:52,overflow:'hidden'},cameraControls:{position:'absolute',right:4,top:4,gap:4},cameraButton:{width:44,height:44,borderRadius:10,backgroundColor:'#112b30e8',borderColor:'#34585e',borderWidth:1,alignItems:'center',justifyContent:'center'},
  zoomText:{fontSize:24,color:'#e0eee0',lineHeight:28},fitText:{fontSize:12,fontWeight:'600',color:'#e0eee0'},dim:{opacity:0.45},number:{position:'absolute',width:20,height:20,borderRadius:10,backgroundColor:'#e2edda',color:'#153438',fontWeight:'700',fontSize:12,lineHeight:20,textAlign:'center'}});
