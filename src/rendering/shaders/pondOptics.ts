// SkSL port of prototype/shaders/pond_optics.gdshaderinc; see CREDITS.md and LICENSE.
export const pondOptics=`
float pond_illumination(float2 point,float time,float2 direction) {
  float2 q=(point-float2(640.0,450.0))/392.0;
  float directional=dot(q,normalize(direction))*0.025;
  float drifting=sin(q.x*2.1+q.y*1.3+time*0.085+sin(q.y*3.0-time*0.06)*0.7);
  return 1.0+directional+drifting*0.014;
}
float3 pond_focal_tone(float3 color,float3 medium,float immersion) {
  float3 transmitted=color/(float3(1.0)+max(color-float3(0.16),float3(0.0))*immersion*1.65);
  return mix(transmitted,medium+float3(0.040,0.055,0.065),immersion);
}
`;
