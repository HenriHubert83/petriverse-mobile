// SkSL translation of prototype/shaders/depth_tissue.gdshader. See CREDITS.md.
export const depthTissueShader=`
uniform shader tissueTexture;
uniform float2 textureSize;
uniform float2 displaySize;
uniform float2 spriteOrigin;
uniform float2 spriteAnchor;
uniform float spriteRotation;
uniform float blur;
uniform float clock;
uniform float motion;
uniform float phase;
float4 tissue(float2 uv){half4 c=tissueTexture.eval(uv*textureSize);return float4(float3(c.rgb)/max(float(c.a),0.0001),float(c.a));}
half4 main(float2 xy){
 float2 UV=(xy-spriteOrigin)/displaySize,p=UV-float2(0.5),uv=UV+p*sin(clock*0.7+phase)*0.045*motion;
 float4 color=tissue(uv)*0.20;
 for(int i=0;i<8;i++){float a=float(i)*6.28318530718/8.0;color+=tissue(uv+float2(cos(a),sin(a))*blur)*0.10;}
 float luma=dot(color.rgb,float3(0.2,0.7,0.1));
 float2 offset=xy-spriteAnchor;float c=cos(spriteRotation),s=sin(spriteRotation);
 float2 world_point=spriteAnchor+float2(c*offset.x-s*offset.y,s*offset.x+c*offset.y);
 float mask=1.0-smoothstep(350.0,388.0,length(world_point-float2(640.0,450.0)));
 float alpha=color.a*mask;return half4(float3(0.36,0.65,0.78)*luma*alpha,alpha);
}
`;
