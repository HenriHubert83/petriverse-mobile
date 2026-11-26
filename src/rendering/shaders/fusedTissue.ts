// Source fused_tissue.gdshader, adapted to SkSL pixel coordinates. See CREDITS.md.
import {organicMotion} from './organicMotion';
import {pondOptics} from './pondOptics';
export const fusedTissueShader=`
${organicMotion}
${pondOptics}

uniform shader tissueTexture;
uniform float2 textureSize;
uniform float2 bounds_size;
uniform float2 members[12];
uniform float member_count;
uniform float fusion;
uniform float opacity;
uniform float clock;
uniform float feeding;
uniform float mastery;
uniform float3 colony_grade;
uniform float3 water_base;
uniform float2 light_direction;



float4 sample_tissue(float2 uv){half4 c=tissueTexture.eval(uv*textureSize);return float4(float3(c.rgb)/max(float(c.a),0.0001),float(c.a));}
float noise(float2 p) {
	float2 i = floor(p);
	float2 f = fract(p);
	f = f * f * (3.0 - 2.0 * f);
	float4 n = sin(float4(dot(i, float2(127.1, 311.7)), dot(i + float2(1, 0), float2(127.1, 311.7)), dot(i + float2(0, 1), float2(127.1, 311.7)), dot(i + float2(1, 1), float2(127.1, 311.7)))) * 43758.5453;
	n = fract(n);
	return mix(mix(n.x, n.y, f.x), mix(n.z, n.w, f.x), f.y);
}

float joined(float a, float b, float softness) {
	float h = max(softness - abs(a - b), 0.0) / softness;
	return min(a, b) - h * h * softness * 0.25;
}

half4 main(float2 p) {
 float2 water_position=p;
	float radius = mix(24.0, 19.0 * sqrt(float(member_count)), fusion);
	radius *= 1.0+organic_beat(clock*1.8)*0.022*fusion;
	float distance_to_body = 10000.0;
	float nearest = 10000.0;
	for (int i = 0; i < 12; i++) {
		if(float(i)>=member_count)break;
		float d = length(p - members[i]);
		nearest = min(nearest, d);
		distance_to_body = joined(distance_to_body, d - radius, 12.0 + fusion * 8.0);
	}
	// Blend the cytoplasm's coordinates too: internal cell membranes must not
	// survive inside the union. Once joined this samples one continuous body.
	float2 tissue_center = float2(0.0);
	float total = 0.0;
	for (int i = 0; i < 12; i++) {
		if(float(i)>=member_count)break;
		float w = exp(-(length(p - members[i]) - nearest) / mix(8.0, 80.0, fusion));
		tissue_center += members[i] * w;
		total += w;
	}
	tissue_center /= total;
	float2 q = (p - tissue_center) / (radius + 5.0);
	float angle = atan(q.y, q.x);
	float ripple = (noise(p*0.10+float2(clock*0.12,-clock*0.08))-0.5)*1.7;
	ripple += sin(angle*3.0-clock*1.2+sin(clock*0.39))*1.15*fusion;
	float d = distance_to_body + ripple;
	float2 flow = organic_current(q,clock)*0.034;
	flow += float2(-q.y,q.x)*sin(clock*0.71+length(q)*4.0)*0.013;
	float4 tissue = sample_tissue(float2(0.5) + q * 0.31 + flow);
	float grain = noise(p * 0.65 + float2(clock * 0.12, clock * 0.09));
	float membrane = exp(-abs(d + 1.0) * 0.65);
	float inner_rim = exp(-abs(d + 4.0) * 0.48);
	float core = 1.0 - smoothstep(0.1, 0.95, length(q));
	float3 color = tissue.rgb * float3(0.76, 0.94, 1.04);
	color += float3(0.045, 0.095, 0.12) * grain;
	float grazing = 0.55+0.45*max(0.0,dot(normalize(q+float2(0.001)),normalize(float2(-0.7,-1.0))));
	color += float3(0.48,0.76,0.83)*membrane*(0.65+grain*0.35)*grazing;
	color += float3(0.08, 0.20, 0.24) * inner_rim;
	float folds = exp(-abs(d+7.0+sin(angle*9.0-clock*0.53)*1.2)*0.55);
	color += float3(0.08,0.15,0.18)*folds*fusion;
	color += float3(0.38, 0.22, 0.04) * feeding * core * (0.4 + grain * 0.6);
	// An exceptional capture warms the membrane from within, without confetti.
	float pearl = exp(-abs(d+5.0+sin(angle*3.0-clock)*2.0)*0.36);
	color += float3(0.18,0.22,0.10)*pearl*mastery*feeding;
	float coverage = 1.0 - smoothstep(-0.5, 1.4, d);
	color *= mix(float3(1.0), colony_grade, smoothstep(0.0, 0.12, color.b-color.r));
	color = pond_focal_tone(color,water_base,0.16)*pond_illumination(water_position,clock,light_direction);
	float alpha=coverage*opacity*(0.86+membrane*0.14);
 return half4(color*alpha,alpha);
}
`;
