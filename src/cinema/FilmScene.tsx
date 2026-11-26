import React,{useCallback,useEffect,useMemo,useState} from 'react';
import {StyleSheet,View} from 'react-native';
import {Canvas,Circle,Group,Image,Path,RadialGradient,Skia,useImage,vec} from '@shopify/react-native-skia';
import type {SkImage} from '@shopify/react-native-skia';
import type {Point} from '../geometry/loopGeometry';
import type {CreatureFilmStage} from './creatureFilmStage';
import {organismTextures,spriteMetrics,textureKey} from '../rendering/organismTextures';
import type {TextureKey} from '../rendering/organismTextures';
import {HarvestOrganism} from '../ecology/harvestOrganism';
import {EcologyEnemy} from '../ecology/ecologyEnemy';
import {Amoeba} from '../ecology/amoeba';
import {Bacterium} from '../ecology/bacterium';
import {arrivalProgress} from '../ecology/organismArrival';
import {smooth} from '../ecology/drifter';
import {AmoebaSpecimen,PhageSwarm} from '../rendering/specializedSpecimens';
import {livingTissueShader} from '../rendering/shaders/livingTissue';
import {sceneTissue} from '../rendering/tissueUniforms';
import {missionAppearance} from '../rendering/missionAppearance';

type Images=Partial<Record<TextureKey,SkImage>>;
const line=(points:readonly Point[],close=false)=>points.length?`M ${points.map(p=>`${p.x} ${p.y}`).join(' L ')}${close?' Z':''}`:'';
function TextureLoader({name,loaded}:{name:TextureKey;loaded:(name:TextureKey,image:SkImage|null)=>void}){
  const image=useImage(organismTextures[name]);
  useEffect(()=>{if(image)loaded(name,image);return()=>loaded(name,null);},[image,loaded,name]);return null;
}
function Sprite({kind,form='',at,images,opacity=1,angle=0,width}:{kind:string;form?:string;at:Point;images:Images;opacity?:number;angle?:number;width?:number}){
  const texture=images[textureKey(kind,form)],metric=spriteMetrics(kind,form),w=width??metric.width,h=texture?w*texture.height()/texture.width():w;
  return <Group opacity={opacity} origin={vec(at.x,at.y)} transform={[{rotate:angle}]}>
    {texture?<Image image={texture} x={at.x-w*metric.uv.x} y={at.y-h*metric.uv.y} width={w} height={h} fit="fill"/>:<Circle cx={at.x} cy={at.y} r={w*0.25} color="#b7c4a3"/>}
  </Group>;
}
/** Cinema-only camera and renderer. No active-dish touch handlers are attached. */
export function FilmScene({film,highContrast=false}:{film:CreatureFilmStage;highContrast?:boolean}){
  const [size,setSize]=useState({width:0,height:0}),[images,setImages]=useState<Images>({});
  const loaded=useCallback((name:TextureKey,image:SkImage|null)=>setImages(previous=>{
    if((previous[name]??null)===image)return previous;const next={...previous};if(image)next[name]=image;else delete next[name];return next;
  }),[]);
  const tissueEffect=useMemo(()=>{try{return Skia.RuntimeEffect.Make(livingTissueShader);}catch{return null;}},[]);
  const look=useMemo(()=>missionAppearance(film.run.runSeed,film.run.stageIndex),[film]);
  const tissue=sceneTissue(film.run,look,film.reducedMotion);
  const run=film.run,mother=`mother${run.maxIntegrity}` as TextureKey,center=run.board.center;
  const wanted=[...new Set<TextureKey>(['cell',mother,...run.enemies.map(b=>textureKey(b.kind,b.form)),...(run.phages.clusters.length||run.phages.bursts.length?['phage' as const]:[]),...run.clots.flatMap(c=>c.preyKinds.map((kind,i)=>textureKey(kind,c.preyForms[i])))])];
  const clip=useMemo(()=>Skia.PathBuilder.Make().addCircle(center.x,center.y,run.board.dishRadius).detach(),[center.x,center.y,run.board.dishRadius]);
  const cameraScale=Math.min(size.width/1280,size.height/900)*film.zoom*(film.reducedMotion?1:1+0.04*smooth(0,film.duration,film.elapsed));
  const selected=new Set(run.selection.path),selection=run.selection.path.map(id=>run.board.anchors[id]);
  const recovery=new Map<number,Point>();for(const clot of run.clots)clot.nodes.forEach((n,i)=>recovery.set(n,clot.cellPosition(i)));
  return <View style={styles.scene} onLayout={event=>setSize(event.nativeEvent.layout)} accessible accessibilityLabel={`Live demonstration. ${film.cue}`}>
    {wanted.map(name=><TextureLoader key={name} name={name} loaded={loaded}/>)}
    {cameraScale>0&&<Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Group transform={[{translateX:size.width/2-film.focus.x*cameraScale},{translateY:size.height/2-film.focus.y*cameraScale}]}><Group transform={[{scale:cameraScale}]}>
        <Circle cx={center.x} cy={center.y} r={run.board.dishRadius}><RadialGradient c={vec(center.x,center.y-80)} r={run.board.dishRadius*1.25} colors={['#24535b','#12383f','#081c23']}/></Circle>
        <Group clip={clip}>
          {run.residuals.map((residual,i)=><Path key={`residual${i}`} path={line(residual.polygon,true)} style="stroke" strokeWidth={3} color="#9bcab5" opacity={residual.remaining/4*0.3}/>)}
          {run.enemies.flatMap(body=>body.gateIds.map(id=>{const guard=run.enemies.find(b=>b.id===id);return guard?<Path key={`gate${body.id}:${id}`} path={line([body.nucleus,guard.nucleus])} style="stroke" strokeWidth={2} color="#cab6e8" opacity={0.5}/>:null;}))}
          {run.enemies.map(body=>{
            if(body instanceof Amoeba)return <AmoebaSpecimen key={`body${body.id}`} body={body} clock={film.elapsed} motion={film.reducedMotion?0:1} images={images} tissueEffect={tissueEffect} uniforms={tissue}/>;
            const nuclei=body.nuclei(),opacity=arrivalProgress(body)*(body instanceof HarvestOrganism?body.opacity():1);
            return <Group key={`body${body.id}`}>
              {nuclei.length===2&&<Path path={line(nuclei)} color="#9ab8b3" style="stroke" strokeWidth={9} opacity={opacity*0.4}/>}
              {body instanceof EcologyEnemy&&body.latched&&<Path path={line([body.nucleus,run.board.anchors[body.targetNode]])} color="#d39eaf" style="stroke" strokeWidth={2}/>}
              {nuclei.map((at,i)=><Group key={i}>
                <Sprite kind={body.kind} form={body.form} at={at} images={images} width={body.visitor?90:spriteMetrics(body.kind).width} opacity={opacity} angle={nuclei.length===2?Math.atan2(nuclei[1-i].y-at.y,nuclei[1-i].x-at.x):Math.atan2(body.heading.y,body.heading.x)}/>
                {body.health>1&&<Circle cx={at.x} cy={at.y} r={13+body.health*2} style="stroke" strokeWidth={1.4} color="#d5be8e" opacity={0.6}/>}
                {body instanceof Bacterium&&body.infectionAge>=0&&<Circle cx={at.x} cy={at.y} r={18+body.infectionAge} style="stroke" strokeWidth={1} color="#c4e3df" opacity={0.6}/>}
              </Group>)}
            </Group>;
          })}
          <PhageSwarm run={run} clock={film.elapsed} motion={film.reducedMotion?0:1} image={images.phage}/>
          <Sprite kind={mother} at={center} images={images}/>
          {run.clots.map(clot=><Group key={`clot${clot.serial}`}>
            {clot.positions.map((_,i)=><Sprite key={i} kind={clot.preyKinds[i]??'food'} form={clot.preyForms[i]} at={clot.preyPosition(i)} images={images} opacity={Math.max(0,1-clot.progress()*2)}/>)}
            <Circle cx={clot.center.x} cy={clot.center.y} r={20+clot.nodes.length*2} color="#b6d7b0" opacity={clot.digestion()*0.18}/>
          </Group>)}
          {run.board.anchors.map((anchor,id)=>{
            const cell=run.cells[id];if(cell.lost||cell.captor>=0)return null;
            const returning=run.amoebas.returnFor(id),at=returning?run.amoebas.returnPosition(returning):recovery.get(id)??anchor;
            return <Group key={`cell${id}`}>
              <Sprite kind="cell" at={at} images={images} angle={id*2.399} opacity={run.isReady(id)?1:0.55}/>
              {selected.has(id)&&<Circle cx={at.x} cy={at.y} r={24} style="stroke" strokeWidth={3} color="#d8eee2"/>}
              {run.harvest.ecology.blocked(run,id)&&<Circle cx={at.x} cy={at.y} r={22} style="stroke" strokeWidth={3} color="#c292ad"/>}
            </Group>;
          })}
          {selection.length>=3&&run.selection.canClose()&&<Path path={line(selection,true)} color="#96cfb933"/>}
          {selection.length>1&&<Path path={line(selection,run.selection.closed)} color={highContrast?'#ffffff':'#d9f7e8'} style="stroke" strokeWidth={highContrast?4.5:3}/>}
          {film.pointerVisible&&<><Circle cx={film.pointer.x} cy={film.pointer.y} r={7} color="#f5f5dd"/><Circle cx={film.pointer.x} cy={film.pointer.y} r={12} style="stroke" strokeWidth={1.5} color="#f5f5dd"/></>}
        </Group>
      </Group></Group>
    </Canvas>}
  </View>;
}
const styles=StyleSheet.create({scene:{flex:1,minHeight:100,overflow:'hidden',backgroundColor:'#0b2830',borderRadius:14}});
