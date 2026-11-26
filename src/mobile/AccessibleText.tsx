import React,{createContext,forwardRef,useContext,useEffect,useMemo,useState} from 'react';
import {Pressable as NativePressable,StyleSheet,Text as NativeText} from 'react-native';
import type {PressableProps,TextProps,TextStyle} from 'react-native';
import * as Font from 'expo-font';
import {highContrastTextColor,textMetrics} from './textAppearance';

export interface Appearance {largeText:boolean;highContrast:boolean}
const AppearanceContext=createContext<Appearance&{fontLoaded:boolean;onPressSound?:()=>void}>({largeText:false,highContrast:false,fontLoaded:false});
const TextMetricsContext=createContext<Pick<TextStyle,'fontSize'|'lineHeight'|'color'|'fontFamily'>>({});
const FONT_FAMILY='PetriverseInter';
let fontRequest:Promise<void>|undefined;
function loadFont():Promise<void>{
  if(!fontRequest)fontRequest=Font.loadAsync({[FONT_FAMILY]:require('../../assets/fonts/Inter-Variable.ttf')});
  return fontRequest;
}
export function AppearanceProvider({value,children,onPressSound}:{value:Appearance;children:React.ReactNode;onPressSound?:()=>void}){
  const [fontLoaded,setFontLoaded]=useState(()=>Font.isLoaded(FONT_FAMILY));
  useEffect(()=>{
    if(fontLoaded)return;
    let mounted=true;
    // Native system typography remains usable if loading the local font fails.
    void loadFont().then(()=>{if(mounted)setFontLoaded(true);}).catch(()=>{});
    return()=>{mounted=false;};
  },[fontLoaded]);
  const appearance=useMemo(()=>({...value,fontLoaded,onPressSound}),[value.largeText,value.highContrast,fontLoaded,onPressSound]);
  return <AppearanceContext.Provider value={appearance}>{children}</AppearanceContext.Provider>;
}
export function useAppearance():Appearance{return useContext(AppearanceContext);}
/** Native Text props/ref remain intact, including OS font scaling and screen-reader semantics. */
export const AppText=forwardRef<React.ElementRef<typeof NativeText>,TextProps>(function AppText({style,children,...props},ref){
  const appearance=useContext(AppearanceContext),inherited=useContext(TextMetricsContext),flat=StyleSheet.flatten(style)??{};
  const fontSize=flat.fontSize??inherited.fontSize??14;
  const lineHeight=flat.lineHeight??(flat.fontSize===undefined?inherited.lineHeight:undefined);
  const color=flat.color??inherited.color??'#e0eee0',fontFamily=flat.fontFamily??inherited.fontFamily;
  const overrides:TextStyle={...textMetrics(fontSize,lineHeight,appearance.largeText),
    ...(appearance.highContrast?{color:highContrastTextColor(color) as TextStyle['color']}:{}),
    ...(fontFamily?{fontFamily}:appearance.fontLoaded?{fontFamily:FONT_FAMILY}:{}),
  };
  return <TextMetricsContext.Provider value={{fontSize,lineHeight,color,fontFamily}}>
    <NativeText {...props} ref={ref} style={[style,overrides]}>{children}</NativeText>
  </TextMetricsContext.Provider>;
});

/** Sound is attached to the completed press, never render, focus, or finger-down. */
export const AppPressable=forwardRef<React.ElementRef<typeof NativePressable>,PressableProps>(function AppPressable({onPress,disabled,...props},ref){
  const {onPressSound}=useContext(AppearanceContext);
  return <NativePressable {...props} ref={ref} disabled={disabled} onPress={onPress?event=>{
    if(disabled)return;
    // Audio is optional. A device audio failure must not swallow the action.
    try{onPressSound?.();}catch{}
    onPress(event);
  }:onPress}/>;
});
