// Source lens_optics.gdshader adapted to a Skia runtime image filter. Explicit
// sample taps approximate Godot mip LOD; native GPU optical matching is pending.
export const lensOpticsShader=`
uniform shader image;
uniform float2 lens_center;
uniform float lens_radius;
uniform float aberration;
uniform float bloom;
uniform float softness;
uniform float defocus;
uniform float grain;
uniform float saturation;
uniform float exposure;
float3 sample_blur(float2 p,float radius){
 float3 color=float3(image.eval(p).rgb)*0.4;
 color+=float3(image.eval(p+float2(radius,0)).rgb)*0.15;
 color+=float3(image.eval(p-float2(radius,0)).rgb)*0.15;
 color+=float3(image.eval(p+float2(0,radius)).rgb)*0.15;
 color+=float3(image.eval(p-float2(0,radius)).rgb)*0.15;
 return color;
}
half4 main(float2 px){
 float2 offset=px-lens_center;
 float r=length(offset)/lens_radius;
 float2 radial=offset/max(length(offset),1.0);
 float spread=aberration*smoothstep(0.62,1.03,r)*1.8;
 float blur=softness*smoothstep(0.93,1.04,r)*1.3+defocus*3.2;
 float3 color=float3(sample_blur(px-radial*spread,blur).r,sample_blur(px,blur).g,sample_blur(px+radial*spread,blur).b);
 if(defocus>0.01){
  float3 soft=float3(0.0);
  for(int i=0;i<4;i++){float a=float(i)*1.5708+0.39;soft+=sample_blur(px+float2(cos(a),sin(a))*defocus*9.0,blur);}
  color=mix(color,soft*.25,clamp(defocus*1.4,0.0,1.0));
 }
 if(bloom>0.0){
  float3 wide=sample_blur(px,11.3)*0.55+sample_blur(px,32.0)*0.45;
  float luma=dot(wide,float3(0.2126,0.7152,0.0722));
  color+=wide*smoothstep(0.22,0.66,luma)*bloom*0.24*(1.0-smoothstep(0.98,1.06,r));
 }
 float grey=dot(color,float3(0.2126,0.7152,0.0722));
 color=mix(float3(grey),color,saturation)*exposure;
 float n=fract(sin(dot(floor(px*1.5),float2(12.9898,78.233)))*43758.5453)-0.5;
 color+=n*grain*0.012;
 half alpha=image.eval(px).a;
 return half4(color*float(alpha),alpha);
}`;
