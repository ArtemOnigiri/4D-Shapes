const cnv = document.getElementById('cnv');
const width = cnv.width = window.innerWidth;
const height = cnv.height = width / 3;
const gl = cnv.getContext('webgl');

let programs = [];
let buffers;

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

function makeShader(plane) {
	return `
	precision mediump float;
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

	void main() {
		vec2 uv = v_texcoord * 2.0 - 1.0;
		uv.x *= u_aspect;
		vec3 p = vec3(uv, 0.0);
		// vec3 p = vec3(0.0, 0.0, 0.0);
		// p.` + plane + ` = uv;
		p.` + plane + ` *= rot(u_time);
		float dist = torus3(p, vec2(0.3, 0.1));
		float k = smoothstep(0.0, 0.005, dist);
		vec3 col = mix(vec3(0.25, 0.5, 1.0), vec3(0.75), k);
		gl_FragColor = vec4(col, 1.0);
	}
	`;
}

function makeShader3d(plane) {
	return `
	precision mediump float;
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
		float d = torus3(p, vec2(0.3, 0.1));
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
				return col;
			}
			if(d > 10.0) return vec3(0.75);
			p += d * rd;
		}
		return vec3(0.75);
	}

	void main() {
		vec2 uv = v_texcoord * 2.0 - 1.0;
		uv.x *= u_aspect;
		// vec3 ro = vec3(-1.0);
		// ro.` + plane + ` = vec2(0.0, 0.0);
		// vec3 rd = vec3(1.0, 1.0, 1.0);
		// rd.` + plane + ` = uv;
		vec3 ro = vec3(0.0, 0.0, -1.0);
		vec3 rd = vec3(uv, 1.0);
		rd = normalize(rd);
		vec3 col = march(ro, rd);
		gl_FragColor = vec4(col, 1.0);
	}
	`;
}

function makeBuffers() {
	const vertices = [];
	const texcoords = [];
	for(let i = 0; i < 6; i++) {
		vertices.push(quad[i * 2], quad[i * 2 + 1]);
	}
	for(let j = 0; j < 3; j++) {
		for(let i = 0; i < 6; i++) {
			let x = quad[i * 2] * 0.5 + 0.5;
			x = x / 3 + j / 3;
			x = x * 2 - 1;
			vertices.push(x, quad[i * 2 + 1]);
		}
	}
	for(let k = 0; k < 2; k++) {
		for(let j = 0; j < 3; j++) {
			for(let i = 0; i < 6; i++) {
				let x = quad[i * 2] * 0.5 + 0.5;
				x = x / 3 + j / 3;
				x = x * 2 - 1;
				let y = quad[i * 2 + 1] * 0.5 + 0.5;
				y = y / 2 + k / 2;
				y = (1 - y) * 2 - 1;
				vertices.push(x, y);
			}
		}
	}
	const texcoordBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(quadTex), gl.STATIC_DRAW);
	const positionBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
	return {position: positionBuffer, texcoord: texcoordBuffer};
}

function makeProgram(plane, offset) {
	const vertexShader = gl.createShader(gl.VERTEX_SHADER);
	gl.shaderSource(vertexShader, vertexShaderCode);
	gl.compileShader(vertexShader);
	const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
	gl.shaderSource(fragmentShader, makeShader3d(plane));
	gl.compileShader(fragmentShader);
	let log = gl.getShaderInfoLog(fragmentShader);
	if(log) console.log(log);
	const program = gl.createProgram();
	gl.attachShader(program, vertexShader);
	gl.attachShader(program, fragmentShader);
	gl.linkProgram(program);
	gl.deleteShader(vertexShader);
	gl.deleteShader(fragmentShader);
	gl.bindBuffer(gl.ARRAY_BUFFER, buffers.texcoord);
	const texcoordLocation = gl.getAttribLocation(program, "a_texcoord");
	gl.enableVertexAttribArray(texcoordLocation);
	gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
	const positionLocation = gl.getAttribLocation(program, 'a_position');
	gl.enableVertexAttribArray(positionLocation);
	gl.useProgram(program);
	const aspectLocation = gl.getUniformLocation(program, 'u_aspect');
	const aspect = 1;
	gl.uniform1f(aspectLocation, aspect);
	timeLocation = gl.getUniformLocation(program, 'u_time');
	return {program: program, position: positionLocation, texcoord: texcoordLocation, time: timeLocation, offset: offset};
}

let time = 0;
let currentTime = Date.now();
let interval;
let timeLocation;
initGL();

function initGL() {
	gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

	buffers = makeBuffers();
	programs.push(makeProgram('xy', 1));
	programs.push(makeProgram('xz', 2));
	programs.push(makeProgram('yz', 3));

	window.requestAnimationFrame(update);
}

function update() {
	let currentTimeNew = Date.now();
	let deltaTime = currentTimeNew - currentTime;
	time += deltaTime;
	currentTime = currentTimeNew;
	for(let i = 0; i < 3; i++) {
		gl.useProgram(programs[i].program);
		gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
		gl.vertexAttribPointer(programs[i].position, 2, gl.FLOAT, false, 0, programs[i].offset * 4 * 12);
		gl.bindBuffer(gl.ARRAY_BUFFER, buffers.texcoord);
		gl.vertexAttribPointer(programs[i].texcoord, 2, gl.FLOAT, false, 0, 0);
		gl.uniform1f(programs[i].time, time * 0.001);
		gl.drawArrays(gl.TRIANGLES, 0, 6);
	}
	window.requestAnimationFrame(update);
}