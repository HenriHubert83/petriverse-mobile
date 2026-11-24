// SkSL translation of prototype/shaders/membrane.gdshader.
// See CREDITS.md and LICENSE. Supply original dish coordinates via the local matrix.
import {organicMotion} from './organicMotion';
export const membraneShader = organicMotion + `
uniform float clock;
uniform float strength;
uniform float motion;
uniform float poison;
half4 main(float2 point) {
  float t=clock*motion;
  float2 p=point*0.025;
  p+=organic_current(p*0.24,t)*0.16*motion;
  float fold=sin(p.x*1.3+p.y*0.7+sin(p.y*1.6+t*0.45))*0.5+0.5;
  float fiber=pow(0.5+0.5*sin((p.x+p.y)*5.0+sin(p.y*2.0+t)*1.4),14.0);
  float3 hue=mix(float3(0.28,0.61,0.72),float3(0.70,0.79,0.60),fold);
  hue=mix(hue,float3(0.87,0.36,0.53),poison*0.78);
  float sheen=pow(0.5+0.5*sin(p.x*0.6-p.y*0.4+t*0.25),12.0);
  float alpha=strength*(0.32+fold*0.4+fiber*0.20+sheen*0.08);
  float3 rgb=hue+fiber*0.12+float3(0.10,0.16,0.17)*sheen;
  return half4(rgb*alpha,alpha);
}
`;
export const membraneDefaults={clock:0,strength:0.14,motion:1,poison:0} as const;
