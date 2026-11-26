import React,{useCallback,useEffect,useMemo,useState} from 'react';
import {PanResponder,Pressable,StyleSheet,Text,View} from 'react-native';
import type {GestureResponderEvent,NativeTouchEvent} from 'react-native';
import {AlphaType,Canvas,Circle,ColorType,FilterMode,Group,ImageShader,Paint,Path,Points,RadialGradient,Rect,RuntimeShader,Shader,Skia,useImage,vec} from '@shopify/react-native-skia';
import type {SkImage} from '@shopify/react-native-skia';
import type {EncounterSimulation} from '../engine/encounterSimulation';
import type {TouchController} from '../mobile/touchController';
import {MAX_BOARD_ZOOM,toBoard,toScreen} from '../mobile/boardViewport';
import type {Point} from '../geometry/loopGeometry';
import {Amoeba} from '../ecology/amoeba';
import {EcologyEnemy} from '../ecology/ecologyEnemy';
import {HarvestOrganism} from '../ecology/harvestOrganism';
import {arrivalProgress} from '../ecology/organismArrival';
import {add,smooth} from '../ecology/drifter';
import {motherTextureKey,organismTextures,spriteMetrics,textureKey} from './organismTextures';
import type {TextureKey} from './organismTextures';
import type {WaterTracers} from './waterTracers';
import {WaterInteraction} from './waterInteraction';
import {membraneDefaults,membraneShader} from './shaders/membrane';
import {livingTissueShader} from './shaders/livingTissue';
import {livingBridgeShader} from './shaders/livingBridge';
import {fusedTissueShader} from './shaders/fusedTissue';
import {microscopeFieldShader} from './shaders/microscopeField';
import {lensOpticsShader} from './shaders/lensOptics';
import {LivingSprite as Sprite,LivingBridge,FusedClot} from './livingSpecimens';
import {sceneTissue,bodyPose,bodyTissue,motherTissue} from './tissueUniforms';
import {missionAppearance} from './missionAppearance';
import {anatomyRecipe} from '../evolution/motherAppearance';
import {AmoebaSpecimen,PhageSwarm} from './specializedSpecimens';
import {HarvestFlow} from './HarvestFlow';
import {GameFeelLayer} from './GameFeelLayer';
import type {GameFeel} from './gameFeel';
import {MotherInjuries} from './MotherInjuries';
import {motherAlert} from '../mobile/gameGuidance';
import {PondAmbient} from './PondAmbient';
import {appendTissueMotion} from './tissueMotion';
import type {MotionBatch} from './tissueMotion';

type Images=Partial<Record<TextureKey,SkImage>>;
const pathFor=(points:readonly Point[],closed=false)=>points.length?`M ${points.map(p=>`${p.x} ${p.y}`).join(' L ')}${closed?' Z':''}`:'';
function TextureLoader({name,loaded}:{name:TextureKey;loaded:(name:TextureKey,image:SkImage|null)=>void}){
  const image=useImage(organismTextures[name]);
  useEffect(()=>{if(image)loaded(name,image);return()=>loaded(name,null);},[image,loaded,name]);return null;
}
export function EncounterView({run,touch,tracers,onInteraction,reducedMotion=false,highContrast=false,visualQuality=2,children,feel}:{run:EncounterSimulation;touch:TouchController;tracers:WaterTracers;onInteraction:()=>void;reducedMotion?:boolean;highContrast?:boolean;visualQuality?:0|1|2;children?:React.ReactNode;feel?:GameFeel}){
  const [size,setSize]=useState({width:0,height:0}),[,refreshCamera]=useState(0),[images,setImages]=useState<Images>({});
  const loaded=useCallback((name:TextureKey,image:SkImage|null)=>setImages(previous=>{
    if((previous[name]??null)===image)return previous;const next={...previous};if(image)next[name]=image;else delete next[name];return next;
  }),[]);
  const water=useMemo(()=>new WaterInteraction(),[run]);
  const wake=water.sample(run.elapsed,reducedMotion);
  const mother=motherTextureKey(run.maxIntegrity,run.mutations);
  const look=useMemo(()=>missionAppearance(run.runSeed,run.stageIndex,run.habitatChoice),[run.runSeed,run.stageIndex,run.habitatChoice]);
  const plateKey=`plate${look.biome}` as TextureKey;
  const effects=useMemo(()=>Object.fromEntries(Object.entries({tissue:livingTissueShader,bridge:livingBridgeShader,fused:fusedTissueShader,field:microscopeFieldShader,lens:lensOpticsShader}).map(([key,source])=>{try{return [key,Skia.RuntimeEffect.Make(source)];}catch{return [key,null];}})),[]);
  const clock=reducedMotion?0:run.elapsed,motion=reducedMotion?0:1;
  const alert=motherAlert(run);
  const common=sceneTissue(run,look,reducedMotion),recipe=anatomyRecipe(run.mutations);
  const cellUniforms={...common,kind:0,evolution_form:recipe.form,evolution_organs:recipe.organs,traits:recipe.traits,adaptations:recipe.adaptations,evolution_layers:recipe.layers,growth_front:recipe.growthFront,growth_pulse:recipe.growthPulse};
  const tissueEffect=visualQuality>0?effects.tissue:null;
  const flowImage=useMemo(()=>{
    if(reducedMotion)return null;
    const pixels=run.fluid.flowTextureData();for(let i=3;i<pixels.length;i+=4)pixels[i]=1;
    try{return Skia.Image.MakeImage({width:28,height:28,colorType:ColorType.RGBA_F32,alphaType:AlphaType.Opaque},Skia.Data.fromBytes(new Uint8Array(pixels.buffer)),28*16);}catch{return null;}
  },[run,run.fluid.revision,reducedMotion]);
  useEffect(()=>()=>{flowImage?.dispose();},[flowImage]);
  const pushAge=6-run.nudge.cooldown,pushImpulse=run.nudge.cooldown>0&&pushAge<1.7&&Math.hypot(run.nudge.rippleVector.x,run.nudge.rippleVector.y)>0?[run.nudge.rippleOrigin.x,run.nudge.rippleOrigin.y,pushAge,Math.sin(pushAge/1.7*Math.PI)*.55]:[];
  const impulses=[...pushImpulse,...run.clots.slice(0,pushImpulse.length?2:3).flatMap(c=>[c.center.x,c.center.y,c.progress()*3,Math.sin(c.progress()*Math.PI)*.8])];
  for(const bite of run.motherDamage.bites){if(impulses.length>=16)break;impulses.push(bite.origin.x,bite.origin.y,bite.age,Math.sin(Math.min(bite.age/2.2,1)*Math.PI)*.65);}
  while(impulses.length<16)impulses.push(0);
  const currents=run.fluid.sources.slice(0,4).flatMap(c=>[c.x,c.y,c.radial,c.curl]);while(currents.length<16)currents.push(0);
  const fieldImage=images[plateKey],fluidChild=flowImage??fieldImage;
  const fieldUniforms={clock,motion,detail:highContrast?0:visualQuality,dish:look.biome,water_grade:look.waterGrade,water_base:look.waterBase.slice(),plate_turn:look.plateTurn,plate_scale:look.plateScale,plate_offset:look.plateOffset,light_direction:look.lightDirection,sediment:highContrast?look.sediment*.45:look.sediment,impulses,currents,strokes:wake.strokes.flat(),stroke_strengths:Array.from(wake.strengths),fluid_enabled:flowImage?1:0,plateSize:[fieldImage?.width()??1,fieldImage?.height()??1]};
  const fieldChildren=<><ImageShader image={fluidChild??null} fit="none" tx="clamp" ty="clamp" sampling={{filter:FilterMode.Linear}}/><ImageShader image={fieldImage??null} fit="none" tx="clamp" ty="clamp"/></>;
  const wanted=[...new Set<TextureKey>(['cell',mother,plateKey,'pondLife',...run.motherDamage.bites.map(b=>textureKey(b.kind,b.form)),...run.enemies.map(b=>textureKey(b.kind,b.form)),...(run.phages.clusters.length||run.phages.bursts.length?['phage' as const]:[]),...run.clots.flatMap(c=>c.positions.map((_,i)=>textureKey(c.preyKinds[i]??'food',c.preyForms[i])))])];
  const effect=useMemo(()=>{try{return Skia.RuntimeEffect.Make(membraneShader);}catch{return null;}},[]);
  const pan=useMemo(()=>{
    // The touch surface has no interactive children. Fix its page-space origin
    // at grant, then map every finger from page coordinates into that one basis.
    // A second finger's native locationX can otherwise refer to a different target.
    let origin={x:0,y:0},previous:Point|undefined;
    const points=(touches:readonly NativeTouchEvent[])=>touches.map(p=>({id:p.identifier,x:p.pageX-origin.x,y:p.pageY-origin.y}));
    const ended=(event:GestureResponderEvent)=>{previous=undefined;touch.endTouches(points(event.nativeEvent.touches),points(event.nativeEvent.changedTouches));onInteraction();};
    return PanResponder.create({
      onStartShouldSetPanResponder:()=>run.state==='active',onMoveShouldSetPanResponder:()=>false,
      onPanResponderGrant:e=>{
        origin={x:e.nativeEvent.pageX-e.nativeEvent.locationX,y:e.nativeEvent.pageY-e.nativeEvent.locationY};
        touch.startTouches(points(e.nativeEvent.touches),true);const first=points(e.nativeEvent.touches)[0];previous=first?toBoard(first,touch.view)??undefined:undefined;onInteraction();
      },
      onPanResponderStart:e=>{touch.startTouches(points(e.nativeEvent.touches));onInteraction();},
      onPanResponderMove:e=>{const current=points(e.nativeEvent.touches);touch.moveTouches(current);const at=current.length===1?toBoard(current[0],touch.view):undefined;if(at&&previous&&run.selection.active&&!reducedMotion)water.stroke(previous,at,run.elapsed);previous=at??undefined;onInteraction();},
      onPanResponderEnd:ended,onPanResponderRelease:ended,
      onPanResponderTerminationRequest:()=>true,onPanResponderTerminate:()=>{previous=undefined;touch.cancel();onInteraction();},
      onShouldBlockNativeResponder:()=>true,
    });
  },[touch,run,onInteraction,reducedMotion,water]);
  useEffect(()=>{
    touch.resize(size.width,size.height);refreshCamera(value=>value+1);
    return()=>touch.cancel();
  },[touch,size.width,size.height]);
  const view=touch.view,center=run.board.center,radius=run.board.dishRadius;
  const clip=useMemo(()=>Skia.PathBuilder.Make().addCircle(center.x,center.y,radius).detach(),[center.x,center.y,radius]);
  const selected=new Set(run.selection.path),preview=new Set(run.preview());
  const recovery=new Map<number,Point>();for(const clot of run.clots)clot.nodes.forEach((n,i)=>recovery.set(n,clot.cellPosition(i,reducedMotion)));
  const dustBuckets=new Map<string,{points:Point[];path:string;size:number;opacity:number;color:string}>();
  for(const mote of tracers.motes.slice(0,!reducedMotion&&tracers.visible?Math.min(tracers.visibleCount,[240,560,960][visualQuality]):0)){
    const speed=Math.min(60,Math.hypot(mote.velocity.x,mote.velocity.y)),glint=mote.glints?Math.max(0,Math.sin(clock*mote.rate+mote.phase))**24:0;
    const size=Math.max(.5,Math.round(mote.size*2*4)/4),opacity=Math.round((.43+glint*.55+smooth(5,24,speed)*.18)*mote.depth*8)/8,color=glint>.5?'#f0fafa':'#c2e3f0',key=`${size}:${opacity}:${color}`;
    let bucket=dustBuckets.get(key);if(!bucket){bucket={points:[],path:'',size,opacity,color};dustBuckets.set(key,bucket);}bucket.points.push(mote.at);
    const tail=Math.min(2.5,speed*.055),length=Math.hypot(mote.velocity.x,mote.velocity.y),tailKey=`tail:${Math.round(opacity*4)/4}`;
    let trail=dustBuckets.get(tailKey);if(!trail){trail={points:[],path:'',size:.5,opacity:Math.round(opacity*4)/4*.2,color};dustBuckets.set(tailKey,trail);}
    if(length>0)trail.path+=`M${mote.at.x},${mote.at.y}L${mote.at.x-mote.velocity.x/length*tail},${mote.at.y-mote.velocity.y/length*tail}`;
  }
  const tissueMotion:MotionBatch=new Map();
  if(visualQuality===2&&!reducedMotion&&!highContrast){
    appendTissueMotion(tissueMotion,center,120,0,{...common,...motherTissue(run,false)});
    for(const body of run.enemies){if(body.isBoss()||['amoeba','bacterium'].includes(body.kind))continue;
      body.nuclei().forEach((at,i)=>{const pose=bodyPose(body,center,clock,false,i),uniforms={...common,...bodyTissue(body,false),phase:body.id*.8+i*1.3};
        appendTissueMotion(tissueMotion,at,(body.visitor?90:spriteMetrics(body.kind).width)*pose.scaleX,pose.angle,uniforms,smooth(.2,1,arrivalProgress(body))*(body instanceof HarvestOrganism?body.opacity():1));});
    }
    run.board.anchors.forEach((anchor,id)=>{const cell=run.cells[id];if(cell.lost||cell.captor>=0)return;
      const clot=run.clots.find(c=>c.nodes.includes(id)),opacity=clot?1-smooth(.24,.82,clot.amount()):1;
      appendTissueMotion(tissueMotion,recovery.get(id)??anchor,63,id*2.399,{...cellUniforms,phase:id*.8,phenotype:look.cells[id%24],energy:run.isReady(id)?1:.55},opacity);
    });
  }
  const selectionPoints=run.selection.path.map(i=>run.board.anchors[i]);
  const event=run.harvest.events.sample(run),nudge=run.nudge.target(run);
  const lessonNodes=run.lessonActive()&&[0,2].includes(run.lesson.stepIndex)?run.lesson.route():[];
  return <View style={styles.view}>
    <View style={styles.touchSurface} {...pan.panHandlers} onLayout={e=>{
      const {width,height}=e.nativeEvent.layout;touch.resize(width,height);setSize({width,height});
    }} accessibilityLabel="Petri dish. Use one finger to capture loops. Pinch with two fingers to zoom, or drag with two fingers to move the view.">
    {wanted.map(name=><TextureLoader key={name} name={name} loaded={loaded}/>)}
    {view.scale>0&&<Canvas pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Group layer={visualQuality===2&&!highContrast&&effects.lens?<Paint><RuntimeShader source={effects.lens} uniforms={{lens_center:[view.x+center.x*view.scale,view.y+center.y*view.scale],lens_radius:radius*view.scale,aberration:1,bloom:.7,softness:1,defocus:run.state==='paused'||run.state==='brief'?1:0,grain:1,saturation:run.state==='loss'?.65:1,exposure:1}}/></Paint>:undefined}>
      <Group transform={[{translateX:view.x},{translateY:view.y}]}><Group transform={[{scale:view.scale}]}>
        {fieldImage&&fluidChild&&effects.field?<Rect x={center.x-radius*1.14} y={center.y-radius*1.14} width={radius*2.28} height={radius*2.28}><Shader source={effects.field} uniforms={fieldUniforms}>{fieldChildren}</Shader></Rect>:<Circle cx={center.x} cy={center.y} r={radius}><RadialGradient c={vec(center.x,center.y-80)} r={radius*1.25} colors={['#24535b','#12383f','#081c23']}/></Circle>}
        <Circle cx={center.x} cy={center.y} r={radius} color="#527d7d" style="stroke" strokeWidth={highContrast?2:0.4}/>
        <Group clip={clip}>
          {!highContrast&&fieldImage&&fluidChild&&<PondAmbient look={look} clock={clock} motion={motion} quality={visualQuality} fluid={run.fluid} image={images.pondLife} fieldEffect={effects.field} fieldUniforms={fieldUniforms} fieldChildren={fieldChildren} traveller={event?.kind==='traveller'&&event.age>=0?{position:event.position,strength:event.strength}:undefined}/>}
          {[...dustBuckets].map(([key,b])=><Group key={`dust${key}`} opacity={b.opacity}>
            {b.points.length>0&&<Points points={b.points} mode="points" strokeWidth={b.size} strokeCap="round" color={b.color}/>}
            {b.path.length>0&&<Path path={b.path} strokeWidth={b.size} style="stroke" color={b.color}/>}
          </Group>)}
          {run.residuals.map((m,i)=><Path key={`res${i}`} path={pathFor(m.polygon,true)} color="#81c2c0" style="stroke" strokeWidth={3} opacity={m.remaining/4*0.3}/>)}
          {run.harvest.ecology.warningSites(run).map((w,i)=><Circle key={`warn${i}`} cx={w.position.x} cy={w.position.y} r={18+Math.sin(clock*3)*3} style="stroke" strokeWidth={2} color="#e7c591" opacity={0.6}/>)}
          {event?.kind==='hatching'&&event.age>=14&&event.age<22&&run.harvest.events.sites.map((p,i)=><Circle key={`hatch${i}`} cx={p.x} cy={p.y} r={18} style="stroke" strokeWidth={2} color="#ba91b8"/>)}
          {run.enemies.flatMap(body=>body.gateIds.map(id=>{
            const guard=run.enemies.find(b=>b.id===id);return guard?<Path key={`gate${body.id}:${id}`} path={pathFor([body.nucleus,guard.nucleus])} color="#cab6e8" opacity={0.45} style="stroke" strokeWidth={2}/>:null;
          }))}
          {run.enemies.map(body=>{
            if(body instanceof Amoeba)return <AmoebaSpecimen key={`body${body.id}`} body={body} clock={clock} motion={motion} images={images} tissueEffect={tissueEffect} uniforms={common}/>;
            const poses=body.nuclei().map((_,i)=>bodyPose(body,center,clock,reducedMotion,i));
            const nuclei=body.nuclei(),alpha=(tissueEffect?1:arrivalProgress(body))*(body instanceof HarvestOrganism?body.opacity():1),uniforms={...common,...bodyTissue(body,reducedMotion),arrival:arrivalProgress(body)};
            return <Group key={`body${body.id}`}>
              {nuclei.length===2&&<LivingBridge first={nuclei[0]} second={nuclei[1]} image={images[textureKey(body.kind,body.form)]} effect={visualQuality>0?effects.bridge:null} clock={clock} motion={motion} width={body.isBoss()?18:6} boss={body.isBoss()} opacity={alpha}/>}
              {body instanceof EcologyEnemy&&body.latched&&<Path path={pathFor([body.nucleus,run.board.anchors[body.targetNode]])} color="#c08c97" style="stroke" strokeWidth={2}/>}
              {nuclei.map((p,i)=><Group key={i}>
                <Sprite effect={tissueEffect} uniforms={{...uniforms,phase:body.id*.8+i*1.3}} kind={body.kind} form={body.form} at={p} images={images} width={(body.visitor?90:spriteMetrics(body.kind).width)*poses[i].scaleX} scaleY={poses[i].scaleY/poses[i].scaleX} opacity={alpha} angle={poses[i].angle}/>
                {preview.has(body.id)&&<Circle cx={p.x} cy={p.y} r={9} color={body.kind==='cyst'?'#df91bb':'#f1da9a'} style="stroke" strokeWidth={2.5}/>}
                {body.health>1&&<Circle cx={p.x} cy={p.y} r={13+body.health*2} color="#d5be8e" style="stroke" strokeWidth={1.5} opacity={0.6}/>}
              </Group>)}
            </Group>;
          })}
          <PhageSwarm run={run} clock={clock} motion={motion} image={images.phage}/>
          <Sprite effect={tissueEffect} uniforms={{...common,...motherTissue(run,reducedMotion),threat_direction:[alert.direction.x,alert.direction.y],threat_strength:alert.strength,nourishment:Math.min(1,run.harvest.nourishment/Math.max(1,run.harvest.spec.food))}} kind={mother} at={center} images={images}/>
          {!tissueEffect&&run.motherDamage.activeIndices().filter(i=>run.motherDamage.lost[i]).map(i=>{
            const p=add(center,run.motherDamage.coreOffset(i));return <Circle key={`loss${i}`} cx={p.x} cy={p.y} r={8} color="#17393e" opacity={0.8*run.motherDamage.coreProgress(i)}/>;
          })}
          <MotherInjuries run={run} images={images} effect={tissueEffect} bridgeEffect={effects.bridge} uniforms={common} reducedMotion={reducedMotion}/>
          {run.clots.map(clot=><Group key={`clot${clot.serial}`}>
            {!reducedMotion&&visualQuality>0&&<FusedClot clot={clot} image={images.cell} effect={effects.fused} uniforms={common}/>}
            {clot.positions.map((_,i)=><Sprite effect={tissueEffect} uniforms={{...common,kind:2,warmth:1,dissolve:smooth(.27,.58,clot.progress())}} key={i} kind={clot.preyKinds[i]??'food'} form={clot.preyForms[i]} at={clot.preyPosition(i,reducedMotion)} images={images} opacity={tissueEffect?1:Math.max(0,1-clot.progress()*2)}/>)}
            <Circle cx={clot.center.x} cy={clot.center.y} r={20+clot.nodes.length*2} color="#b6d7b0" opacity={clot.digestion()*0.18}/>
          </Group>)}
          {run.board.anchors.map((anchor,id)=>{
            const cell=run.cells[id];if(cell.lost||cell.captor>=0)return null;
            const clot=run.clots.find(c=>c.nodes.includes(id)),fusionOpacity=reducedMotion?1:clot?1-smooth(.24,.82,clot.amount()):1;
            const returning=run.amoebas.returnFor(id),at=returning?run.amoebas.returnPosition(returning,reducedMotion):recovery.get(id)??anchor;
            return <Group key={`cell${id}`}>
              <Sprite effect={tissueEffect} uniforms={{...cellUniforms,phase:id*.8,phenotype:look.cells[id%24],energy:run.isReady(id)?1:.55,selected:selected.has(id)?1:0}} kind="cell" at={at} images={images} angle={id*2.399} opacity={fusionOpacity}/>
              {recipe.traits[0]>0&&run.isReady(id)&&<Sprite effect={tissueEffect} uniforms={{...common,kind:0,energy:.75,phase:id*.8}} kind="cell" at={{x:at.x+Math.cos(id*2.399+.4)*32,y:at.y+Math.sin(id*2.399+.4)*32}} width={27*recipe.traits[0]} images={images} opacity={recipe.traits[0]}/>}
              {selected.has(id)&&<Circle cx={at.x} cy={at.y} r={24} style="stroke" strokeWidth={3} color="#d8eee2"/>}
              {run.harvest.ecology.blocked(run,id)&&<Circle cx={at.x} cy={at.y} r={22} style="stroke" strokeWidth={3} color="#b6819c"/>}
            </Group>;
          })}
          {selectionPoints.length>=3&&run.selection.canClose()&&<Path path={pathFor(selectionPoints,true)} color="#96cfb955">
            {effect?<Shader source={effect} uniforms={{...membraneDefaults,clock,motion,strength:run.selection.closed?0.65:0.3}}/>:undefined}
          </Path>}
          {selectionPoints.length>1&&<Path path={pathFor(selectionPoints,run.selection.closed)} style="stroke" strokeWidth={highContrast?4.5:3} color={run.selection.motherBlocked()?'#e3949a':'#c6e9d7'}/>}
          {nudge&&<Path path={pathFor([nudge.nucleus,add(nudge.nucleus,run.nudge.displacement(run))])} style="stroke" strokeWidth={3} color="#c8a5d0"/>}
          <HarvestFlow clots={run.clots} target={center} reducedMotion={reducedMotion}/>
          {[...tissueMotion].map(([key,b])=><Group key={`motion${key}`} opacity={b.opacity}>
            {b.path.length>0&&<Path path={b.path} style="stroke" strokeWidth={b.width} color={b.color}/>}
            {b.points.length>0&&<Points points={b.points} mode="points" strokeCap="round" strokeWidth={b.width} color={b.color}/>}
          </Group>)}
          {feel&&<GameFeelLayer feel={feel} run={run}/>}
          {children}
        </Group>
      </Group></Group>
      </Group>
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
