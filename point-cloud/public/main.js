// const { raw } = require("express");

const canvas = document.querySelector('canvas');
const gl = canvas.getContext('webgl');
const { mat4 } = glMatrix;
const { vec3 } = glMatrix;


if (!gl){
    throw new Error('WebGL not supported!')
}

//alert(`WebGL ready!`)

function spherePointCloud(pointCount) {
    let points = [];
    for (let i = 0; i < pointCount; i++) {
        const r = () => Math.random() - 0.5;    //-0.5 < r < 0.5
        const inputPoint = [r(), r(), r()];
        const outputPoint = vec3.normalize(vec3.create(), inputPoint);

        points.push(...outputPoint);
    }

    return points;
}
//All shapes in WebGL is made off triangles, a cube has 6 faces of squares and each square is made of 2 triangles
const vertexData = spherePointCloud(1e5);

const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexData), gl.STATIC_DRAW);

// const colorBuffer = gl.createBuffer();
// gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
// gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colorData), gl.STATIC_DRAW);

// NOTE: WebGL constants (like VERTEX_SHADER, ARRAY_BUFFER, TRIANGLES) must be in ALL_CAPS, and they each have an integer ID. 
// Using lowercase (gl.vertexShader), JavaScript looks for a property with that name on the gl object, and returns'undefined' 
// causing the shader creation to fail silently.
const vertexShader = gl.createShader(gl.VERTEX_SHADER);
gl.shaderSource(vertexShader, `
    precision mediump float;
    attribute vec3 position;
    varying vec3 vColor;
    uniform mat4 matrix;
    void main() {
        vColor = vec3(position.xy, 1);
        gl_Position =  matrix * vec4(position, 1);
        gl_PointSize = 2.0;    //Point size defaults to 0, so need to set its size to make them visible
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

// const colorLocation = gl.getAttribLocation(program, `vColor`);
// gl.enableVertexAttribArray(colorLocation);
// gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
// gl.vertexAttribPointer(colorLocation, 3, gl.FLOAT, false, 0, 0);

gl.useProgram(program);
gl.enable(gl.DEPTH_TEST);

const uniformLocations = {
    matrix : gl.getUniformLocation(program, `matrix`),
}

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

const translateVec = [0.0, 0.0, 0.0];
const rotateAng = 0.03;


mat4.translate(modelMatrix, modelMatrix, translateVec);
mat4.translate(viewMatrix, viewMatrix, [0.0, 0.1, 2.0]);
mat4.invert(viewMatrix, viewMatrix);

function animate() {
    requestAnimationFrame(animate);
    mat4.rotateY(modelMatrix, modelMatrix, rotateAng);
    mat4.multiply(mvMatrix, viewMatrix, modelMatrix);
    mat4.multiply(finalMatrix, projectionMatrix, mvMatrix);
    gl.uniformMatrix4fv(uniformLocations.matrix, false, finalMatrix);
    gl.drawArrays(gl.POINTSS, 0, vertexData.length/3);
}
animate();

