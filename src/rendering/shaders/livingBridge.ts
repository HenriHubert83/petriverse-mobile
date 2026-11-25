// SkSL port of prototype/shaders/living_bridge.gdshader; see CREDITS.md and LICENSE.
// Supply local bounds coordinates; child shader uses pixel-space image coordinates.
export const livingBridgeShader=`
uniform shader tissueTexture;
uniform float2 textureSize;
uniform float2 first;
uniform float2 second;
uniform float width;
uniform float clock;
uniform float motion;
uniform float boss;
uniform float pulse;
half4 main(float2 p) {
  float2 axis=second-first;
  float extent=max(length(axis),0.001);
  float2 forward=axis/extent;
  float2 side=float2(-forward.y,forward.x);
  float along=dot(p-first,forward)/extent;
  float across=dot(p-first,side);
  float curve=sin(clamp(along,0.0,1.0)*3.14159265359)*sin(clock*0.8)*2.0*motion;
  float neck=width*(0.72+0.48*pow(abs(along-0.5)*2.0,2.0));
  neck+=sin(along*18.0-clock*1.1)*0.65*motion;
  float distance_to_skin=abs(across-curve)-neck;
  float skin=exp(-abs(distance_to_skin)*1.2);
  float inner_skin=exp(-abs(distance_to_skin+2.2)*1.1);
  float2 tissue_uv=float2(0.25+along*0.16,0.3+(across-curve)*0.003);
  half4 sampled=tissueTexture.eval(clamp(tissue_uv,float2(0.0),float2(1.0))*textureSize);
  float3 tissue=float3(sampled.rgb)/max(float(sampled.a),0.0001);
  float3 color=tissue*mix(float3(0.64,0.83,0.95),float3(0.72,0.69,1.0),boss);
  color+=float3(0.46,0.69,0.8)*skin*0.64+float3(0.14,0.19,0.23)*inner_skin;
  float flow=pow(0.5+0.5*sin(along*27.0-clock*1.7),18.0);
  color+=float3(0.32,0.20,0.05)*flow*exp(-abs(across-curve)*0.7)*motion;
  color+=float3(0.1,0.14,0.17)*pulse;
  float alpha=(1.0-smoothstep(-0.4,1.0,distance_to_skin))*step(0.0,along)*step(along,1.0)*0.86;
  return half4(color*alpha,alpha);
}
`;
