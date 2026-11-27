// SkSL translation of prototype/shaders/phage.gdshader. See CREDITS.md.
// Rigid capsid, contracting sheath and independently flexing tail fibres.
export const phageShader=`
uniform shader tissueTexture;
uniform float2 textureSize;
uniform float2 displaySize;
uniform float2 spriteOrigin;
uniform float clock;
uniform float phase;
uniform float motion;
uniform float contraction;
half4 main(float2 xy){
 float2 UV=(xy-spriteOrigin)/displaySize,uv=UV;
 float shift=contraction*0.085,head_end=0.36+shift;
 if(uv.y<head_end)uv.y-=shift;
 else if(uv.y<0.69)uv.y=mix(0.36,0.69,(uv.y-head_end)/(0.69-head_end));
 float legs=smoothstep(0.62,0.83,UV.y),side=sign(UV.x-0.5),time=clock*motion;
 uv.x+=side*sin(time*1.1+phase+UV.y*16.0+side)*0.020*legs*(1.0-contraction)*motion;
 uv.y+=sin(time*0.8+phase+UV.x*12.0)*0.008*legs*(1.0-contraction)*motion;
 half4 source=tissueTexture.eval(uv*textureSize);float alpha=float(source.a);float3 tissue=float3(source.rgb)/max(alpha,0.0001);
 alpha*=smoothstep(0.05,0.28,alpha);float3 color=mix(tissue,tissue*float3(0.80,0.93,1.0),0.40);
 return half4(color*alpha,alpha);
}
`;
