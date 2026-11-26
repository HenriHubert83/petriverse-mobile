import React from 'react';
import {ScrollView,StyleSheet,Switch,View} from 'react-native';
import {AppPressable as Pressable,AppText as Text} from './AccessibleText';
import {DEFAULT_PREFERENCES,type Preferences,type PreferencesPatch} from '../settings/preferences';

export interface SettingsScreenProps {
  value:Readonly<Preferences>;
  onChange:(patch:PreferencesPatch)=>void;
  onBack:()=>void;
  onRetry:()=>void;
  error?:string;
  saving?:boolean;
  readOnly?:boolean;
}
export function SettingsScreen({value,onChange,onBack,onRetry,error='',saving=false,readOnly=false}:SettingsScreenProps){
  const text=[styles.text,value.highContrast&&styles.contrastText];
  const heading=[styles.heading,value.highContrast&&styles.contrastText];
  function button(label:string,onPress:()=>void,disabled=false,selected?:boolean){
    return <Pressable key={label} accessibilityRole="button" accessibilityState={{disabled,selected}} disabled={disabled}
      onPress={onPress} style={({pressed})=>[styles.button,selected&&styles.selected,(pressed||disabled)&&styles.dim]}>
      <Text style={text}>{label}</Text></Pressable>;
  }
  function toggle(key:keyof Preferences,label:string,description:string){
    return <View key={key} style={styles.row}><View style={styles.label}>
      <Text style={text}>{label}</Text><Text style={[...text,styles.detail]}>{description}</Text></View>
      <Switch accessibilityLabel={label} accessibilityHint={description} value={Boolean(value[key])} disabled={readOnly}
        trackColor={{false:'#617574',true:'#688b44'}} thumbColor="#f0f6dc" onValueChange={enabled=>onChange({[key]:enabled})}/></View>;
  }
  function volume(key:'musicVolume'|'effectsVolume',label:string){
    const amount=Math.round(value[key]*100);
    const adjust=(step:number)=>onChange({[key]:Math.max(0,Math.min(1,Math.round((value[key]+step)*100)/100))});
    return <View style={styles.row}><View style={styles.label} accessible accessibilityRole="adjustable" accessibilityLabel={label}
      accessibilityValue={{min:0,max:100,now:amount,text:`${amount} percent`}}
      accessibilityActions={[{name:'increment',label:'Increase volume'},{name:'decrement',label:'Decrease volume'}]}
      onAccessibilityAction={event=>{if(!readOnly)adjust(event.nativeEvent.actionName==='increment'?.1:-.1);}}>
      <Text style={text}>{label}</Text><Text style={[...text,styles.detail]}>{amount}%</Text></View>
      <View style={styles.options}>{button(`Lower ${label.toLowerCase()}`,()=>adjust(-.1),readOnly||amount===0)}
        {button(`Raise ${label.toLowerCase()}`,()=>adjust(.1),readOnly||amount===100)}</View></View>;
  }
  return <View style={[styles.root,value.highContrast&&styles.contrastRoot]}><ScrollView contentContainerStyle={styles.page}>
    <Text accessibilityRole="header" style={heading}>Settings</Text>
    <Text style={text}>Make the pond comfortable for you. Changes apply immediately.</Text>
    <Text accessibilityRole="header" style={heading}>Sound</Text>
    {toggle('muted','Mute all sound','Silence music, effects and discovery narration.')}
    {volume('musicVolume','Music')}{volume('effectsVolume','Effects and narration')}
    {toggle('subtitles','Discovery subtitles','Show the spoken introduction during each creature discovery.')}
    <Text accessibilityRole="header" style={heading}>Comfort</Text>
    {toggle('reducedMotion','Reduced motion','Reduce decorative movement, pulses and transitions.')}
    {toggle('highContrast','High contrast','Strengthen text and gameplay outlines.')}
    {toggle('largeText','Larger text','Increase interface text size.')}
    <Text accessibilityRole="header" style={heading}>Controls</Text>
    {toggle('assistedClosure','Assisted loop closure','Make it easier to reconnect the last cell to the first.')}
    {toggle('clickMode','Tap-to-connect controls','Tap cells one at a time to build a loop.')}
    {toggle('deliberateCapture','Deliberate capture','Slow the pond while a closed loop is held, giving you time to review it before releasing.')}
    <Text accessibilityRole="header" style={heading}>Visual quality</Text>
    <Text style={text}>Lower quality reduces decorative detail for a quieter pond and smoother play.</Text>
    <View style={styles.options}>{(['Light','Balanced','Full'] as const).map((label,index)=>button(label,()=>onChange({visualQuality:index as 0|1|2}),readOnly,value.visualQuality===index))}</View>
    <Text accessibilityLiveRegion="polite" style={[...text,styles.detail]}>{saving?'Saving settings…':readOnly?'Saved settings are protected until they can be read.':'Settings save automatically on this device.'}</Text>
    {!!error&&<View style={styles.notice}><Text accessibilityRole="alert" style={text}>{error}</Text>{button('Retry saving settings',onRetry,saving)}</View>}
    <View style={styles.options}>{button('Restore defaults',()=>onChange({...DEFAULT_PREFERENCES}),readOnly)}{button('Back',onBack)}</View>
  </ScrollView></View>;
}
const styles=StyleSheet.create({
  root:{flex:1,backgroundColor:'#102c30'},contrastRoot:{backgroundColor:'#071a1d'},page:{padding:24,paddingTop:48,paddingBottom:56,gap:16,width:'100%',maxWidth:800,alignSelf:'center'},
  text:{fontSize:16,lineHeight:23,color:'#e5eed9'},contrastText:{color:'#fff'},
  heading:{fontSize:24,lineHeight:31,color:'#d8edb7',fontWeight:'700',marginTop:12},
  row:{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:10,borderBottomWidth:1,borderBottomColor:'#385456',flexWrap:'wrap'},
  label:{flex:1,minWidth:180},detail:{opacity:.85,fontSize:14},options:{flexDirection:'row',gap:10,flexWrap:'wrap'},
  button:{minHeight:48,minWidth:48,justifyContent:'center',alignItems:'center',paddingHorizontal:14,paddingVertical:10,borderWidth:1,borderColor:'#829e79',borderRadius:12,backgroundColor:'#244b4d'},
  selected:{backgroundColor:'#486833',borderColor:'#e0eeaf'},dim:{opacity:.5},notice:{padding:16,borderWidth:1,borderColor:'#dfba87',borderRadius:12,gap:12},
});
