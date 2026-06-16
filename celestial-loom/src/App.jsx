import { useState, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { EffectComposer, Bloom, ChromaticAberration } from '@react-three/postprocessing'
import { CelestialLoom } from './components/CelestialLoom'
import { Keys } from './components/keys'

export default function App() {

  const [isActive, setIsActive] = useState(false)
  
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {!isActive && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          zIndex: 10, textAlign: 'center'
        }}>
          <h1 style={{ color: '#eab95f', marginBottom: '20px', letterSpacing: '0.1em', fontSize: '2rem', textShadow: '0px 4px 12px rgba(0, 0, 0, 0.95), 0px 0px 25px rgba(0, 0, 0, 0.7)'}}>CELESTIAL LOOM // 浑天</h1>
          <button 
            //onClick={setupAudio}
            onClick={() => {
              // CREATE A NATIVE AUDIO ELEMENT IN AIR TO TRICK THE PHONE
              const audioBypass = new Audio();
              
              // Forces the mobile browser's hardware to play sound even when on silent mode
              audioBypass.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==";
              
              // Play the silent file immediately within the user gesture context
              audioBypass.play()
              setIsActive(true)
            }}
            //onClick={() => setIsActive(true)}
            style={{
              padding: '12px 24px', background: 'transparent', border: '1px solid #e5a93c',
              color: '#eab95f', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.05rem',
              boxShadow: '0px 6px 20px rgba(0, 0, 0, 0.95), inset 0px 0px 10px rgba(0, 0, 0, 0.5)'
            }}
          >
            INITIALISE ENGINE
          </button>
        </div>
      )}

      <Canvas camera={{ position: [0, 0, 6], fov: 60 }}>
        <ambientLight intensity={0.1} />
        <pointLight position={[5, 5, 5]} intensity={1.0} color="#e5a93c" />
        
        <CelestialLoom isEngineStarted={isActive} />

        <EffectComposer>
          <Bloom intensity={1.5} luminanceThreshold={0.1} luminanceSmoothing={5.0} />
          <ChromaticAberration offset={[0.002, 0.002]} />
        </EffectComposer>
      </Canvas>
      <Keys isEngineStarted={isActive} />
    </div>
  )
}