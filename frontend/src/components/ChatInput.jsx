import { useRef, useState, useEffect } from 'react'
import { ArrowUp, Mic, Loader2 } from 'lucide-react'

export default function ChatInput({ onSend, disabled, hasMessages }) {
  const [value, setValue] = useState('')
  const textareaRef = useRef(null)

  // Auto-grow textarea as user types
  const resize = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }

  // Reset height when value is cleared (e.g. after send)
  useEffect(() => {
    if (value === '') resize()
  }, [value])

  const submit = () => {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
    // Shift+Enter falls through — browser inserts a newline naturally
  }

  const handleChange = (e) => {
    setValue(e.target.value)
    resize()
  }

  const canSend = value.trim().length > 0 && !disabled
  const placeholder = hasMessages
    ? 'Ask follow-up or research deeper…'
    : 'Message DocuMind AI…'

  return (
    <div
      style={{
        padding: '12px 24px 18px',
        backgroundColor: '#0D0D0F',
        borderTop: '1px solid #2A2A30',
        flexShrink: 0,
      }}
    >
      {/* Input container */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: '10px',
          backgroundColor: '#1A1A1F',
          border: '1px solid #2A2A30',
          borderRadius: '10px',
          padding: '10px 14px',
          transition: 'border-color 0.15s',
        }}
        onFocusCapture={(e) => { e.currentTarget.style.borderColor = '#4F46E5' }}
        onBlurCapture={(e) => { e.currentTarget.style.borderColor = '#2A2A30' }}
      >
        {/* Auto-growing textarea */}
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            resize: 'none',
            color: '#F4F4F5',
            fontSize: '14px',
            lineHeight: '1.55',
            maxHeight: '160px',
            fontFamily: 'inherit',
            opacity: disabled ? 0.5 : 1,
          }}
        />

        {/* Right-side actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, paddingBottom: '1px' }}>
          {/* Mic (placeholder — no recording functionality) */}
          <button
            type="button"
            disabled={disabled}
            style={{
              width: '28px', height: '28px',
              borderRadius: '6px', border: 'none',
              background: 'transparent',
              color: '#71717A',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'default',
              opacity: 0.6,
            }}
          >
            <Mic size={15} />
          </button>

          {/* Send — only styled active when text is present */}
          <button
            type="button"
            onClick={submit}
            disabled={!canSend}
            style={{
              width: '30px', height: '30px',
              borderRadius: '7px', border: 'none',
              backgroundColor: canSend ? '#4F46E5' : '#1A1A1F',
              color: canSend ? '#ffffff' : '#71717A',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: canSend ? 'pointer' : 'not-allowed',
              flexShrink: 0,
              transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={(e) => { if (canSend) e.currentTarget.style.background = '#4338CA' }}
            onMouseLeave={(e) => { if (canSend) e.currentTarget.style.background = '#4F46E5' }}
          >
            {disabled ? <Loader2 size={14} className="animate-spin" /> : <ArrowUp size={14} />}
          </button>
        </div>
      </div>

      <p style={{
        color: '#71717A', fontSize: '10px', textAlign: 'center',
        marginTop: '8px', letterSpacing: '0.01em',
      }}>
        Precision intelligence for enterprise document analysis
      </p>
    </div>
  )
}
