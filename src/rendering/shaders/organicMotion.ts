// SkSL translation of prototype/shaders/organic_motion.gdshaderinc.
// See CREDITS.md and LICENSE. Runtime compilation pending.
export const organicMotion = `
float organic_noise(float2 p) {
  float2 i=floor(p), f=fract(p);
  f=f*f*f*(f*(f*6.0-15.0)+10.0);
  float4 h=fract(sin(float4(dot(i,float2(127.1,311.7)),dot(i+float2(1,0),float2(127.1,311.7)),dot(i+float2(0,1),float2(127.1,311.7)),dot(i+float2(1,1),float2(127.1,311.7))))*43758.5453);
  return mix(mix(h.x,h.y,f.x),mix(h.z,h.w,f.x),f.y);
}
float2 organic_current(float2 p,float t) {
  float2 a=p*3.1+float2(t*0.19,-t*0.13);
  float2 b=p*5.3+float2(-t*0.11,t*0.17)+float2(1.7,0.8);
  return float2(sin(a.x)*cos(a.y),-cos(a.x)*sin(a.y))*0.68
       + float2(sin(b.x)*cos(b.y),-cos(b.x)*sin(b.y))*0.32;
}
float organic_beat(float t) {
  float wave=0.5+0.5*sin(t);
  return wave*wave*wave-0.3125;
}
`;
