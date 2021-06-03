makeView(false, 0);
makeView(false, 1);
makeView(false, 2);

function makeView(orthogonal, mode) {
	const cnv = document.createElement('canvas');
	cnv.classList.add('graphics-view');
	document.body.appendChild(cnv);
	cnv.width = Math.min(window.innerWidth, window.innerHeight);
	cnv.height = cnv.width / 3;
	const gl = cnv.getContext('webgl');
	let programs = [];
	let buffers;
	let time = 0;
	let currentTime = Date.now();
	gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
	buffers = makeBuffers(gl);
	programs.push(makeProgram('xy', 1, orthogonal, mode, gl));
	programs.push(makeProgram('xz', 2, orthogonal, mode, gl));
	programs.push(makeProgram('yz', 3, orthogonal, mode, gl));
	let view = {programs, buffers, time, currentTime, gl, active: true};
	window.requestAnimationFrame(() => update(view));
	return view;
}

function makeBuffers(gl) {
	const vertices = [];
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

function makeProgram(plane, offset, orthogonal, mode, gl) {
	const vertexShader = gl.createShader(gl.VERTEX_SHADER);
	gl.shaderSource(vertexShader, vertexShaderCode);
	gl.compileShader(vertexShader);
	const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
	gl.shaderSource(fragmentShader, makeShader(plane, orthogonal, mode));
	gl.compileShader(fragmentShader);
	let log = gl.getShaderInfoLog(fragmentShader);
	if(log) console.log(log);
	const program = gl.createProgram();
	gl.attachShader(program, vertexShader);
	gl.attachShader(program, fragmentShader);
	gl.linkProgram(program);
	gl.deleteShader(vertexShader);
	gl.deleteShader(fragmentShader);
	const texcoordLocation = gl.getAttribLocation(program, "a_texcoord");
	gl.enableVertexAttribArray(texcoordLocation);
	const positionLocation = gl.getAttribLocation(program, 'a_position');
	gl.enableVertexAttribArray(positionLocation);
	gl.useProgram(program);
	const aspectLocation = gl.getUniformLocation(program, 'u_aspect');
	const aspect = 1;
	gl.uniform1f(aspectLocation, aspect);
	const timeLocation = gl.getUniformLocation(program, 'u_time');
	return {program: program, position: positionLocation, texcoord: texcoordLocation, time: timeLocation, offset: offset};
}

function update(view) {
	let currentTimeNew = Date.now();
	let deltaTime = currentTimeNew - view.currentTime;
	view.time += deltaTime;
	view.currentTime = currentTimeNew;
	for(let i = 0; i < view.programs.length; i++) {
		view.gl.useProgram(view.programs[i].program);
		view.gl.bindBuffer(view.gl.ARRAY_BUFFER, view.buffers.position);
		view.gl.vertexAttribPointer(view.programs[i].position, 2, view.gl.FLOAT, false, 0, view.programs[i].offset * 4 * 12);
		view.gl.bindBuffer(view.gl.ARRAY_BUFFER, view.buffers.texcoord);
		view.gl.vertexAttribPointer(view.programs[i].texcoord, 2, view.gl.FLOAT, false, 0, 0);
		view.gl.uniform1f(view.programs[i].time, view.time * 0.001);
		view.gl.drawArrays(view.gl.TRIANGLES, 0, 6);
	}
	if(view.active) window.requestAnimationFrame(() => update(view));
	else {
		for(let i = 0; i < view.programs.length; i++) {
			view.gl.deleteProgram(view.programs[i].program);
		}
		view.gl.deleteBuffer(view.buffers.position);
		view.gl.deleteBuffer(view.buffers.texcoord);
	}
}