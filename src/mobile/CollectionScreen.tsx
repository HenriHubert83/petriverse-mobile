import React from 'react';
import {AppPressable as Pressable,AppText as Text} from './AccessibleText';
import {Image,StyleSheet,View} from 'react-native';
import type {StyleProp,ViewStyle} from 'react-native';
import {organismTextures,textureKey} from '../rendering/organismTextures';

export function CollectionButton({label,onPress,disabled=false,selected=false,style}:{label:string;onPress:()=>void;disabled?:boolean;selected?:boolean;style?:StyleProp<ViewStyle>}){
  return <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button"
    accessibilityState={{disabled,selected}} style={({pressed})=>[collectionStyles.button,selected&&collectionStyles.selected,style,(disabled||pressed)&&collectionStyles.dim]}>
    <Text style={collectionStyles.buttonText}>{label}</Text>
  </Pressable>;
}
export function CollectionHeader({title,detail,onBack,action}:{title:string;detail?:string;onBack:()=>void;action?:React.ReactNode}){
  return <View style={collectionStyles.header}>
    <CollectionButton label="Back" onPress={onBack}/>
    <View style={collectionStyles.heading}><Text accessibilityRole="header" style={collectionStyles.title}>{title}</Text>
      {detail&&<Text style={collectionStyles.caption}>{detail}</Text>}</View>
    {action}
  </View>;
}
export function CollectionSaveNotice({saving,error,readOnly,onRetrySave}:{saving?:boolean;error?:string;readOnly?:boolean;onRetrySave?:()=>void}){
  if(!error&&!readOnly)return null;
  return <View style={collectionStyles.notice}>
    <Text accessibilityLiveRegion="polite" style={error?collectionStyles.error:collectionStyles.caption}>
      {error||'Your records are available to view. Changes are temporarily unavailable.'}
    </Text>
    {error&&onRetrySave&&<CollectionButton label="Retry saving" onPress={onRetrySave} disabled={saving}/>}
  </View>;
}
export function CreatureArtwork({id,size=80,hidden=false}:{id:string;size?:number;hidden?:boolean}){
  return <Image source={organismTextures[textureKey(id)]} resizeMode="contain" accessible={false}
    style={{width:size,height:size,opacity:hidden?0.15:1}}/>;
}
export const collectionStyles=StyleSheet.create({
  root:{flex:1,backgroundColor:'#06171c'},header:{flexDirection:'row',alignItems:'center',gap:12,paddingHorizontal:14,paddingVertical:8,borderBottomWidth:1,borderColor:'#24464d'},
  heading:{flex:1,minWidth:0,gap:3},title:{fontSize:21,fontWeight:'600',color:'#e1eee4'},caption:{fontSize:12,lineHeight:18,color:'#9abcb7'},
  body:{fontSize:14,lineHeight:21,color:'#c7d9d2'},eyebrow:{fontSize:11,letterSpacing:1.3,color:'#9ac8c2'},
  button:{minWidth:44,minHeight:44,paddingHorizontal:14,paddingVertical:10,alignItems:'center',justifyContent:'center',backgroundColor:'#112b30',borderColor:'#34585e',borderWidth:1,borderRadius:9},
  buttonText:{fontSize:13,fontWeight:'600',color:'#e0eee0'},selected:{backgroundColor:'#325f5b',borderColor:'#7da899'},dim:{opacity:0.45},
  notice:{paddingHorizontal:14,paddingVertical:7,gap:6,backgroundColor:'#142c2f'},error:{color:'#f0c1ac',fontSize:12,lineHeight:18},
});
