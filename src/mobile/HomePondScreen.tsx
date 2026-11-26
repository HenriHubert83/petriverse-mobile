import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {AppPressable as Pressable,AppText as Text,useAppearance} from './AccessibleText';
import {AppState,KeyboardAvoidingView,Modal,Platform,ScrollView,StyleSheet,TextInput,View} from 'react-native';
import {Canvas,Circle,Group,Image,RadialGradient,Skia,useImage,vec} from '@shopify/react-native-skia';
import type {SkImage} from '@shopify/react-native-skia';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import type {JourneyProfile} from '../storage/journeyProfile';
import {renameResident,residentHabit,residentLabel,residentMaturity,residentOrigin,residentRelationship,welcomeResidents} from '../storage/journeyProfile';
import {buildHomePond,HomePondClock,POND_PAGE_SIZE,sampleHomePond} from '../pond/homePond';
import type {HomePondFrame} from '../pond/homePond';
import {capacityForStage} from '../campaign/journeyPlan';
import {KEEPSAKES} from '../campaign/journeyMastery';
import type {Feat} from '../campaign/journeyMastery';
import {formDefinition} from '../content/creatureCatalogue';
import {motherTextureKey,organismTextures,spriteMetrics,textureKey} from '../rendering/organismTextures';
import type {TextureKey} from '../rendering/organismTextures';
import {LivingSprite} from '../rendering/livingSpecimens';
import {livingTissueShader} from '../rendering/shaders/livingTissue';
import {tissueDefaults} from '../rendering/tissueUniforms';
import {CollectionButton,CollectionHeader,CollectionSaveNotice,collectionStyles as shared} from './CollectionScreen';

export interface HomePondScreenProps {
  profile:JourneyProfile;onBack:()=>void;onProfileChange:(updater:(profile:JourneyProfile)=>JourneyProfile)=>void;
  readOnly?:boolean;saving?:boolean;error?:string;onRetrySave?:()=>void;reducedMotion?:boolean;onJournal?:()=>void;
}
const GARDEN_HINTS:Record<Feat,string>={
  guardian:'Rescue a spore with a nearby hunter in one clean loop to grow a pearl nursery.',
  gatherer:'Gather 4 food from two blooms in one clean loop to grow a fern meadow.',
  clear_water:'Finish an encounter without poison damage to grow a glass garden.',
};
type Images=Partial<Record<TextureKey,SkImage>>;
function PondTexture({name,onLoad}:{name:TextureKey;onLoad:(name:TextureKey,image:SkImage|null)=>void}){
  const image=useImage(organismTextures[name]);
  useEffect(()=>{if(image)onLoad(name,image);return()=>onLoad(name,null);},[image,name,onLoad]);return null;
}
function PondSprite({kind,form='',position,width,rotation=0,opacity=1,images}:{kind:string;form?:string;position:{x:number;y:number};width:number;rotation?:number;opacity?:number;images:Images}){
  const image=images[textureKey(kind,form)],uv=spriteMetrics(kind,form).uv;
  if(!image)return null;
  const height=width*image.height()/image.width();
  return <Group opacity={opacity} origin={vec(position.x,position.y)} transform={[{rotate:rotation}]}>
    <Image image={image} x={position.x-width*uv.x} y={position.y-height*uv.y} width={width} height={height} fit="fill"/>
  </Group>;
}
export function LivingPond({frame,selectedToken='',onSelect,motherDamage=[]}:{frame:HomePondFrame;selectedToken?:string;onSelect?:(token:string)=>void;motherDamage?:readonly number[]}){
  const [size,setSize]=useState({width:0,height:0}),[images,setImages]=useState<Images>({});
  const tissue=useMemo(()=>Skia.RuntimeEffect.Make(livingTissueShader),[]);
  const motherUniforms={...tissueDefaults(),kind:1,motion:0,core_damage:Array.from({length:7},(_,i)=>motherDamage[i]??0)};
  const loaded=useCallback((name:TextureKey,image:SkImage|null)=>setImages(previous=>{
    if((previous[name]??null)===image)return previous;
    const next={...previous};if(image)next[name]=image;else delete next[name];return next;
  }),[]);
  const mother=motherTextureKey(capacityForStage(frame.mother.stage),frame.mother.traits);
  const wanted=[...new Set<TextureKey>([mother,...frame.residents.map(r=>textureKey('spore',r.record.form)),
    ...[...frame.algae,...frame.keepsakes].map(d=>textureKey(d.form))])];
  const scale=Math.max(0,Math.min(size.width,size.height)-12)/790;
  const left=size.width/2-640*scale,top=size.height/2-450*scale;
  const selected=frame.residents.find(resident=>resident.record.token===selectedToken);
  return <View style={styles.pond} onLayout={event=>setSize(event.nativeEvent.layout)}>
    {wanted.map(name=><PondTexture key={name} name={name} onLoad={loaded}/>)}
    {scale>0&&<Canvas pointerEvents="none" accessible={false} style={StyleSheet.absoluteFill}>
      <Group transform={[{translateX:left},{translateY:top}]}><Group transform={[{scale}]}>
        <Circle cx={640} cy={450} r={385}><RadialGradient c={vec(640,390)} r={440} colors={['#28595d','#12383e','#061b22']}/></Circle>
        <Circle cx={640} cy={450} r={385} style="stroke" strokeWidth={2} color="#527d7d"/>
        {[...frame.algae,...frame.keepsakes].map((decoration,index)=><PondSprite key={`garden${index}`} kind={formDefinition(decoration.form)?.kind??'food'} form={decoration.form}
          position={decoration.position} width={decoration.width} rotation={decoration.rotation} opacity={decoration.opacity} images={images}/>)}
        <LivingSprite kind={mother} at={frame.mother.position} width={frame.mother.width} angle={frame.mother.rotation} images={images} effect={tissue} uniforms={motherUniforms}/>
        {frame.residents.map(resident=><Group key={resident.record.token}>
          {resident.glow>0&&<Circle cx={resident.position.x} cy={resident.position.y} r={resident.width*0.6} opacity={resident.glow*0.3}>
            <RadialGradient c={vec(resident.position.x,resident.position.y)} r={resident.width*0.6} colors={['#d8eac2','#d8eac200']}/>
          </Circle>}
          <PondSprite kind="spore" form={resident.record.form} position={resident.position} width={resident.width} rotation={resident.rotation} images={images}/>
          {(resident.welcoming||resident.record.token===selectedToken)&&<Circle cx={resident.position.x} cy={resident.position.y}
            r={Math.max(28,resident.extent*0.55)} color={resident.welcoming?'#a6e8cc':'#a8dbd9'} style="stroke" strokeWidth={2} opacity={0.7}/>}
          {selected?.companion?.token===resident.record.token&&<Circle cx={resident.position.x} cy={resident.position.y}
            r={Math.max(26,resident.extent*0.58)} color="#bfd499" style="stroke" strokeWidth={1.5} opacity={0.4}/>}
        </Group>)}
      </Group></Group>
    </Canvas>}
    {onSelect&&frame.residents.map(resident=><Pressable key={resident.record.token} onPress={()=>onSelect(resident.record.token)}
      accessibilityRole="button" accessibilityLabel={`${residentLabel(resident.record)}, ${resident.record.rare?'rare resident':'rescued resident'}${resident.welcoming?', arriving home':''}`}
      accessibilityState={{selected:resident.record.token===selectedToken}}
      style={[styles.residentTarget,{left:left+resident.position.x*scale-22,top:top+resident.position.y*scale-22}]}/>)}
  </View>;
}
export function HomePondScreen({profile,onBack,onProfileChange,readOnly=false,saving,error,onRetrySave,reducedMotion=false,onJournal}:HomePondScreenProps){
  const insets=useSafeAreaInsets(),{largeText,highContrast}=useAppearance();
  const [arrival]=useState(()=>{const clock=new HomePondClock();return {clock,...clock.open(profile)};});
  const [page,setPage]=useState(arrival.page),[selectedToken,setSelectedToken]=useState(arrival.selectedToken??'');
  const [renameToken,setRenameToken]=useState(''),[name,setName]=useState(''),[,setFrame]=useState(0);
  const update=useRef(onProfileChange);update.current=onProfileChange;
  const layout=useMemo(()=>buildHomePond(profile,page),[profile,page]);
  const clock=arrival.clock;
  useEffect(()=>{
    if(renameToken||(reducedMotion&&clock.welcomeRemaining<=0))return;
    let frame=0,last:number|undefined,accumulator=0,active=AppState.currentState==='active';
    const listener=AppState.addEventListener('change',state=>{active=state==='active';last=undefined;accumulator=0;});
    const animate=(now:number)=>{
      if(active){
        accumulator+=last===undefined?0:Math.min(0.1,Math.max(0,(now-last)/1000));
        if(accumulator>=1/30){
          const welcomed=clock.step(accumulator,{reducedMotion});accumulator=0;
          if(welcomed.length&&!readOnly)update.current(current=>welcomeResidents(current,welcomed));
          setFrame(value=>value+1);
        }
      }
      last=active?now:undefined;
      if(!reducedMotion||clock.welcomeRemaining>0)frame=requestAnimationFrame(animate);
    };
    frame=requestAnimationFrame(animate);return()=>{cancelAnimationFrame(frame);listener.remove();};
  },[clock,reducedMotion,renameToken,readOnly]);
  const frame=sampleHomePond(layout,clock.time,{welcomeTokens:clock.welcomeTokens,welcomeRemaining:clock.welcomeRemaining,reducedMotion});
  const selected=layout.residents.find(resident=>resident.record.token===selectedToken),record=selected?.record;
  const selectedIndex=layout.residents.findIndex(resident=>resident.record.token===selectedToken);
  const choose=(step:number)=>{
    if(!layout.residents.length)return;
    const index=selectedIndex<0?0:(selectedIndex+step+layout.residents.length)%layout.residents.length;
    setSelectedToken(layout.residents[index].record.token);
  };
  const turn=(direction:number)=>{setPage(Math.max(0,Math.min(layout.pageCount-1,layout.page+direction)));setSelectedToken('');};
  const closeRename=()=>setRenameToken('');
  const saveName=()=>{if(readOnly)return;update.current(current=>renameResident(current,renameToken,name));closeRename();};
  return <View style={shared.root}>
    <CollectionHeader title="Home pond" detail={`${profile.residents.length} lives brought home · ${profile.residents.filter(r=>r.rare).length} rare residents`}
      onBack={onBack} action={onJournal?<CollectionButton label="Journal" onPress={onJournal}/>:undefined}/>
    <View style={styles.content}>
      <View style={styles.habitat}>
        <LivingPond frame={frame} selectedToken={selectedToken} onSelect={setSelectedToken}/>
        {layout.pageCount>1&&<View style={styles.pages}>
          <CollectionButton label="Previous" onPress={()=>turn(-1)} disabled={layout.page===0}/>
          <Text style={shared.caption}>{layout.page*POND_PAGE_SIZE+1}–{Math.min((layout.page+1)*POND_PAGE_SIZE,layout.total)} of {layout.total}</Text>
          <CollectionButton label="More residents" onPress={()=>turn(1)} disabled={layout.page>=layout.pageCount-1}/>
        </View>}
      </View>
      <ScrollView style={styles.sidebar} contentContainerStyle={styles.sidebarContent} keyboardShouldPersistTaps="handled">
        {clock.welcomeTokens.length>0&&<Text accessibilityLiveRegion="polite" style={styles.welcome}>Welcome home · {clock.welcomeTokens.length} new lives, safe in your care.</Text>}
        {record&&selected?<>
          <Text style={shared.eyebrow}>{record.rare?'RARE RESIDENT':'RESCUED RESIDENT'}</Text>
          <Text accessibilityRole="header" style={shared.title}>{residentLabel(record)}</Text>
          {!!record.nickname&&<Text style={shared.caption}>{formDefinition(record.form)?.name??'Pearl spore'}</Text>}
          <Text style={shared.body}>{residentOrigin(record)}</Text>
          <Text style={styles.relationship}>{residentRelationship(profile,record,selected.companion)}</Text>
          <Text style={shared.caption}>{residentHabit(record)}</Text>
          <Text style={shared.caption}>{residentMaturity(profile,record)>=1?'Fully grown in your care.':'Growing with each new encounter.'}</Text>
          <CollectionButton label={record.nickname?'Change its name':'Give it a name'} disabled={readOnly}
            onPress={()=>{setName(record.nickname??'');setRenameToken(record.token);}}/>
        </>:<>
          <Text accessibilityRole="header" style={shared.title}>Nothing to hurry.</Text>
          <Text style={shared.body}>Your journey waits exactly where you left it.</Text>
          <Text style={shared.caption}>{profile.residents.length?'Select a resident to meet it and its companion.':'Rescue pearl-white spores to bring the first residents home.'}</Text>
        </>}
        {layout.residents.length>0&&<View style={styles.selectionButtons}>
          <CollectionButton label="Previous resident" onPress={()=>choose(-1)} style={styles.flexButton}/>
          <CollectionButton label="Next resident" onPress={()=>choose(1)} style={styles.flexButton}/>
        </View>}
        <View style={styles.gardens}>
          <Text accessibilityRole="header" style={styles.gardenTitle}>Pond gardens · {layout.gardens.length} of 3</Text>
          {(Object.keys(KEEPSAKES) as Feat[]).map(id=>{
            const unlocked=layout.gardens.some(garden=>garden.id===id);
            return <View key={id} style={styles.garden}><Text style={unlocked?styles.relationship:shared.caption}>{KEEPSAKES[id]} · {unlocked?'Growing':'Not yet grown'}</Text>
              {!unlocked&&<Text style={styles.gardenHint}>{GARDEN_HINTS[id]}</Text>}</View>;
          })}
        </View>
      </ScrollView>
    </View>
    <CollectionSaveNotice saving={saving} error={error} readOnly={readOnly} onRetrySave={onRetrySave}/>
    <Modal visible={renameToken!==''} transparent animationType={reducedMotion?'none':'fade'} onRequestClose={closeRename}>
      <KeyboardAvoidingView style={[styles.modalShade,{paddingLeft:insets.left,paddingRight:insets.right,paddingTop:insets.top,paddingBottom:insets.bottom}]} behavior={Platform.OS==='ios'?'padding':undefined}>
        <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
          <View style={styles.dialog} accessibilityViewIsModal>
            <Text accessibilityRole="header" style={shared.title}>Name this resident</Text>
            <Text style={shared.caption}>The name stays with its story in your home pond.</Text>
            <TextInput value={name} onChangeText={value=>setName(Array.from(value).slice(0,24).join(''))} maxLength={48} autoFocus selectTextOnFocus
              editable={!readOnly} accessibilityLabel="Resident name" placeholder="Leave blank for its species name" placeholderTextColor="#789b99"
              style={[styles.input,largeText&&{fontSize:22},highContrast&&{color:'#f3fff5',borderColor:'#dff7eb'}]} returnKeyType="done" onSubmitEditing={saveName}/>
            <Text style={shared.caption}>{Array.from(name).length} of 24 characters</Text>
            <View style={styles.selectionButtons}><CollectionButton label="Cancel" onPress={closeRename} style={styles.flexButton}/>
              <CollectionButton label="Save name" onPress={saveName} disabled={readOnly} style={styles.flexButton}/></View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  </View>;
}
const styles=StyleSheet.create({
  content:{flex:1,flexDirection:'row',minHeight:0},habitat:{flex:1,minWidth:0},pond:{flex:1,minHeight:0,overflow:'hidden'},
  sidebar:{width:'34%',minWidth:220,maxWidth:360,borderLeftWidth:1,borderLeftColor:'#24464d'},sidebarContent:{padding:16,gap:12},
  residentTarget:{position:'absolute',width:44,height:44,borderRadius:22},pages:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:6,padding:6},
  welcome:{fontSize:14,lineHeight:20,color:'#c5e6ce'},relationship:{fontSize:13,lineHeight:20,color:'#a5d6c5'},selectionButtons:{flexDirection:'row',gap:8},flexButton:{flex:1,paddingHorizontal:8},
  gardens:{borderTopWidth:1,borderTopColor:'#24464d',paddingTop:14,gap:9,marginTop:3},gardenTitle:{fontSize:14,color:'#e0eadd',fontWeight:'600'},garden:{gap:3},gardenHint:{fontSize:12,lineHeight:18,color:'#8baaa8'},
  modalShade:{flex:1,backgroundColor:'#041116e8'},modalScroll:{flexGrow:1,justifyContent:'center',alignItems:'center',padding:18},
  dialog:{width:'100%',maxWidth:440,padding:20,gap:12,borderRadius:16,borderColor:'#527b76',borderWidth:1,backgroundColor:'#102b31'},
  input:{minHeight:48,borderWidth:1,borderColor:'#75a291',borderRadius:8,paddingHorizontal:12,paddingVertical:10,fontSize:17,color:'#e1eee4',backgroundColor:'#081d23'},
});
