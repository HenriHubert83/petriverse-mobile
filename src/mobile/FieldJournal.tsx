import React,{useMemo,useState} from 'react';
import {AppPressable as Pressable,AppText as Text} from './AccessibleText';
import {FlatList,ScrollView,StyleSheet,View} from 'react-native';
import type {JourneyProfile} from '../storage/journeyProfile';
import {journalEntries,journalProgress} from '../content/journal';
import type {JournalFilter,JournalEntry} from '../content/journal';
import {CollectionButton,CollectionHeader,CollectionSaveNotice,CreatureArtwork,collectionStyles as shared} from './CollectionScreen';

export interface FieldJournalProps {
  profile:JourneyProfile;onBack:()=>void;onWatch:(speciesId:string)=>void;
  seenSpecies?:readonly string[];readOnly?:boolean;saving?:boolean;error?:string;onRetrySave?:()=>void;
}
const filters:{id:JournalFilter;label:string}[]=[{id:'all',label:'All'},{id:'discovered',label:'Discovered'},{id:'undiscovered',label:'Undiscovered'}];
export function FieldJournal({profile,onBack,onWatch,seenSpecies=[],readOnly=false,saving,error,onRetrySave}:FieldJournalProps){
  const [filter,setFilter]=useState<JournalFilter>('all'),[selectedId,setSelectedId]=useState('');
  const entries=useMemo(()=>journalEntries(profile.discovered,filter,seenSpecies),[profile.discovered,filter,seenSpecies]);
  const progress=journalProgress(profile.discovered,seenSpecies),selected=entries.find(entry=>entry.id===selectedId)??entries[0];
  const select=(entry:JournalEntry)=>setSelectedId(entry.id);
  return <View style={shared.root}>
    <CollectionHeader title="Field journal" detail={`${progress.found} of ${progress.total} discoveries · Kept across every journey`} onBack={onBack}/>
    <View style={styles.filters}>{filters.map(item=><CollectionButton key={item.id} label={item.label} selected={filter===item.id}
      onPress={()=>{setFilter(item.id);setSelectedId('');}}/>)}</View>
    <View style={styles.content}>
      <FlatList data={entries} keyExtractor={entry=>entry.id} style={styles.list} contentContainerStyle={styles.listContent}
        extraData={selected?.id} initialNumToRender={6} maxToRenderPerBatch={8} windowSize={5}
        ListEmptyComponent={<Text style={[shared.caption,styles.empty]}>{filter==='discovered'?'Your first discovery is waiting in the water.':'Every creature in the catalogue has been discovered.'}</Text>}
        renderItem={({item,index})=><Pressable onPress={()=>select(item)} accessibilityRole="button"
          accessibilityLabel={`${item.name}, ${index+1} of ${entries.length}${item.known&&item.rare?', rare':''}`}
          accessibilityState={{selected:item.id===selected?.id}}
          style={({pressed})=>[styles.row,item.id===selected?.id&&styles.selected,pressed&&shared.dim]}>
          <CreatureArtwork id={item.id} size={46} hidden={!item.known}/>
          <View style={styles.rowText}><Text style={styles.name}>{item.name}</Text>
            <Text style={shared.caption}>{item.known?(item.expedition?'Rare expedition form':item.rare?'Rare visitor':'Discovered'):'Where to look'}</Text></View>
        </Pressable>}/>
      <ScrollView style={styles.details} contentContainerStyle={styles.detailsContent} key={selected?.id??filter}>
        {selected?<>
          <View style={styles.portrait}><CreatureArtwork id={selected.id} size={112} hidden={!selected.known}/></View>
          <Text accessibilityRole="header" style={shared.title}>{selected.name}</Text>
          <Text style={shared.body}>{selected.detail}</Text>
          {selected.known&&<CollectionButton label={profile.introducedSpecies.includes(selected.id)?'Replay discovery':'Watch discovery'}
            onPress={()=>onWatch(selected.id)}/>}
          {!selected.known&&<Text style={shared.caption}>Meet this organism during a journey to reveal its story.</Text>}
        </>:<Text style={shared.body}>Choose another filter to explore the catalogue.</Text>}
      </ScrollView>
    </View>
    <CollectionSaveNotice saving={saving} error={error} readOnly={readOnly} onRetrySave={onRetrySave}/>
  </View>;
}
const styles=StyleSheet.create({
  filters:{flexDirection:'row',gap:7,paddingHorizontal:14,paddingVertical:8,flexWrap:'wrap'},content:{flex:1,flexDirection:'row',minHeight:0},
  list:{flex:0.85,borderRightWidth:1,borderRightColor:'#24464d'},listContent:{padding:8,gap:6},row:{minHeight:68,flexDirection:'row',alignItems:'center',gap:8,padding:8,borderRadius:10,borderWidth:1,borderColor:'#183b42'},
  rowText:{flex:1,gap:2},name:{fontSize:13,fontWeight:'600',color:'#d9e7dc'},selected:{backgroundColor:'#183c40',borderColor:'#67948a'},
  details:{flex:1.15},detailsContent:{paddingHorizontal:20,paddingBottom:18,gap:12},portrait:{alignSelf:'center',width:132,height:116,alignItems:'center',justifyContent:'center'},empty:{padding:14},
});
