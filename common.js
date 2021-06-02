const quad = [
	-0.99, -0.99,
	 0.99, -0.99,
	 0.99,  0.99,
	 0.99,  0.99,
	-0.99,  0.99,
	-0.99, -0.99,
];

const quadTex = [
	0, 0,
	1, 0,
	1, 1,
	1, 1,
	0, 1,
	0, 0,
];

const vertexShaderCode = `
	attribute vec2 a_position;
	attribute vec2 a_texcoord;
	varying vec2 v_texcoord;
	void main() {
		v_texcoord = a_texcoord;
		gl_Position = vec4(a_position, 0.0, 1.0);
	}
`;

function makeShader(plane, orthogonal) {
	const topView = 'vec3 p = vec3(uv, 0.0);';
	const orthogonalView = `vec3 p = vec3(0.0, 0.0, 0.0);
	p.` + plane + ` = uv;`;
	const view = orthogonal ? orthogonalView : topView;
	return `
	precision highp float;
	uniform float u_time;
	uniform float u_aspect;
	varying vec2 v_texcoord;

	mat2 rot(float a) {
		float s = sin(a);
		float c = cos(a);
		return mat2(c, -s, s, c);
	}

	float torus3(vec3 p, vec2 r) {
		float d2 = length(p.xy) - r.x;
		float d3 = length(vec2(d2, p.z)) - r.y;
		return d3;
	}
	
	vec3 draw2D(vec2 uv) {
		` + view + `
		p.` + plane + ` *= rot(u_time);
		float dist = torus3(p, vec2(0.4, 0.15));
		float k = smoothstep(0.0, 0.005, dist);
		vec3 col = mix(vec3(0.25, 0.5, 1.0), vec3(0.75), k);
		return col;
	}

	void main() {
		vec2 uv = v_texcoord * 2.0 - 1.0;
		uv.x *= u_aspect;
		vec3 col = draw2D(uv);
		gl_FragColor = vec4(col, 1.0);
	}
	`;
}

function makeShader3d(plane, orthogonal) {
	const topView = `vec3 ro = vec3(uv * 0.25, -1.0);
	vec3 rd = vec3(uv, 1.3);`;
	const orthogonalView = `vec3 ro = vec3(-1.0);
	ro.` + plane + ` = vec2(uv * 0.25);
	vec3 rd = vec3(1.3);
	rd.` + plane + ` = uv;`;
	const view = orthogonal ? orthogonalView : topView;
	return `
	precision highp float;
	uniform float u_time;
	uniform float u_aspect;
	varying vec2 v_texcoord;

	mat2 rot(float a) {
		float s = sin(a);
		float c = cos(a);
		return mat2(c, -s, s, c);
	}

	float torus3(vec3 p, vec2 r) {
		float d2 = length(p.xy) - r.x;
		float d3 = length(vec2(d2, p.z)) - r.y;
		return d3;
	}

	float getDist(vec3 p) {
		p.` + plane + ` *= rot(u_time);
		float d = torus3(p, vec2(0.4, 0.15));
		return d;
	}

	vec3 getNormal(vec3 p) {
		float d = getDist(p);
		vec2 e = vec2(0.0001, 0);
		vec3 n = d - vec3(getDist(p - e.xyy), getDist(p - e.yxy), getDist(p - e.yyx));
		return normalize(n);
	}

	vec3 march(vec3 ro, vec3 rd) {
		vec3 p = ro;
		for(int i = 0; i < 200; i++) {
			float d = getDist(p);
			if(d < 0.001) {
				vec3 light = normalize(vec3(0.5, -0.5, -1.0));
				vec3 n = getNormal(p);
				float diff = max(0.0, dot(light, n)) * 0.5 + 0.5;
				float spec = max(0.0, dot(light, reflect(rd, n)));
				vec3 col = vec3(0.25, 0.5, 1.0) * diff + pow(spec, 32.0) * 0.5;
				return clamp(col, vec3(0.0), vec3(1.0));
			}
			if(d > 10.0) return vec3(0.75);
			p += d * rd;
		}
		return vec3(0.75);
	}

	void main() {
		vec2 uv = v_texcoord * 2.0 - 1.0;
		uv.x *= u_aspect;
		` + view + `
		rd = normalize(rd);
		vec3 col = march(ro, rd);
		gl_FragColor = vec4(col, 1.0);
	}
	`;
}