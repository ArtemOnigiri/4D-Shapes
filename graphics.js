let values = [0.05, 0.15, 0.5];
let operations = [2, 2, 2];
let views = [makeView(false, 0), makeView(false, 2), makeView(false, 4)];

const range2d = document.getElementById('setting-range-2d');
const rangeValue2d = document.getElementById('setting-range-value-2d');
range2d.oninput = () => {
	values[0] = range2d.value / 200;
	rangeValue2d.textContent = values[0].toFixed(2);
};
const options2d = document.getElementById('options-div-2d').children;
for(let i = 0; i < options2d.length; i++) {
	options2d[i].addEventListener('click', () => {
		for(let j = 0; j < options2d.length; j++) {
			options2d[j].classList.remove('setting-option-active');
		}
		options2d[i].classList.add('setting-option-active');
		operations[0] = i + 1;
		updateViews();
	});
}

const range3d = document.getElementById('setting-range-3d');
const rangeValue3d = document.getElementById('setting-range-value-3d');
range3d.oninput = () => {
	values[1] = range3d.value / 200;
	rangeValue3d.textContent = values[1].toFixed(2);
};
const options3d = document.getElementById('options-div-3d').children;
for(let i = 0; i < options3d.length; i++) {
	options3d[i].addEventListener('click', () => {
		for(let j = 0; j < options3d.length; j++) {
			options3d[j].classList.remove('setting-option-active');
		}
		options3d[i].classList.add('setting-option-active');
		operations[1] = i + 1;
		updateViews();
	});
}

const range4d = document.getElementById('setting-range-4d');
const rangeValue4d = document.getElementById('setting-range-value-4d');
range4d.oninput = () => {
	values[2] = range4d.value / 200;
	rangeValue4d.textContent = values[2].toFixed(2);
};
const options4d = document.getElementById('options-div-4d').children;
for(let i = 0; i < options4d.length; i++) {
	options4d[i].addEventListener('click', () => {
		for(let j = 0; j < options4d.length; j++) {
			options4d[j].classList.remove('setting-option-active');
		}
		options4d[i].classList.add('setting-option-active');
		operations[2] = i + 1;
		updateViews();
	});
}

function updateViews() {
	for(let i = 0; i < views.length; i++) {
		views[i].onDelete = () => {
			views[i] = makeView(false, i * 2);
		};
		views[i].active = false;
	}
}

function makeView(orthogonal, mode) {
	let width;
	let height;
	let planes;
	let fontSize;
	let dim = 2;
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
		dim = 3;
	}
	else {
		width = Math.min(window.innerWidth, window.innerHeight);
		height = width / 3 * 2;
		planes = ['xy', 'xz', 'yz', 'wz', 'wx', 'wy'];
		fontSize = ~~(width / 40);
		dim = 4;
	}
	const cnv = document.createElement('canvas');
	const cnv2d = document.createElement('canvas');
	const viewContainer = document.getElementById('graphics-view-' + dim + 'd');
	cnv.classList.add('graphics-view');
	cnv2d.classList.add('graphics-view');
	const container = document.createElement('div');
	viewContainer.style.width = width + 'px';
	viewContainer.style.height = height + 'px';
	container.style.width = width + 'px';
	container.style.height = height + 'px';
	viewContainer.appendChild(container);
	container.appendChild(cnv);
	cnv.width = width;
	cnv.height = height;
	container.appendChild(cnv2d);
	cnv2d.width = width;
	cnv2d.height = height;
	const gl = cnv.getContext('webgl');
	const ctx = cnv2d.getContext('2d');
	ctx.font = 'bold ' + fontSize + 'px sans-serif';
	for(let i = 0; i < planes.length; i++) {
		let charX = width / 3 / 20 + width / 3 * (i % 3);
		let charY = height / 10;
		if(mode == 0) {
			charX = width / 20;
		}
		else if(mode == 4) {
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
	const fragmentShaderCode = makeShader(plane, orthogonal, mode, operations);
	gl.shaderSource(fragmentShader, fragmentShaderCode);
	gl.compileShader(fragmentShader);
	let log = gl.getShaderInfoLog(fragmentShader);
	if(log) {
		console.log(fragmentShaderCode);
		console.log(log);
	}
	const program = gl.createProgram();
	gl.attachShader(program, vertexShader);
	gl.attachShader(program, fragmentShader);
	gl.linkProgram(program);
	gl.deleteShader(vertexShader);
	gl.deleteShader(fragmentShader);
	const texcoordLocation = gl.getAttribLocation(program, 'a_texcoord');
	gl.enableVertexAttribArray(texcoordLocation);
	const positionLocation = gl.getAttribLocation(program, 'a_position');
	gl.enableVertexAttribArray(positionLocation);
	gl.useProgram(program);
	const aspectLocation = gl.getUniformLocation(program, 'u_aspect');
	const aspect = 1;
	gl.uniform1f(aspectLocation, aspect);
	const timeLocation = gl.getUniformLocation(program, 'u_time');
	const valuesLocation = gl.getUniformLocation(program, 'u_values');
	const locations = {position: positionLocation, texcoord: texcoordLocation, time: timeLocation, values: valuesLocation};
	return {program: program, locations, offset: offset};
}

function update(view) {
	let currentTimeNew = Date.now();
	let deltaTime = currentTimeNew - view.currentTime;
	view.time += deltaTime;
	view.currentTime = currentTimeNew;
	for(let i = 0; i < view.programs.length; i++) {
		const locations = view.programs[i].locations;
		view.gl.useProgram(view.programs[i].program);
		view.gl.bindBuffer(view.gl.ARRAY_BUFFER, view.buffers.position);
		view.gl.vertexAttribPointer(locations.position, 2, view.gl.FLOAT, false, 0, view.programs[i].offset * 4 * 12);
		view.gl.bindBuffer(view.gl.ARRAY_BUFFER, view.buffers.texcoord);
		view.gl.vertexAttribPointer(locations.texcoord, 2, view.gl.FLOAT, false, 0, 0);
		view.gl.uniform1f(locations.time, view.time * 0.001);
		view.gl.uniform3fv(locations.values, values);
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
		if(view.onDelete) view.onDelete();
	}
}