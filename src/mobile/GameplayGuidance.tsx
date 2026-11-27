import React from 'react';
import {StyleSheet,View} from 'react-native';
import type {EncounterSimulation} from '../engine/encounterSimulation';
import {AppText as Text} from './AccessibleText';
import {nextAction,selectedLoopConfidence} from './gameGuidance';
import type {CaptureFeedback} from './gameGuidance';

/** Place inside the scrolling sidebar. The caller owns the simulation clock. */
export function GameplayGuidance({run,clickMode=false,feedback}:{run:EncounterSimulation;clickMode?:boolean;feedback?:CaptureFeedback}){
  if(run.state!=='active')return null;
  const action=nextAction(run,clickMode),preview=selectedLoopConfidence(run,feedback),event=run.harvest.events.sample(run);
  return <View style={styles.group}>
    <View style={[styles.card,action.urgent&&styles.danger]}>
      <Text accessibilityRole="header" style={styles.title}>{action.title}</Text>
      <Text style={styles.detail}>{action.detail}</Text>
    </View>
    {preview&&<View style={[styles.card,preview.outcome.poison>0&&styles.danger]}>
      <Text style={styles.eyebrow}>CAPTURE PREVIEW</Text>
      <Text style={styles.title}>{preview.summary}</Text>
      {!!preview.warning&&<Text style={styles.warning}>{preview.warning}</Text>}
      <Text style={styles.detail}>{preview.detail}</Text>
    </View>}
    <Text style={styles.pressure}>{event?event.title+' · '+event.detail:run.harvest.ecology.pressureText(run)}</Text>
  </View>;
}
const styles=StyleSheet.create({
  group:{gap:10},card:{borderRadius:12,padding:12,gap:6,backgroundColor:'#16353b',borderColor:'#37636a',borderWidth:1},
  danger:{borderColor:'#dca598',backgroundColor:'#382b32'},title:{fontSize:16,lineHeight:21,color:'#dcefe5',fontWeight:'600'},
  detail:{fontSize:13,lineHeight:19,color:'#b7ceca'},eyebrow:{fontSize:10,lineHeight:14,letterSpacing:1.1,color:'#96c8bf'},
  warning:{fontSize:13,lineHeight:19,color:'#f0c6ac'},pressure:{fontSize:12,lineHeight:18,color:'#95b4b2'},
});
