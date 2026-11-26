// SkSL translation of prototype/shaders/amoeba_arm.gdshader. See CREDITS.md.
export const amoebaArmShader=`
uniform shader tissueTexture;
uniform float2 textureSize;
uniform float2 rectOrigin;
uniform float2 extent;
uniform float2 start;
uniform float2 target;
uniform float extension;
uniform float clock;
uniform float motion;
float capsule(float2 p,float2 a,float2 b,float r){
 float2 ab=b-a;return length(p-a-ab*clamp(dot(p-a,ab)/max(dot(ab,ab),0.001),0.0,1.0))-r;
}
float merge(float a,float b,float k){float h=clamp(0.5+0.5*(b-a)/k,0.0,1.0);return mix(b,a,h)-k*h*(1.0-h);}
float2 reach(float t,float side,float2 goal,float2 axis,float2 normal){
 float travel=smoothstep(0.0,0.70,t);float2 at=mix(axis*20.0,goal-axis*20.0,travel);float wrap=smoothstep(0.55,1.0,t);
 at+=axis*(1.0-cos(wrap*2.75))*20.0;at+=normal*side*(sin(t*3.14159)*10.0+sin(wrap*2.75)*26.0);return at;
}
half4 main(float2 xy){
 float2 p=xy-rectOrigin-start,axis=normalize(target+float2(0.001,0.0)),normal=float2(-axis.y,axis.x);float distance=1000.0;
 for(int side_index=0;side_index<2;side_index++){
  float side=side_index==0?-1.0:1.0;float2 a=axis*20.0;
  for(int i=1;i<=14;i++){float t=float(i)/14.0*extension;float2 b=reach(t,side,target,axis,normal);
   float radius=mix(13.0,6.5,t)+sin(t*8.0-clock*1.4*motion+side)*1.2*motion;distance=merge(distance,capsule(p,a,b,radius),5.0);a=b;}
 }
 float mask=(1.0-smoothstep(-0.8,1.0,distance))*smoothstep(0.0,0.15,extension);
 float2 uv=float2(0.5)+float2(dot(p,axis),dot(p,normal))/175.0;
 uv+=float2(sin(uv.y*18.0+clock*motion),cos(uv.x*21.0-clock*motion))*0.013;
 half4 sample=tissueTexture.eval(clamp(uv,float2(0.27),float2(0.73))*textureSize);
 float3 tissue=float3(sample.rgb)/max(float(sample.a),0.0001);
 float edge=exp(-abs(distance+1.0)*0.85),inner=exp(-abs(distance+3.4)*0.72);
 float3 color=mix(tissue,float3(0.33,0.39,0.36),0.2)+edge*float3(0.37,0.47,0.44)+inner*float3(0.12,0.11,0.07);
 float alpha=mask*0.90;return half4(color*alpha,alpha);
}
`;
