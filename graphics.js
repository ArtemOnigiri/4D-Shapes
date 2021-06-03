makeView(false, 0);
makeView(false, 1);
makeView(false, 2);
makeView(false, 3);
makeView(false, 4);

function makeView(orthogonal, mode) {
	let width;
	let height;
	let planes;
	let fontSize;
	if(mode == 0) {
		width = height = Math.min(window.innerWidth, window.innerHeight) / 3;
		planes = ['xy'];
		fontSize = ~~(width / 13);
	}
	else if(mode < 4) {
		width = Math.min(window.innerWidth, window.innerHeight);
		height = width / 3;
		planes = ['xy', 'xz', 'yz'];
		fontSize = ~~(width / 40);
	}
	else {
		width = Math.min(window.innerWidth, window.innerHeight);
		height = width / 3 * 2;
		planes = ['xy', 'xz', 'yz', 'wz', 'wx', 'wy'];
		fontSize = ~~(width / 40);
	}
	const container = document.createElement('div');
	const graphicsContainer = document.createElement('div');
	const cnv = document.createElement('canvas');
	const cnv2d = document.createElement('canvas');
	container.classList.add('view-container');
	graphicsContainer.classList.add('graphics-view-container');
	graphicsContainer.style.width = width + 'px';
	graphicsContainer.style.height = height + 'px';
	cnv.classList.add('graphics-view');
	cnv2d.classList.add('graphics-view');
	document.body.appendChild(container);
	container.appendChild(graphicsContainer);
	graphicsContainer.appendChild(cnv);
	cnv.width = width;
	cnv.height = height;
	graphicsContainer.appendChild(cnv2d);
	cnv2d.width = width;
	cnv2d.height = height;
	const gl = cnv.getContext('webgl');
	const ctx = cnv2d.getContext('2d');
	ctx.font = 'bold ' + fontSize + 'px sans-serif';
	for(let i = 0; i < planes.length; i++) {
		let charX = width / 3 / 20 + width / 3 *(i % 3);
		let charY = height / 10;
		if(mode == 4) {
			charY = height / 20;
			if(i > 2) charY += height / 2;
		}
		for(let j = 0; j < planes[i].length; j++) {
			let ch = planes[i].charAt(j);
			if(ch == 'x') ctx.fillStyle = '#e00';
			else if(ch == 'y') ctx.fillStyle = '#0c0';
			else if(ch == 'z') ctx.fillStyle = '#00f';
			else if(ch == 'w') ctx.fillStyle = '#ff0';
			else ctx.fillStyle = '#000';
			ctx.fillText(ch, charX, charY);
			charX += ctx.measureText(ch).width;
		}
	}
	let programs = [];
	let buffers;
	let time = 0;
	let currentTime = Date.now();
	gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
	buffers = makeBuffers(gl);
	if(mode == 0) {
		programs.push(makeProgram(planes[0], 0, orthogonal, mode, gl));
	}
	else if(mode < 4) {
		for(let i = 0; i < 3; i++) {
			programs.push(makeProgram(planes[i], i + 1, orthogonal, mode, gl));
		}
	}
	else {
		for(let i = 0; i < 6; i++) {
			programs.push(makeProgram(planes[i], i + 4, orthogonal, mode, gl));
		}
	}
	let view = {programs, buffers, time, currentTime, gl, container, active: true};
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
	const fragmentShaderCode = makeShader(plane, orthogonal, mode);
	gl.shaderSource(fragmentShader, fragmentShaderCode);
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
		view.container.remove();
	}
}