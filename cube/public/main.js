// const { raw } = require("express");

const canvas = document.querySelector('canvas');
const gl = canvas.getContext('webgl');
const { mat4 } = glMatrix;


if (!gl){
    throw new Error('WebGL not supported!')
}

//alert(`WebGL ready!`)
//All shapes in WebGL is made off triangles, a cube has 6 faces of squares and each square is made of 2 triangles
const vertexData = [
    // 0, 1, 0,
    // 1, -1, 0,
    // -1, -1, 0,

    //Front
    0.5, 0.5, 0.5,
    0.5, -0.5, 0.5,
    -0.5, 0.5, 0.5,
    -0.5, 0.5, 0.5,
    0.5, -0.5, 0.5, 
    -0.5, -0.5, 0.5,

    //Left
    -0.5, 0.5, 0.5,
    -0.5, -0.5, 0.5,
    -0.5, 0.5, -0.5,
    -0.5, 0.5, -0.5,
    -0.5, -0.5, 0.5,
    -0.5, -0.5, -0.5,

    //Back
    -0.5, 0.5, -0.5,
    -0.5, -0.5, -0.5,
    0.5, 0.5, -0.5,
    0.5, 0.5, -0.5,
    -0.5, -0.5, -0.5,
    0.5, -0.5, -0.5,

    //Right
    0.5, 0.5, -0.5,
    0.5, -0.5, -0.5,
    0.5, 0.5, 0.5,
    0.5, 0.5, 0.5,
    0.5, -0.5, -0.5,
    0.5, -0.5, 0.5,

    //Top
    0.5, 0.5, -0.5,
    0.5, 0.5, 0.5,
    -0.5, 0.5, -0.5,
    -0.5, 0.5, -0.5,
    0.5, 0.5, 0.5,
    -0.5, 0.5, 0.5,

    //Bottom
    0.5, -0.5, 0.5,
    0.5, -0.5, -0.5,
    -0.5, -0.5, 0.5,
    -0.5, -0.5, 0.5,
    0.5, -0.5, -0.5,
    -0.5, -0.5, -0.5
];

// const colorData = [
//     1, 0, 0,
//     0, 1, 0,
//     0, 0, 1,
// ];

function randomColor() {
    return [Math.random(), Math.random(), Math.random()];
}

// let colorData = [
//     ...randomColor(),
//     ...randomColor(),
//     ...randomColor(),
// ];

let colorData = [];
for (let face = 0; face < 6; face++) {
    let faceColor = randomColor();
    for (let vertex = 0; vertex < 6; vertex++) {
        colorData.push(...faceColor);
    }
}

const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexData), gl.STATIC_DRAW);

const colorBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colorData), gl.STATIC_DRAW);

// NOTE: WebGL constants (like VERTEX_SHADER, ARRAY_BUFFER, TRIANGLES) must be in ALL_CAPS, and they each have an integer ID. 
// Using lowercase (gl.vertexShader), JavaScript looks for a property with that name on the gl object, and returns'undefined' 
// causing the shader creation to fail silently.
const vertexShader = gl.createShader(gl.VERTEX_SHADER);
gl.shaderSource(vertexShader, `
    precision mediump float;
    attribute vec3 position;
    attribute vec3 color;
    varying vec3 vColor;
    uniform mat4 manipulation;
    void main() {
        vColor = color;
        gl_Position =  manipulation * vec4(position, 1);
    }
`);
gl.compileShader(vertexShader);

const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
gl.shaderSource(fragmentShader, `
    precision mediump float;
    varying vec3 vColor;
    void main() {
        gl_FragColor = vec4(vColor, 1);
    }
`);
gl.compileShader(fragmentShader);

const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);

const positionLocation = gl.getAttribLocation(program, `position`);
gl.enableVertexAttribArray(positionLocation);
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);

const colorLocation = gl.getAttribLocation(program, `color`);
gl.enableVertexAttribArray(colorLocation);
gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
gl.vertexAttribPointer(colorLocation, 3, gl.FLOAT, false, 0, 0);

gl.useProgram(program);
gl.enable(gl.DEPTH_TEST);

const uniformLocations = {
    manipulation: gl.getUniformLocation(program, `manipulation`),
}

const manipulation = mat4.create();
const viewMatrix = mat4.create();
const projectionMatrix = mat4.create();
mat4.perspective(projectionMatrix,
    75 * Math.PI/180,     //Vertical field-of-view (angle, radians)
    canvas.width/canvas.height,      //aspect ratio (W/H)
    1e-4,    //near cull distance (>0)
    1e4,    //far cull distance
);

const mvMatrix = mat4.create();
const finalMatrix = mat4.create();

const translateVec = [0.2, 0.5, -2.0];
const scaleVec = [0.25, 0.25, 0.25];
const rotateAng = Math.PI/2/70;


mat4.translate(manipulation, manipulation, translateVec);
//mat4.scale(manipulation, manipulation, scaleVec);
mat4.translate(viewMatrix, viewMatrix, [-3.0, 0.0, 1.0]);
mat4.invert(viewMatrix, viewMatrix);

function animate() {
    requestAnimationFrame(animate);
    //mat4.rotateZ(manipulation, manipulation, rotateAng)
    //mat4.rotateX(manipulation, manipulation, rotateAng);
    mat4.multiply(mvMatrix, viewMatrix, manipulation);
    mat4.multiply(finalMatrix, projectionMatrix, mvMatrix);
    gl.uniformMatrix4fv(uniformLocations.manipulation, false, finalMatrix);
    gl.drawArrays(gl.TRIANGLES, 0, vertexData.length/3);
}
animate();

