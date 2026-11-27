// SkSL translation of prototype/shaders/amoeba_body.gdshader. See CREDITS.md.
// A whole-cell distance union avoids an internal seam while the mouth closes.
// Runtime effects use finite differences for the original fragment derivatives.
import {pondOptics} from './pondOptics';
export const amoebaBodyShader=`
${pondOptics}
uniform shader tissueTexture;
uniform shader outlineTexture;
uniform float2 textureSize;
uniform float2 outlineSize;
uniform float2 rectOrigin;
uniform float2 extent;
uniform float2 origin;
uniform float2 target;
uniform float clock;
uniform float crawl;
uniform float motion;
uniform float phase;
uniform float arrival;
uniform float extension;
uniform float ingestion;
uniform float closure;
uniform float meal;
uniform float3 water_base;
const float2 NUCLEUS=float2(0.534,0.463);
const float SIZE=152.0;
float3 tissue(float2 uv){half4 c=tissueTexture.eval(uv*textureSize);return float3(c.rgb)/max(float(c.a),0.0001);}
float capsule(float2 p,float2 a,float2 b,float r){float2 ab=b-a;return length(p-a-ab*clamp(dot(p-a,ab)/max(dot(ab,ab),0.001),0.0,1.0))-r;}
float merge(float a,float b,float k){float h=clamp(0.5+0.5*(b-a)/k,0.0,1.0);return mix(b,a,h)-k*h*(1.0-h);}
float2 body_coordinate(float2 p){
 float cycle=crawl*motion,surge=sin(cycle),retract=sin(cycle-1.2),mobile=smoothstep(9.0,29.0,length(p));float2 q=p;
 float front=smoothstep(2.0,57.0,p.x),rear=1.0-smoothstep(-65.0,-4.0,p.x);
 q.x/=1.0+(front*(0.08+0.27*surge)-rear*0.20*retract)*motion;
 q.y/=1.0-0.12*surge*mobile*motion;
 q.y-=sin(cycle*0.71+phase)*12.0*exp(-pow((p.x+22.0)/29.0,2.0))*smoothstep(4.0,32.0,p.y)*motion;
 q.y+=sin(p.x*0.048-cycle)*3.0*mobile*motion;
 q.x*=1.0+extension*rear*0.12;q.y*=1.0+extension*mobile*0.09;return mix(p,q,mobile);
}
float original_distance(float2 uv){
 float2 bounded=clamp(uv,float2(0.001),float2(0.999));
 // Signed data is encoded around 0.5 to survive normalized native sampling.
 float distance=(float(outlineTexture.eval(bounded*outlineSize).r)-0.5)*2.0;
 return distance*SIZE+length(uv-bounded)*SIZE;
}
float2 reach(float t,float side,float2 axis,float2 normal){
 float travel=smoothstep(0.0,0.72,t);float2 at=mix(axis*9.0,target-axis*22.0,travel);float wrap=smoothstep(0.48,1.0,t)*(2.78+closure*0.36);
 at+=axis*(1.0-cos(wrap))*22.0;at+=normal*side*(sin(t*3.14159)*11.0+sin(wrap)*26.0);return at;
}
float surface_distance(float2 p){
 float distance=original_distance(NUCLEUS+body_coordinate(p)/SIZE);
 float2 axis=normalize(target+float2(0.001,0.0)),normal=float2(-axis.y,axis.x);
 if(extension>0.001){
  for(int side_index=0;side_index<2;side_index++){
   float side=side_index==0?-1.0:1.0;float2 a=axis*9.0;
   for(int i=1;i<=12;i++){float progress=float(i)/12.0*extension;float2 b=reach(progress,side,axis,normal);
    float radius=mix(18.0,7.0,progress)*smoothstep(0.0,0.14,extension);distance=merge(distance,capsule(p,a,b,radius),9.0);a=b;}
  }
 }
 float chamber_radius=mix(-32.0,27.0*(1.0-meal*0.20),closure);
 if(closure>0.001)distance=merge(distance,length(p-target)-chamber_radius,9.0);
 return distance;
}
half4 main(float2 xy){
 float2 p=xy-rectOrigin-origin,q=body_coordinate(p),uv=NUCLEUS+q/SIZE;
 float distance=surface_distance(p);float2 axis=normalize(target+float2(0.001,0.0)),normal=float2(-axis.y,axis.x);
 float t=clock*motion,nuclear_pin=smoothstep(11.0,23.0,length(p));
 float2 material_q=q-axis*extension*max(0.0,length(target)-43.0)*smoothstep(8.0,max(35.0,length(target)+24.0),dot(q,axis))*nuclear_pin;
 float2 material_uv=NUCLEUS+float2(atan(material_q.x/75.0)*0.27,atan(material_q.y/36.0)*0.12);
 material_uv=mix(NUCLEUS+p/SIZE,material_uv,smoothstep(12.0,35.0,length(p)));
 float stream_phase=fract(t*0.09+phase),alternate_phase=fract(stream_phase+0.5),stream_weight=pow(sin(stream_phase*3.14159265),2.0),stream_strength=nuclear_pin*motion;
 float2 flow=axis*(stream_phase-0.5)*0.07+normal*0.004*sin(q.x*0.08-t*0.61+phase);
 float2 alternate_flow=axis*(alternate_phase-0.5)*0.07+normal*0.004*sin(q.x*0.08-t*0.61+phase);
 float3 color=mix(tissue(material_uv-alternate_flow*stream_strength),tissue(material_uv-flow*stream_strength),stream_weight);
 float core=1.0-smoothstep(9.0,13.0,length(p));float3 nucleus=tissue(NUCLEUS+p/SIZE)*float3(1.15,1.05,0.78);color=mix(color,nucleus,core);
 float clear_band=exp(-abs(distance+2.6)*0.43),rim=exp(-abs(distance+0.9)*1.05),inner_rim=exp(-abs(distance+3.4)*1.6);
 float2 surface_normal=normalize(float2(surface_distance(p+float2(0.65,0.0))-distance,surface_distance(p+float2(0.0,0.65))-distance)+float2(0.00001));
 float lighting=dot(surface_normal,normalize(float2(-0.65,-0.76)));
 color=mix(color,float3(0.40,0.56,0.59),clear_band*0.50);
 color+=rim*(0.30+max(0.0,lighting)*0.28)*float3(0.72,0.94,1.0)+inner_rim*0.12*float3(0.65,0.86,0.91);
 color=pond_focal_tone(color,water_base,0.19);
 float mask=1.0-smoothstep(-0.65,0.7,distance),alpha=mix(0.77,0.98,max(clear_band,rim))*mask*smoothstep(0.0,0.65,arrival);
 return half4(color*alpha,alpha);
}
`;
