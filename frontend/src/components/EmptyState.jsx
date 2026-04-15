const SUGGESTIONS = [
  'Summarize the key findings',
  'Check for legal risks',
  'Analyze quarterly trends',
]

export default function EmptyState({ onSuggestion }) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '28px',
        padding: '40px 24px',
      }}
    >
      {/* Large D logo */}
      <div
        style={{
          width: '72px',
          height: '72px',
          backgroundColor: '#1A1A1F',
          border: '1px solid #2A2A30',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span style={{ color: '#F4F4F5', fontSize: '32px', fontWeight: '700', letterSpacing: '-1px' }}>D</span>
      </div>

      {/* Heading */}
      <h2
        style={{
          color: '#F4F4F5',
          fontSize: '22px',
          fontWeight: '600',
          textAlign: 'center',
          letterSpacing: '-0.01em',
          lineHeight: '1.3',
        }}
      >
        Ask anything about your documents
      </h2>

      {/* Suggestion pills */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {SUGGESTIONS.map((text) => (
          <button
            key={text}
            onClick={() => onSuggestion?.(text)}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #2A2A30',
              background: 'transparent',
              color: '#F4F4F5',
              fontSize: '13px',
              fontWeight: '400',
              cursor: 'pointer',
              transition: 'background 0.15s, border-color 0.15s',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#1A1A1F'
              e.currentTarget.style.borderColor = '#3A3A42'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.borderColor = '#2A2A30'
            }}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  )
}
