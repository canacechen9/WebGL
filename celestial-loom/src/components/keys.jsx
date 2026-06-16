import { useState } from 'react'

export function Keys({ isEngineStarted }) {
  const [isOpen, setIsOpen] = useState(false)

  if (!isEngineStarted) return null

  return (
    <div style={styles.overlayContainer}>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        style={{
          ...styles.toggleButton,
          borderBottom: isOpen ? '1px solid #ffffff' : '1px solid transparent'
        }}
      >
        {isOpen ? '✕ FOLD' : 'ℹ KEYS'}
      </button>

      {isOpen && (
        <div style={styles.legendPanel}>

            <p style={styles.guideText}>Move mouse to interact with the rings.</p>

            <p style={styles.guideText}>Press and hold the core to transform states.</p>

            <p style={styles.guideText}>Watch for moments of absolute alignment.</p>
          
        </div>
      )}
    </div>
  )
}

const styles = {
  overlayContainer: {
    position: 'absolute',
    top: '24px',
    right: '24px',
    zIndex: 999, 
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    fontFamily: '"Courier New", Courier, monospace', 
    color: '#ffffff',
    pointerEvents: 'auto', 
  },
  toggleButton: {
    background: 'rgba(0, 0, 0, 0.1)',
    border: 'none',
    //borderBottom: isOpen ? '1px solid #ffffff' : '1px solid transparent',
    color: '#ffffff',
    padding: '10px 0px 10px 16px',
    fontSize: '1.2rem',
    letterSpacing: '1px',
    cursor: 'pointer',
    backdropFilter: 'blur(8px)', 
    //transition: 'all 0.25s ease',
  },
  legendPanel: {
    marginTop: '12px',
    width: '60%', // Thinned down panel width for minimalism
    background: 'rgba(5, 5, 5, 0.15)',
    padding: '16px',
    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(12px)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  guideText: {
    margin: 0,
    fontSize: '1.2rem',
    lineHeight: '1.4',
    color: '#b0b0b0',
  }
}