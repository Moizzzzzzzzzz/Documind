import { X, Cpu, Database, Moon } from 'lucide-react'
import { useState } from 'react'

const ROW = ({ icon: Icon, label, value, children }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: '14px',
      padding: '14px 0',
      borderBottom: '1px solid #2A2A30',
    }}
  >
    <div
      style={{
        width: '32px',
        height: '32px',
        borderRadius: '7px',
        backgroundColor: '#1A1A1F',
        border: '1px solid #2A2A30',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        marginTop: '1px',
      }}
    >
      <Icon size={14} style={{ color: '#4F46E5' }} />
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <p style={{ color: '#71717A', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '600', marginBottom: '3px' }}>
        {label}
      </p>
      {value && (
        <p style={{ color: '#F4F4F5', fontSize: '13px', lineHeight: '1.4' }}>{value}</p>
      )}
      {children}
    </div>
  </div>
)

function Toggle({ on, onChange }) {
  return (
    <button
      onClick={() => onChange(!on)}
      style={{
        position: 'relative',
        width: '40px',
        height: '22px',
        borderRadius: '11px',
        border: 'none',
        backgroundColor: on ? '#4F46E5' : '#2A2A30',
        cursor: 'pointer',
        transition: 'background 0.2s',
        flexShrink: 0,
        marginTop: '2px',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: '3px',
          left: on ? '21px' : '3px',
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          backgroundColor: '#ffffff',
          transition: 'left 0.2s',
        }}
      />
    </button>
  )
}

export default function SettingsModal({ onClose }) {
  const [darkMode, setDarkMode] = useState(true)

  // Close on backdrop click
  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      onClick={handleBackdrop}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(2px)',
      }}
    >
      <div
        style={{
          width: '420px',
          backgroundColor: '#111113',
          border: '1px solid #2A2A30',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.8)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid #2A2A30',
          }}
        >
          <div>
            <p style={{ color: '#F4F4F5', fontSize: '15px', fontWeight: '600', letterSpacing: '-0.01em' }}>
              Settings
            </p>
            <p style={{ color: '#71717A', fontSize: '11px', marginTop: '1px' }}>
              DocuMind AI configuration
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              border: 'none',
              background: 'transparent',
              color: '#71717A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#1A1A1F'
              e.currentTarget.style.color = '#F4F4F5'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = '#71717A'
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '0 20px 8px' }}>
          <ROW icon={Cpu} label="AI Model Stack" value="Gemini Flash → Groq Llama (fallback)">
            <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
              {['Gemini 2.0 Flash', 'Groq Llama-3.3-70B'].map((m) => (
                <span
                  key={m}
                  style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: '#1A1A1F',
                    border: '1px solid #2A2A30',
                    color: '#4F46E5',
                    fontSize: '10px',
                    fontWeight: '600',
                    letterSpacing: '0.04em',
                  }}
                >
                  {m}
                </span>
              ))}
            </div>
          </ROW>

          <ROW icon={Database} label="Vector Index" value="documind-index">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: '#22C55E',
                  display: 'block',
                  boxShadow: '0 0 4px #22C55E',
                }}
              />
              <span style={{ color: '#71717A', fontSize: '11px' }}>Connected · FAISS disk-sync active</span>
            </div>
          </ROW>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '14px 0',
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '7px',
                backgroundColor: '#1A1A1F',
                border: '1px solid #2A2A30',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Moon size={14} style={{ color: '#4F46E5' }} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ color: '#71717A', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '600', marginBottom: '3px' }}>
                Dark Mode
              </p>
              <p style={{ color: '#F4F4F5', fontSize: '13px' }}>
                {darkMode ? 'Enabled' : 'Disabled (experimental)'}
              </p>
            </div>
            <Toggle on={darkMode} onChange={setDarkMode} />
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid #2A2A30',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '8px 20px',
              borderRadius: '7px',
              border: 'none',
              backgroundColor: '#4F46E5',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#4338CA' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#4F46E5' }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
