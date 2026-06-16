import { useRef, useMemo, useState, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { CoreVertexShader, CoreFragmentShader } from '../shaders/coreShader'

export function CelestialLoom({ isEngineStarted = false }) {
  const [isHolding, setIsHolding] = useState(false)
  const { camera } = useThree() 
  
  const globalProgress = useRef(0)
  const holdProgress = useRef(0)
  const coreRef = useRef()
  
  const analyserRef = useRef(null)
  const audioTrackRef = useRef(null)
  const lowpassFilterRef = useRef(null)
  const echoRef = useRef(null)

  const targetMouseRot = useRef(new THREE.Vector2(0, 0))
  const currentMouseRot = useRef(new THREE.Vector2(0, 0))
  const lastMousePos = useRef(new THREE.Vector2(0, 0))
  const earthDistortion = useRef(0)

  const alignmentGlow = useRef(0)
  const waveRadius = useRef(3.5)
  const isWaving = useRef(false)

  const mouse3D = useRef(new THREE.Vector3(0, 0, 0))
  const raycastPlaneRef = useRef(new THREE.Plane(new THREE.Vector3(0, 0, 1), 0))
  const raycaster = useMemo(() => new THREE.Raycaster(), [])

  const ring3Angle = useRef(0)
  const smoothTreble = useRef(0) // Used to smooth out the speed changes
  const lastTime = useRef(0)

  const PARTICLE_COUNT = 9000 // Total number of particles
  const ringRadii = [3.0, 2.1, 1.3] // Radius for 3 rings

  useEffect(() => {
    if (!isEngineStarted) return

    const listener = new THREE.AudioListener()
    camera.add(listener)

    const sound = new THREE.Audio(listener)
    audioTrackRef.current = sound

    // Load music
    const audioLoader = new THREE.AudioLoader()
    audioLoader.load('/Celestial Loom.m4a', (buffer) => {
      sound.setBuffer(buffer)
      sound.setLoop(true)
      sound.setVolume(0.3)
      sound.setPlaybackRate(0.96)
      sound.play()

      // WEB AUDIO API PIPELINE CUSTOMISATION
      const ctx = listener.context // Extract the native browser AudioContext
  
      // Initialize the Lowpass Filter (Muffled Space)
      const lowpass = ctx.createBiquadFilter()
      lowpass.type = 'lowpass'
      lowpass.frequency.setValueAtTime(22000, ctx.currentTime) // Open wide by default
      lowpassFilterRef.current = lowpass

      // Create Delay and Feedback Nodes (Echo Space)
      const delayNode = ctx.createDelay()
      delayNode.delayTime.setValueAtTime(0.25, ctx.currentTime) // 250ms echo intervals
      
      const feedbackGain = ctx.createGain()
      feedbackGain.gain.setValueAtTime(0.4, ctx.currentTime) // Echo tail decay decay rate

      const wetEchoVolume = ctx.createGain()
      wetEchoVolume.gain.setValueAtTime(0.0, ctx.currentTime) // Silenced by default
      echoRef.current = wetEchoVolume

      // Chain the Echo loop together (Delay -> Feedback -> back to Delay)
      delayNode.connect(feedbackGain)
      feedbackGain.connect(delayNode)

      // Connect filter output down to the echo subsystem
      lowpass.connect(delayNode)
      delayNode.connect(wetEchoVolume)

      // Tell Three.js to use the lowpass as its master filter chain.
      // Forces Three.js to route the internal source and analyzer downstream through it.
      sound.setFilter(lowpass)

      // Connect independent Echo channel directly into the master speakers speaker output
      wetEchoVolume.connect(sound.getOutput())

      analyserRef.current = new THREE.AudioAnalyser(sound, 256)
    }, 
    (progress) => console.log(`Loading audio: ${Math.round((progress.loaded / progress.total) * 100)}%`),
    (error) => console.error('Audio Loader failed:', error))

    return () => {
      if (sound.isPlaying) sound.stop()
      camera.remove(listener)
    }
  }, [isEngineStarted, camera])

  // ARRAYS AND BUFFERS MEMOISATION
    const [
        positions, 
        crystalPositions, // Target organized ring/core geometric positions (uOrderProgress = 1)
        ringIndices,  // Identifiers: 0 = Core, 1 = Heaven, 2 = Earth, 3 = Humanity
        angles,  // Base orbital angles for continuous spinning logic
        coreVelocities, 
        coreSpeeds, 
        coreRadii, 
        coreGridPositions  // Target static lattice coordinates for the hold compression state
    ] = useMemo(() => {
    const pos = new Float32Array(PARTICLE_COUNT * 3)
    const crys = new Float32Array(PARTICLE_COUNT * 3)
    const indices = new Float32Array(PARTICLE_COUNT)
    const angs = new Float32Array(PARTICLE_COUNT)
    
    const cVels = new Float32Array(PARTICLE_COUNT * 3)
    const cSpeeds = new Float32Array(PARTICLE_COUNT)
    const cRadii = new Float32Array(PARTICLE_COUNT)
    const cGrid = new Float32Array(PARTICLE_COUNT * 3) 
    
    const ringThickness = 0.23  
    const coreCount = PARTICLE_COUNT * 0.35  // 35% of all particles build the 'core' 
    
    // Calculate weighted distribution probability thresholds for the rings based on relative radii size
    const totalWeight = ringRadii[0] + ringRadii[1] + ringRadii[2] 
    const pHeaven = ringRadii[0] / totalWeight                      
    const pEarth = pHeaven + (ringRadii[1] / totalWeight)           
    
    // GENERATION LOOP: CALCULATE EACH PARTICLE'S INITIAL STATE
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3
      const u = Math.random(); const v = Math.random()
      const theta = u * 2.0 * Math.PI; const phi = Math.acos(2.0 * v - 1.0)
      const r = Math.pow(Math.random(), 2.0) * 0.6 

      pos[i3]     = r * Math.sin(phi) * Math.cos(theta)  // Initial Randomised X
      pos[i3 + 1] = r * Math.sin(phi) * Math.sin(theta)  // Initial Randomised Y
      pos[i3 + 2] = r * Math.cos(phi)                    // Initial Randomised Z

      const angle = Math.random() * Math.PI * 2  // Permanent orbital offset anchor
      angs[i] = angle 

      if (i < coreCount) {
        indices[i] = 0.0 
        // Compute organic free-flowing core positions (Sphere Volume)
        const coreR = Math.pow(Math.random(), 1.5) * 0.5
        crys[i3]     = coreR * Math.sin(phi) * Math.cos(theta)
        crys[i3 + 1] = coreR * Math.sin(phi) * Math.sin(theta)
        crys[i3 + 2] = coreR * Math.cos(phi)

        cVels[i3]     = Math.random() - 0.5
        cVels[i3 + 1] = Math.random() - 0.5
        cVels[i3 + 2] = Math.random() - 0.5
        
        cSpeeds[i]    = 0.3 + Math.random() * 1.4
        cRadii[i]     = coreR

        // Compute compressed structural lattice position using a Golden Ratio Fibonacci Sphere layout
        const latIndex = i
        const phiGrid = Math.acos(1.0 - 2.0 * (latIndex + 0.5) / coreCount)
        const thetaGrid = Math.PI * (1.0 + Math.sqrt(5.0)) * latIndex   // Golden angle incrementation

        const gridRadius = 0.3
        cGrid[i3]     = gridRadius * Math.sin(phiGrid) * Math.cos(thetaGrid)  // Static Grid X
        cGrid[i3 + 1] = gridRadius * Math.sin(phiGrid) * Math.sin(thetaGrid)  // Static Grid Y
        cGrid[i3 + 2] = gridRadius * Math.cos(phiGrid)                        // Static Grid Z
      } else {
        // Ring particles
        const roll = Math.random()
        let ringIdx = 1

        // Sort ring assignment based on the radius weight calculated earlier
        if (roll < pHeaven) {
          ringIdx = 1 
        } else if (roll < pEarth) {
          ringIdx = 2 
        } else {
          ringIdx = 3 
        }

        indices[i] = ringIdx 
        
        const radius = ringRadii[ringIdx - 1]
        const crossAngle = Math.random() * Math.PI * 2
        const crossOffset = Math.random() * ringThickness

        // Map ring points out around a circular tracking path injected with volumetric cross-section offsets
        crys[i3]     = Math.cos(angle) * radius + Math.cos(crossAngle) * crossOffset
        crys[i3 + 1] = Math.sin(angle) * radius + Math.sin(crossAngle) * crossOffset
        crys[i3 + 2] = Math.sin(crossAngle) * crossOffset
      }
    }
    // Return arrays to update buffer geometry attributes passed to WebGL shaders
    return [pos, crys, indices, angs, cVels, cSpeeds, cRadii, cGrid]
  }, [])

  const shaderData = useMemo(() => ({
    uniforms: {
      uTime: { value: 0 },
      uOrderProgress: { value: 0 },
      uHoldProgress: { value: 0 },
      uBass: { value: 0 },
      uMids: { value: 0 },       
      uTreble: { value: 0 },    
      uRing3Angle: { value: 0 },
      uMouseRot: { value: new THREE.Vector2(0, 0) },
      uEarthDistortion: { value: 0 },
      uAlignmentGlow: { value: 0 },
      uWaveRadius: { value: 3.5 },
      uMouse3D: { value: new THREE.Vector3(0, 0, 0) }
    },
    vertexShader: CoreVertexShader,
    fragmentShader: CoreFragmentShader
  }), [])

  // RENDER FRAME TICK LOOP 
  useFrame((state) => {
    const time = state.clock.getElapsedTime()
    const mouse = state.pointer  // Normalized Mouse coordinates (ranges from -1 to +1 on X and Y axes)
    const cam = state.camera  // Access to the active viewport projection matrix/camera instance

    globalProgress.current = THREE.MathUtils.lerp(globalProgress.current, isEngineStarted ? 1.0 : 0.0, 0.025)
    const p = globalProgress.current

    // CORE COMPRESSION LOGIC (Lattice Compression State)
    // Calculate distance from world center (0,0,0) to where the mouse ray hits the 3D plane
    const distanceFromCenter = mouse3D.current.length()
    const coreRadiusLimit = 0.55 // Strictly mapping to your coreCount boundary geometry limits
    // Only trigger holding state if the engine is active AND the user is clicking directly on the core sphere
    const isTargetingCore = isHolding && (distanceFromCenter <= coreRadiusLimit)
    const targetHold = (isEngineStarted && isTargetingCore) ? 1.0 : 0.0
    const lerpSpeed = isHolding ? 0.04 : 0.12 
    holdProgress.current = THREE.MathUtils.lerp(holdProgress.current, targetHold, lerpSpeed)
    const h = holdProgress.current

    // Animate audio filter effect when press and hold on the core 
    if (lowpassFilterRef.current && echoRef.current) {
      // Linear transition mapping: Cutoff plunges down from 22,000Hz to 650Hz based on compression state
      const targetFrequency = THREE.MathUtils.mapLinear(h, 0.0, 1.0, 22000, 650)
      lowpassFilterRef.current.frequency.value = targetFrequency

      // Scale volume gain up from 0.0 (silent) to 0.6 (echoing ambient overlay)
      const targetEchoVolume = THREE.MathUtils.mapLinear(h, 0.0, 1.0, 0.0, 0.6)
      echoRef.current.gain.value = targetEchoVolume
    }

    // INTERACTIVE GYROSCOPIC MOUSE ROTATION
    targetMouseRot.current.set(mouse.x * Math.PI * 0.6, -mouse.y * Math.PI * 0.6)
    currentMouseRot.current.lerp(targetMouseRot.current, 0.08)

    // Projects a vector ray from the 2D mouse cursor coordinates through the camera lens
    raycaster.setFromCamera(mouse, cam)
    // Finds the XYZ mathematical intersection where that camera ray pierces a flat 3D horizon plane
    raycaster.ray.intersectPlane(raycastPlaneRef.current, mouse3D.current)

    // Earth ring distortion
    const mouseDelta = lastMousePos.current.distanceTo(mouse)
    lastMousePos.current.copy(mouse)
    
    // If the user slashes the mouse aggressively (distance change exceeds threshold), scale velocity amplitude up to a 100% max cap
    const targetDistortion = mouseDelta > 0.015 ? Math.min(mouseDelta * 8.0, 1.0) : 0.0
    // Gradually fade out the distortion wave
    earthDistortion.current = THREE.MathUtils.lerp(earthDistortion.current, targetDistortion, 0.05)

    // FREQUENCY BANDS SPLITTING LOGIC 
    let currentBass = 0
    let currentMids = 0
    let currentTreble = 0

    if (analyserRef.current) {
      const data = analyserRef.current.getFrequencyData()
      
      // Bass Extraction (Sub-bass, indices 0 - 6)
      let bassSum = 0
      for (let i = 0; i < 6; i++) bassSum += data[i]
      currentBass = (bassSum / 6) / 255

      // Midrange Extraction (Instruments/Vocals, indices 20 - 55)
      let midsSum = 0
      for (let i = 20; i < 55; i++) midsSum += data[i]
      currentMids = (midsSum / 35) / 255

      // Treble Extraction (Crisp highs/Snares, indices 75 - 110)
      let trebleSum = 0
      for (let i = 75; i < 110; i++) trebleSum += data[i]
      currentTreble = (trebleSum / 35) / 255
    }
    // Calculate delta safely using the elapsed time passed from Three.js
    const delta = time - lastTime.current
    lastTime.current = time // Store current time for the next frame

    // Only step forward if time has actually progressed (handles pauses/tab switching)
    if (delta > 0 && delta < 0.1) {
    const audioModifier = 1.0 - holdProgress.current
    
    // Smooth out the treble to eliminate jerky speed jumps
    smoothTreble.current = THREE.MathUtils.lerp(smoothTreble.current, currentTreble, 0.5)
    
    // Dynamic speed factor
    const dynamicSpinSpeed = 0.6 * (1.0 + smoothTreble.current * 50.0 * audioModifier)
    
    // Increment our tracking angle
    ring3Angle.current += delta * dynamicSpinSpeed
    }

    // Calculate for 3-ring-alignment
    const heavenAngle = fmod(time * 0.2, Math.PI * 2)
    const earthAngle = fmod(-time * 0.4 + 0.1 * currentMouseRot.current.y, Math.PI * 2)
    const humanityAngleX = fmod(currentMouseRot.current.y, Math.PI * 2)
    
    const angularDiff = Math.abs(Math.sin(heavenAngle) - Math.sin(humanityAngleX)) + Math.abs(Math.sin(heavenAngle) - Math.sin(earthAngle))

    if (p > 0.95 && angularDiff < 0.05 && !isWaving.current && !isHolding) {
      isWaving.current = true
      alignmentGlow.current = 1.0
      waveRadius.current = 3.5
    }

    if (isWaving.current) {
      waveRadius.current -= 0.07 
      if (waveRadius.current <= 0.0) {
        alignmentGlow.current = THREE.MathUtils.lerp(alignmentGlow.current, 0.0, 0.1)
        if (alignmentGlow.current < 0.01) {
          isWaving.current = false
          alignmentGlow.current = 0.0
        }
      }
    }

    if (coreRef.current) {
      const uniforms = coreRef.current.material.uniforms
      uniforms.uOrderProgress.value = p
      uniforms.uHoldProgress.value = holdProgress.current
      uniforms.uTime.value = time
      uniforms.uBass.value = currentBass
      uniforms.uMids.value = currentMids
      uniforms.uTreble.value = currentTreble
      uniforms.uRing3Angle.value = ring3Angle.current
      uniforms.uMouseRot.value.copy(currentMouseRot.current)
      uniforms.uEarthDistortion.value = earthDistortion.current * p
      uniforms.uAlignmentGlow.value = alignmentGlow.current
      uniforms.uWaveRadius.value = waveRadius.current
      uniforms.uMouse3D.value.copy(mouse3D.current)
    }
  })

  function fmod(a, b) { return a - (Math.floor(a / b) * b) }

  return (
    <group>
      <points ref={coreRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-aCrystalPosition" args={[crystalPositions, 3]} />
          <bufferAttribute attach="attributes-aRingIndex" args={[ringIndices, 1]} />
          <bufferAttribute attach="attributes-aAngle" args={[angles, 1]} />
          <bufferAttribute attach="attributes-aCoreVelocity" args={[coreVelocities, 3]} />
          <bufferAttribute attach="attributes-aCoreSpeed" args={[coreSpeeds, 1]} />
          <bufferAttribute attach="attributes-aCoreRadius" args={[coreRadii, 1]} />
          <bufferAttribute attach="attributes-aCoreGridPosition" args={[coreGridPositions, 3]} />
        </bufferGeometry>
        <shaderMaterial 
          args={[shaderData]} 
          transparent 
          depthWrite={false} 
          blending={THREE.AdditiveBlending} 
        />
      </points>

      <mesh 
        onPointerDown={(e) => { e.stopPropagation(); setIsHolding(true) }}
        onPointerUp={() => setIsHolding(false)}
        onPointerLeave={() => setIsHolding(false)}
      >
        <planeGeometry args={[8.0, 8.0]} />
        <meshBasicMaterial visible={false} depthWrite={false} />
      </mesh>
    </group>
  )
}