// const { raw } = require("express");

const canvas = document.querySelector('canvas');
const gl = canvas.getContext('webgl');
const { mat4 } = glMatrix;
const { vec3 } = glMatrix;


if (!gl){
    throw new Error('WebGL not supported!')
}

let mouseX = 0, mouseY = 0;
let targetRotationX = 0;
let targetRotationY = 0;
let currentRotationX = 0;
let currentRotationY = 0;

window.addEventListener('mousemove', (e) => {
    // We use the raw mouse position to define a "target" rotation
    // Sensitivity: (0.005) determines how fast it spins
    targetRotationY = (e.clientX - window.innerWidth / 2) * 0.005;
    targetRotationX = (e.clientY - window.innerHeight / 2) * 0.005;
});

let isInside = false;
const originalZ = 2.0; // Your current view distance
const insideZ = 0.1;   // Just slightly off-center to avoid clipping
let currentZ = originalZ;

window.addEventListener('click', () => {
    isInside = !isInside; // Toggle the state
});

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
const vertexData = spherePointCloud(1e4);

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
    uniform float u_time;
    uniform float u_audio;   // Average volume/frequency data
    void main() {
        vec3 pos = position;

        // Audio-only distortion (Shatter effect)
        float noise = sin(pos.x * 8.0 + u_time) * cos(pos.y * 8.0 + u_time);
        pos += normalize(pos) * (u_audio * 1.2 * noise);

        vColor = vec3(0.5 + pos.x, 0.5 + pos.y, 1.0); // Dynamic colouring
        gl_Position = matrix * vec4(pos, 1.0);
        gl_PointSize = (2.0 / gl_Position.w) + (u_audio * 5.0); // Points get bigger with volume
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

gl.useProgram(program);
gl.enable(gl.DEPTH_TEST);

const uniformLocations = {
    matrix : gl.getUniformLocation(program, `matrix`),
}

const uTimeLoc = gl.getUniformLocation(program, "u_time");
const uAudioLoc = gl.getUniformLocation(program, "u_audio");

//Audio Setup
let audioLevel = 0;

async function setupAudio() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    function updateAudio() {
        analyser.getByteFrequencyData(dataArray);
        // Get average volume
        let sum = 0;
        for(let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        audioLevel = sum / dataArray.length / 255; // Normalized 0 to 1
        requestAnimationFrame(updateAudio);
    }
    updateAudio();
}
// Call this on a user click (browsers block auto-audio)
window.addEventListener('click', () => setupAudio(), { once: true });

//Matrix
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


function animate(time) {
    requestAnimationFrame(animate);
    
    // Convert time to seconds
    const seconds = time * 0.001;

    // Update Uniforms
    gl.uniform1f(uTimeLoc, seconds);

    gl.uniform1f(uAudioLoc, audioLevel);

    // 1. Zoom In(Lerp)
    const targetZ = isInside ? insideZ : originalZ;
    currentZ += (targetZ - currentZ) * 0.07; // 0.07 is the speed of the zoom

    // 2. Rebuild the Matrices
    mat4.identity(viewMatrix);
    mat4.translate(viewMatrix, viewMatrix, [0.0, 0.0, currentZ]);
    mat4.invert(viewMatrix, viewMatrix);
    
    // 1. Smooth Interpolation (Lerp)
    // This makes the rotation follow the mouse with a slight delay/smoothness
    currentRotationX += (targetRotationX - currentRotationX) * 0.05;
    currentRotationY += (targetRotationY - currentRotationY) * 0.05;

    // 2. Reset and Rebuild the Model Matrix
    mat4.identity(modelMatrix);
    
    // Move the sphere into the scene
    mat4.translate(modelMatrix, modelMatrix, [0, 0, 0]); 

    // Apply the mouse rotations
    mat4.rotateX(modelMatrix, modelMatrix, currentRotationX);
    mat4.rotateY(modelMatrix, modelMatrix, currentRotationY);
    mat4.multiply(mvMatrix, viewMatrix, modelMatrix);
    mat4.multiply(finalMatrix, projectionMatrix, mvMatrix);
    gl.uniformMatrix4fv(uniformLocations.matrix, false, finalMatrix);
    
    gl.drawArrays(gl.POINTS, 0, vertexData.length / 3);
}
animate(0);

