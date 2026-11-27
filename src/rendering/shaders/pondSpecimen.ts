// Source pond_specimen.gdshader; the field child supplies the actual optical background.
import {pondOptics} from './pondOptics';
export const pondSpecimenShader=`
${pondOptics}
const float TAU=6.28318530718;
uniform float clock;
uniform float motion;
uniform float phase;
uniform float kind;
uniform float blur;
uniform float opacity;
uniform float3 water_grade;
uniform float3 water_base;
uniform float2 light_direction;
uniform float depth;
uniform shader pondWater;
uniform shader specimen;
uniform float2 textureSize;
uniform float2 spriteOrigin;
uniform float displayExtent;
uniform float2 spriteAnchor;
uniform float spriteRotation;
float4 sample_specimen(float2 uv){half4 c=specimen.eval(uv*textureSize);return float4(float3(c.rgb)/max(float(c.a),0.0001),float(c.a));}
uniform float2 frame_origin;



half4 main(float2 coord) {
 float2 UV=frame_origin+(coord-spriteOrigin)/displayExtent*.5;
 float2 q=coord-spriteAnchor;
 float2 world_point=spriteAnchor+float2(q.x*cos(spriteRotation)-q.y*sin(spriteRotation),q.x*sin(spriteRotation)+q.y*cos(spriteRotation));
	// UV refers to the whole 2x2 atlas; all deformation stays in this frame.
	float2 p = (UV - frame_origin) * 2.0 - float2(0.5);
	float t = clock * motion;
	float2 uv = UV;
	if (kind > 0.5 && kind < 1.5) {
		// A travelling contraction along the ciliate's diagonal body axis.
		float along = dot(p,float2(0.707,-0.707));
		float stroke = sin(t*2.3+along*10.0+phase);
		uv += (p*stroke*0.023+float2(0.707,0.707)*sin(along*9.0-t*1.7+phase)*abs(along)*0.028)*motion;
	} else if (kind > 2.5) {
		// Amoebae creep by extending unequal lobes around circulating cytoplasm.
		float angle = atan(p.y,p.x);
		float lobe = sin(angle*3.0-t*0.55+phase)*0.044+sin(angle*5.0+t*0.31+phase*1.7)*0.021;
		uv += (p*lobe+float2(-p.y,p.x)*sin(t*0.46+length(p)*11.0+phase)*0.016)*motion;
	}
	uv = clamp(uv,frame_origin+float2(0.006),frame_origin+float2(0.494));
	float4 c = sample_specimen(uv);
	float4 tissue = float4(c.rgb * c.a, c.a) * 0.44;
	for (int i = 0; i < 4; i++) {
		float angle = float(i) * TAU / 4.0 + 0.4;
		c = sample_specimen(clamp(uv + float2(cos(angle), sin(angle)) * blur,frame_origin+float2(0.006),frame_origin+float2(0.494)));
		tissue += float4(c.rgb * c.a, c.a) * 0.14;
	}
	float3 color = tissue.rgb / max(tissue.a, 0.001);
	float luma = dot(color, float3(0.2126, 0.7152, 0.0722));
	float3 optical = mix(float3(luma),color,0.52);
	float radius = length(world_point - float2(640.0, 450.0));
	float dish = 1.0 - smoothstep(350.0, 389.0, radius);
	float calm_center = mix(0.20, 1.0, smoothstep(55.0, 132.0, radius));
	float focus = mix(1.0,0.72,depth);
	// Refract the actual water behind the specimen. This ties its transparent
	// tissue to the local sediment and illumination instead of pasting on a cutout.
	float3 behind = float3(pondWater.eval(world_point+p*.55*(1.0-depth)).rgb);
	// A visible middle focal plane: photographic tissue detail survives, while
	// actual local water shows through it. Avoid double attenuation into darkness.
	float3 lit_tissue = mix(behind,float3(0.32,0.46,0.50)*water_grade,0.65);
	lit_tissue += (optical-float3(0.48))*float3(0.36,0.38,0.40);
	lit_tissue *= pond_illumination(world_point,t,light_direction);
	color = mix(behind,max(lit_tissue,behind*0.72),0.93-depth*0.24);
	float alpha=tissue.a*opacity*dish*calm_center*focus;
 return half4(color*alpha,alpha);
}
`;
