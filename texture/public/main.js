// const { raw } = require("express");

const canvas = document.querySelector('canvas');
const gl = canvas.getContext('webgl');
const { mat4 } = glMatrix;
const { vec3 } = glMatrix;
const { vec2 } = glMatrix;


if (!gl){
    throw new Error('WebGL not supported!')
}

//alert(`WebGL ready!`)

const vertexData = [
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

// Construct an Array by repeating `pattern` n times
function repeat(n, pattern) {
    return [...Array(n)].reduce(sum => sum.concat(pattern), []);
}

const uvData = repeat(6, [
    //Start with (0, 0)/bottom left, move bottom left, top left, bottom right, top right (square) and clockwise for triangles
    0, 0,
    0, 1,
    1, 0,

    1, 0,
    0, 1,
    1, 1
]);

const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexData), gl.STATIC_DRAW);

const uvBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvData), gl.STATIC_DRAW);

function loadTexture(url) {
    const texture = gl.createTexture();
    const image = new Image();
    
    image.onload = e =>{
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.generateMipmap(gl.TEXTURE_2D);
    }
    image.src = url;

    return texture;
}

const brick = loadTexture(`textures/default_brick.png`);
gl.activeTexture(gl.TEXTURE0);
gl.bindTexture(gl.TEXTURE_2D, brick);

// NOTE: WebGL constants (like VERTEX_SHADER, ARRAY_BUFFER, TRIANGLES) must be in ALL_CAPS, and they each have an integer ID. 
// Using lowercase (gl.vertexShader), JavaScript looks for a property with that name on the gl object, and returns'undefined' 
// causing the shader creation to fail silently.


let uniformLocations;
(function shaderProgram() {
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, `
        precision mediump float;
        attribute vec3 position;
        attribute vec2 uv;
        varying vec2 vUV;
        uniform mat4 matrix;
        void main() {
            vUV = uv;
            gl_Position =  matrix * vec4(position, 1);
        }
    `);
    gl.compileShader(vertexShader);

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, `
        precision mediump float;
        varying vec2 vUV;
        uniform sampler2D textureID;
        void main() {
            gl_FragColor = texture2D(textureID, vUV);
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

    const uvLocation = gl.getAttribLocation(program, `uv`);
    gl.enableVertexAttribArray(uvLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
    gl.vertexAttribPointer(uvLocation, 2, gl.FLOAT, false, 0, 0);

    gl.useProgram(program);
    gl.enable(gl.DEPTH_TEST);

    uniformLocations = {
        matrix: gl.getUniformLocation(program, `matrix`),
        textureID: gl.getUniformLocation(program, `textureID`),
    }

    gl.uniform1i(uniformLocations.textureID, 0);
})();

const modelMatrix = mat4.create();
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

mat4.translate(modelMatrix, modelMatrix, translateVec);
mat4.translate(viewMatrix, viewMatrix, [0.0, 0.1, 2.0]);
mat4.invert(viewMatrix, viewMatrix);

function animate() {
    requestAnimationFrame(animate);
    mat4.rotateX(modelMatrix, modelMatrix, Math.PI/60);
    mat4.rotateY(modelMatrix, modelMatrix, Math.PI/160);
    mat4.multiply(mvMatrix, viewMatrix, modelMatrix);
    mat4.multiply(finalMatrix, projectionMatrix, mvMatrix);
    gl.uniformMatrix4fv(uniformLocations.matrix, false, finalMatrix);
    gl.drawArrays(gl.TRIANGLES, 0, vertexData.length/3);
}
animate();

