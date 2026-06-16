export const CoreVertexShader = `
  uniform float uTime;
  uniform float uOrderProgress;
  uniform float uHoldProgress;   // Core states (0.0 = Open Flow, 1.0 = Locked Lattice Grid)    
  uniform float uBass;
  uniform float uMids;
  uniform float uTreble;
  uniform float uRing3Angle;
  uniform vec2 uMouseRot;
  uniform float uEarthDistortion;
  uniform float uAlignmentGlow;
  uniform float uWaveRadius;
  uniform vec3 uMouse3D;

  attribute vec3 aCrystalPosition;
  attribute float aRingIndex;
  attribute float aAngle;
  attribute vec3 aCoreVelocity;
  attribute float aCoreSpeed;
  attribute float aCoreRadius;
  attribute vec3 aCoreGridPosition; 

  varying vec3 vColor;  // Final computed particle light color
  varying float vRingIndex;
  varying float vRadius;
  varying float vTreble; // Pass treble state to fragment shader for flare logic
  
  // Rotation vector
  vec3 rotateX(vec3 p, float angle) {
    float s = sin(angle); float c = cos(angle);
    return vec3(p.x, p.y * c - p.z * s, p.y * s + p.z * c);
  }

  vec3 rotateY(vec3 p, float angle) {
    float s = sin(angle); float c = cos(angle);
    return vec3(p.x * c + p.z * s, p.y, -p.x * s + p.z * c);
  }

  vec3 rotateZ(vec3 p, float angle) {
    float s = sin(angle); float c = cos(angle);
    return vec3(p.x * c - p.y * s, p.x * s + p.y * c, p.z);
  }

  void main() {
    vec3 chaoticPos = position;
    vec3 orderedPos = aCrystalPosition;
    vRingIndex = aRingIndex;
    vTreble = uTreble;

    // Dampen audio deformations smoothly when compression grid is held
    float audioModifier = 1.0 - uHoldProgress;

    // CORE COMPRESSION LOGIC
    if (aRingIndex == 0.0) {
      // Free-flow state
      float timeOffset = uTime * aCoreSpeed * 2.0;
      vec3 flowingPos = orderedPos;
      flowingPos = rotateX(flowingPos, aCoreVelocity.x * timeOffset);
      flowingPos = rotateY(flowingPos, aCoreVelocity.y * timeOffset);
      flowingPos = rotateZ(flowingPos, aCoreVelocity.z * timeOffset);

      vec3 staticGridPos = aCoreGridPosition;
      orderedPos = mix(flowingPos, staticGridPos, uHoldProgress);
    }

    // SELF-SPINNING RING FLOW & FREQUENCY MODULATORS (RingIndex > 0)
    if (aRingIndex > 0.0) {
      // Isolate the base structural radius and the thickness offsets
      float baseRadius = length(aCrystalPosition.xy);
      vec3 structureOffset = aCrystalPosition - vec3(normalize(aCrystalPosition.xy) * baseRadius, 0.0);
      float currentRadius = baseRadius;
      
      float currentAngle = aAngle;

    // Handle standard rings with static speeds
    if (aRingIndex == 1.0) {
        currentAngle -= (uTime * 0.3);
    }
    else if (aRingIndex == 2.0) {
        currentAngle -= (uTime * 0.4);
    }
    // TREBLE ACCELERATION SPIN (Humanity Ring)
    else if (aRingIndex == 3.0) {
        // Instead of calculating speed * time, subtract our perfectly smooth accumulated angle
        currentAngle -= uRing3Angle;
    }
      
      // BASS BREATHING THICKNESS (Heaven Ring)
      if (aRingIndex == 1.0) {
        // The ring cross-section expands and contracts like a lung
        float breathingScale = 1.0 + sin(uTime * 4.0) * (uBass * 0.7) * audioModifier;
        structureOffset *= breathingScale;
      }

      orderedPos.x = cos(currentAngle) * currentRadius + structureOffset.x;
      orderedPos.y = sin(currentAngle) * currentRadius + structureOffset.y;
      orderedPos.z = structureOffset.z;

    }

    // GYROSCOPIC MACRO ROTATION CONTROLS
    float rotationModifier = 1.0 - uHoldProgress;

    if (aRingIndex == 1.0) {
      orderedPos = rotateX(orderedPos, uTime * 0.2 * rotationModifier);
    } 
    else if (aRingIndex == 2.0) {
      orderedPos = rotateY(orderedPos, (-uTime * 0.4 + 0.1 * uMouseRot.x) * rotationModifier);
      orderedPos += sin(orderedPos.zxy * 7.0 + uTime) * uMids * 0.6 * rotationModifier; // MIDRANGE TEXTURAL RIPPLE (Earth Ring)
    } 
    else if (aRingIndex == 3.0) {
      // Follows mouse movement tracking axes
      orderedPos = rotateX(orderedPos, uMouseRot.y * rotationModifier);
      orderedPos = rotateY(orderedPos, uMouseRot.x * rotationModifier);
    }

    vec3 mixedPosition = mix(chaoticPos, orderedPos, uOrderProgress);
    vRadius = length(orderedPos);

    // Repulsion effect on the core when hovered over it
    if (uOrderProgress > 0.1) {
      float dMouse = distance(mixedPosition, uMouse3D);
      float repulsionRadius = 0.2 * (1.0 - uHoldProgress); 
      
      if (repulsionRadius > 0.001 && dMouse < repulsionRadius && dMouse > 0.0001) {
        vec3 pushDir = normalize(mixedPosition - uMouse3D);
        float force = smoothstep(repulsionRadius, 0.0, dMouse);
        mixedPosition += pushDir * force * 0.18;
      }
    }

    // Colour settings 
    // Heaven ring
    vec3 baseColor = vec3(0.15, 1.0, 1.35);
    // Core colour
    if (aRingIndex == 0.0) {
      baseColor = mix(vec3(0.9, 0.6, 0.2), vec3(1.0, 0.8, 0.3), uHoldProgress);
    }
    // Earth ring
    if (aRingIndex == 2.0) {
      baseColor = mix(vec3(0.5, 2.0, 0.9), vec3(0.8, 0.2, 0.6), uEarthDistortion);
    }
    // Humanity Ring
    if (aRingIndex == 3.0) {
      // Shift toward pure white-flash on Treble Bioluminescence spike
      vec3 naturalPink = vec3(2.0, 0.8, 1.4);
      vec3 bioLuminescentFlash = vec3(5.0, 2.0, 2.0); 
      baseColor = mix(naturalPink, bioLuminescentFlash, uTreble * audioModifier * 7.0);
    } 

    //vColor = baseColor * (1.0 + uBass * 0.4);
    vec3 reactiveColor = baseColor;

    // When uOrderProgress is 0 (Menu open), dim the cluster to 20% brightness.
    // As it approaches 1.0 (Engine started), fade it up to 100% full radiance.
    float menuVignetteDim = mix(0.2 , 1.0, uOrderProgress);
    vColor = reactiveColor * menuVignetteDim;

    vec4 mvPosition = modelViewMatrix * vec4(mixedPosition, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = (11.0 / -mvPosition.z);
  }
`;

export const CoreFragmentShader = `
  varying vec3 vColor;  // Point color inputs from Vertex Shader stage
  varying float vRingIndex;
  varying float vRadius;
  varying float vTreble; // Incoming Treble envelope state
  uniform float uAlignmentGlow;
  uniform float uWaveRadius;
  uniform float uHoldProgress; 

  void main() {
    float dist = distance(gl_PointCoord, vec2(0.5));
    if (dist > 0.5) discard;
    
    // Default transparency and soft edge
    float alpha = smoothstep(0.5, 0.1, dist) * 0.7;
    //float alpha = smoothstep(0.5, 0.45, dist) * 0.23;

    vec3 finalColor = vColor;

    // Alignment glowing wave
    if (uAlignmentGlow > 0.01) {
      float waveEdge = smoothstep(uWaveRadius + 0.2, uWaveRadius, vRadius) * smoothstep(uWaveRadius - 0.2, uWaveRadius, vRadius);
      vec3 waveGlowColor = vec3(1.0, 0.95, 0.9) * waveEdge * uAlignmentGlow;
      finalColor += waveGlowColor;
      alpha += waveEdge * uAlignmentGlow;
    }

    gl_FragColor = vec4(finalColor, alpha);
  }
`;