// SkSL port of prototype/shaders/water_interaction.gdshaderinc.
// Child fluidMap must expose raw, linearly sampled RG displacement channels,
// not a color-managed/premultiplied RGBA texture. EncounterView supplies an
// untagged opaque float RGBA image, with alpha fixed at one.
export const waterInteractionShader=`
uniform float4 currents[4];
uniform float4 strokes[6];
uniform float stroke_strengths[6];
uniform shader fluidMap;
uniform float fluid_enabled;
float2 transported_water(float2 at) {
  if(fluid_enabled<0.5) return float2(0.0);
  float2 grid=clamp((at-float2(248.0,58.0))/784.0,float2(0.0),float2(1.0));
  float2 pixel=grid*27.0+float2(0.5);
  return (float2(fluidMap.eval(pixel).rg)-float2(0.5))*192.0;
}
float2 water_displacement(float2 at) {
  float2 offset=float2(0.0);
  for(int i=0;i<4;i++) {
    float2 delta=at-currents[i].xy;
    float distance=length(delta);
    float2 radial=delta/max(distance,1.0);
    float envelope=exp(-distance*distance/14400.0)*min(distance/24.0,1.0);
    offset+=(radial*currents[i].z+float2(radial.y,-radial.x)*currents[i].w)*envelope;
  }
  for(int i=0;i<6;i++) {
    if(stroke_strengths[i]>0.0) {
      float2 segment=strokes[i].zw-strokes[i].xy;
      float fraction=clamp(dot(at-strokes[i].xy,segment)/max(dot(segment,segment),1.0),0.0,1.0);
      float2 delta=at-strokes[i].xy-segment*fraction;
      float envelope=exp(-dot(delta,delta)/900.0)*stroke_strengths[i];
      offset+=(delta/max(length(delta),4.0)*7.0+segment/max(length(segment),1.0)*2.0)*envelope;
    }
  }
  return offset*min(1.0,28.0/max(length(offset),0.001))+transported_water(at);
}
`;
