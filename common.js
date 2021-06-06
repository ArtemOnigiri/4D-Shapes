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

function makeShader(plane, orthogonal, mode, operations) {
	let dim = 2;
	if(mode == 1 || mode == 2 || mode == 3) dim = 3;
	else if(mode == 4) dim = 4;
	const topView2d = 'vec3 p = vec3(uv, 0.0);';
	const orthogonalView2d = `vec3 p = vec3(0.0, 0.0, 0.0);
	p.` + plane + ` = uv;`;
	const view2d = orthogonal ? orthogonalView2d : topView2d;
	const topView3d = `vec3 ro = vec3(uv * 0.25, -1.0);
	vec3 rd = vec3(uv, 1.3);`;
	const orthogonalView3d = `vec3 ro = vec3(-1.0);
	ro.` + plane + ` = vec2(uv * 0.25);
	vec3 rd = vec3(1.3);
	rd.` + plane + ` = uv;`;
	const view3d = orthogonal ? orthogonalView3d : topView3d;
	const view4d = topView3d;
	const mode2d = 'vec3 col = draw2D(uv);'
	const mode3d = `vec4 col3d = draw3D(uv);
	vec3 col = mix(vec3(0.75), col3d.rgb, col3d.a);`;
	const mode2and3d = `vec3 col2d = draw2D(uv);
	vec4 col3d = draw3D(uv);
	vec3 col = mix(col2d, col3d.rgb, col3d.a * 0.5);`;
	const mode4d = `vec3 col = draw4D(uv);`;
	let modeCode;
	let col3d = '0.25, 0.5, 1.0';
	if(mode == 1) modeCode = mode2d;
	else if(mode == 2) modeCode = mode3d;
	else if(mode == 3) {
		modeCode = mode2and3d;
		col3d = '0.4, 0.5, 0.6';
	}
	else if(mode == 4) modeCode = mode4d;
	else modeCode = mode2d;
	let distFunc = `vec3 rp = p;
	rp.` + plane + ` *= rot(u_time);`;
	let distFunc3 = '';
	let shape2d;
	if(operations[0] == 1) {
		shape2d = (a, r) => 'box(' + a + ', ' + r + ')';
	}
	else if(operations[0] == 2) {
		shape2d = (a, r) => 'length(' + a + ') - ' + r;
	}
	else if(operations[0] == 3) {
		shape2d = (a, r) => 'triangle(' + a + ', ' + r + ')';
	}
	else if(operations[0] == 4) {
		shape2d = (a, r) => 'hexagon(' + a + ', ' + r + ')';
	}
	if(dim == 2) {
		let arg = 'rp.xy';
		distFunc += 'float d = ' + shape2d(arg, 'u_values.x') + ';';
	}
	else if(dim == 3 || dim == 4) {
		if(operations[1] == 2) {
			let arg = 'revolve(rp.xy, u_values.y, rp.z)';
			distFunc += 'float d = ' + shape2d(arg, 'u_values.x') + ';';
		}
		else {
			distFunc += 'float d = ' + shape2d('rp.xy', 'u_values.x') + ';';
			if(operations[1] == 1) {
				distFunc3 += 'd = extrude(rp.z, d, u_values.y);';
			}
			else if(operations[1] == 3) {
				distFunc3 += 'd = squeeze(rp.z, d, u_values.y, u_values.x);';
			}
		}
		if(dim == 3) distFunc += distFunc3;
	}
	if(dim == 4) {
		distFunc = `vec4 rp = vec4(p, 0.0);
		rp.` + plane + ` *= rot(u_time);`;
		if(operations[1] == 2 && operations[2] == 2) {
			let arg = 'revolve(revolve(rp.xy, u_values.z, rp.z), u_values.y, rp.w)';
			distFunc += 'float d = ' + shape2d(arg, 'u_values.x') + ';'
		}
		else {
			if(operations[2] == 2) {
				let arg = 'revolve(rp.xy, u_values.z, rp.w)';
				distFunc += 'float d = ' + shape2d(arg, 'u_values.x') + ';';
			}
			else if(operations[1] == 2) {
				let arg = 'revolve(rp.xy, u_values.y, rp.z)';
				distFunc += 'float d = ' + shape2d(arg, 'u_values.x') + ';';
			}
			else {
				distFunc += 'float d = ' + shape2d('rp.xy', 'u_values.x') + ';';
			}
			distFunc += distFunc3;
			if(operations[2] == 1) {
				distFunc += 'd = extrude(rp.w, d, u_values.z);';
			}
			if(operations[2] == 3) {
				distFunc += 'd = squeeze(rp.w, d, u_values.z, u_values.y);';
			}
		}
	}


	let draw2D = '';
	if(mode == 0 || mode == 1 || mode == 3) {
		draw2D = `vec3 draw2D(vec2 uv) {
		` + view2d + `
		float dist = getDist(p);
		float k = smoothstep(0.0, 0.005, dist);
		vec3 col = mix(vec3(0.25, 0.5, 1.0), vec3(0.75), k);
		return col;
		}`;
	}
	return `
	precision highp float;
	uniform float u_time;
	uniform float u_aspect;
	uniform vec3 u_values;
	varying vec2 v_texcoord;

	mat2 rot(float a) {
		float s = sin(a);
		float c = cos(a);
		return mat2(c, -s, s, c);
	}

	float extrude(float p, float d, float h) {
		vec2 w = vec2(d, abs(p) - h);
		return min(max(w.x, w.y), 0.0) + length(max(w, 0.0));
	}

	vec2 revolve(vec2 uv, float r, float h) {
		return vec2(length(uv) - r, h);
	}

	float squeeze(float p, float d, float h, float h0) {
		return length(vec2(d + h0, p)) - h;
	}

	float box(vec2 p, float b) {
		vec2 d = abs(p) - b;
		return length(max(d,0.0)) + min(max(d.x,d.y),0.0);
	}

	float hexagon(vec2 p, float r) {
		const vec3 k = vec3(-0.866025404,0.5,0.577350269);
		p = abs(p);
		p -= 2.0*min(dot(k.xy,p),0.0)*k.xy;
		p -= vec2(clamp(p.x, -k.z*r, k.z*r), r);
		return length(p) * sign(p.y);
	}

	float triangle(vec2 p, float r) {
		const float k = sqrt(3.0);
		p.x = abs(p.x) - r;
		p.y = p.y + r/k;
		if( p.x+k*p.y>0.0 ) p=vec2(p.x-k*p.y,-k*p.x-p.y)/2.0;
		p.x -= clamp( p.x, -2.0*r, 0.0 );
		return -length(p)*sign(p.y);
	}

	float tiger(vec4 p, vec3 r) {
		float d = pow(sqrt(p.x*p.x + p.y*p.y) - 0.4, 2.0) + pow(sqrt(p.z*p.z + p.w*p.w) - 0.4, 2.0);
		return d;
	}

	float getDist(vec3 p) {
		` + distFunc + `
		return d;
	}

	vec3 getNormal(vec3 p) {
		float d = getDist(p);
		vec2 e = vec2(0.0001, 0);
		vec3 n = d - vec3(getDist(p - e.xyy), getDist(p - e.yxy), getDist(p - e.yyx));
		return normalize(n);
	}

	vec4 march(vec3 ro, vec3 rd) {
		vec3 p = ro;
		for(int i = 0; i < 200; i++) {
			float d = getDist(p);
			if(d < 0.001) {
				vec3 light = normalize(vec3(0.5, -0.5, -1.0));
				vec3 n = getNormal(p);
				float diff = max(0.0, dot(light, n)) * 0.5 + 0.5;
				float spec = max(0.0, dot(light, reflect(rd, n)));
				vec3 col = vec3(` + col3d + `) * diff + pow(spec, 32.0) * 0.5;
				col = clamp(col, vec3(0.0), vec3(1.0));
				return vec4(col, 1.0);
			}
			if(d > 10.0) return vec4(0.0);
			p += d * rd;
		}
		return vec4(0.0);
	}

	` + draw2D + `

	vec4 draw3D(vec2 uv) {
		` + view3d + `
		rd = normalize(rd);
		return march(ro, rd);
	}

	vec3 draw4D(vec2 uv) {
		` + view4d + `
		rd = normalize(rd);
		vec4 col = march(ro, rd);
		return mix(vec3(0.75), col.rgb, col.a);
	}

	void main() {
		vec2 uv = v_texcoord * 2.0 - 1.0;
		uv.x *= u_aspect;
		` + modeCode + `
		gl_FragColor = vec4(col, 1.0);
	}
	`;
}