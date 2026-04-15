import { AlertCircle } from 'lucide-react'

// Match percentages by source rank (1st = most relevant)
const RANK_MATCH = [95, 80, 65, 50]

function matchPercent(src, idx) {
  // If the backend returns a numeric similarity score (0–1), use it
  if (typeof src.score === 'number' && src.score >= 0 && src.score <= 1) {
    return Math.round(src.score * 100)
  }
  // Rank-based fallback: 1st=95%, 2nd=80%, 3rd=65%, 4th+=50%
  return RANK_MATCH[idx] ?? 50
}

function SourcesSection({ sources }) {
  if (!sources || sources.length === 0) return null

  return (
    <div style={{ marginTop: '18px' }}>
      <p style={{
        color: '#71717A', fontSize: '9px', textTransform: 'uppercase',
        letterSpacing: '0.12em', fontWeight: '700', marginBottom: '8px',
      }}>
        Sources Found
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {sources.map((src, idx) => {
          const pct = matchPercent(src, idx)
          const filename = src.metadata?.source_file ?? `Source ${idx + 1}`
          const page = src.metadata?.page_number
          const isHighMatch = pct >= 60

          return (
            <div
              key={idx}
              style={{
                padding: '10px 12px',
                backgroundColor: '#1A1A1F',
                borderRadius: '7px',
                border: '1px solid #2A2A30',
              }}
            >
              {/* Top row: filename + match label */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: '7px', gap: '8px',
              }}>
                <span style={{
                  color: '#F4F4F5', fontSize: '12px', fontWeight: '500',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  flex: 1, minWidth: 0,
                }}>
                  {filename}
                  {page != null && (
                    <span style={{ color: '#71717A', marginLeft: '6px', fontSize: '11px', fontWeight: '400' }}>
                      · p.{page}
                    </span>
                  )}
                </span>
                <span style={{
                  color: isHighMatch ? '#4F46E5' : '#6B7280',
                  fontSize: '10px', fontWeight: '700',
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                  flexShrink: 0,
                }}>
                  {pct}% match
                </span>
              </div>

              {/* Progress bar */}
              <div style={{ height: '3px', backgroundColor: '#2A2A30', borderRadius: '2px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${pct}%`,
                    backgroundColor: isHighMatch ? '#4F46E5' : '#6B7280',
                    borderRadius: '2px',
                    transition: 'width 0.7s ease',
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Render inline bold (**text**) and preserve line breaks
function renderContent(text) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} style={{ color: '#F4F4F5', fontWeight: '600' }}>
          {part.slice(2, -2)}
        </strong>
      )
    }
    return part
  })
}

function MessageBody({ content }) {
  const lines = content.split('\n').filter((l) => l.trim())
  const hasBullets = lines.some((l) => l.trim().match(/^[•\-\*]/))

  if (hasBullets) {
    const intro = lines.filter((l) => !l.trim().match(/^[•\-\*]/))
    const bullets = lines.filter((l) => l.trim().match(/^[•\-\*]/))
    return (
      <div>
        {intro.map((line, i) => (
          <p key={i} style={{ color: '#D4D4D8', fontSize: '14px', lineHeight: '1.7', marginBottom: '8px' }}>
            {renderContent(line)}
          </p>
        ))}
        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '7px' }}>
          {bullets.map((line, i) => (
            <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <span style={{
                marginTop: '8px', width: '5px', height: '5px',
                borderRadius: '50%', backgroundColor: '#4F46E5',
                flexShrink: 0, display: 'block',
              }} />
              <span style={{ color: '#D4D4D8', fontSize: '14px', lineHeight: '1.7' }}>
                {renderContent(line.replace(/^[•\-\*]\s*/, ''))}
              </span>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
      {lines.map((line, i) => (
        <p key={i} style={{ color: '#D4D4D8', fontSize: '14px', lineHeight: '1.7' }}>
          {renderContent(line)}
        </p>
      ))}
    </div>
  )
}

export default function ChatMessage({ message }) {
  const { role, content, sources, isError } = message

  // ── User message — right-aligned ────────────────────────────────────────
  if (role === 'user') {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '28px' }}>
        <div style={{ maxWidth: '75%' }}>
          {/* YOU label */}
          <p style={{
            color: '#71717A', fontSize: '9px', textTransform: 'uppercase',
            letterSpacing: '0.1em', fontWeight: '700',
            textAlign: 'right', marginBottom: '6px',
          }}>
            You
          </p>
          {/* Message bubble */}
          <div style={{
            backgroundColor: '#1A1A2F',
            border: '1px solid #2A2A40',
            borderRadius: '10px 10px 2px 10px',
            padding: '10px 14px',
          }}>
            <p style={{ color: '#F4F4F5', fontSize: '14px', lineHeight: '1.65' }}>{content}</p>
          </div>
        </div>
      </div>
    )
  }

  // ── Error state ──────────────────────────────────────────────────────────
  if (isError) {
    return (
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <div style={{
            width: '22px', height: '22px', borderRadius: '4px',
            backgroundColor: '#2A1010', border: '1px solid #3D1515',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <AlertCircle size={11} style={{ color: '#EF4444' }} />
          </div>
          <p style={{ color: '#71717A', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '700' }}>
            DocuMind
          </p>
        </div>
        <div style={{
          padding: '12px 14px',
          backgroundColor: '#1A1010',
          border: '1px solid #3D1515',
          borderRadius: '8px',
        }}>
          <p style={{ color: '#F87171', fontSize: '13px', lineHeight: '1.65' }}>{content}</p>
        </div>
      </div>
    )
  }

  // ── AI response ──────────────────────────────────────────────────────────
  return (
    <div style={{ marginBottom: '32px' }}>
      {/* DOCUMIND label + avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        <div style={{
          width: '22px', height: '22px', borderRadius: '4px',
          backgroundColor: '#1A1A1F', border: '1px solid #2A2A30',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <span style={{ color: '#F4F4F5', fontSize: '10px', fontWeight: '700' }}>D</span>
        </div>
        <p style={{
          color: '#71717A', fontSize: '9px', textTransform: 'uppercase',
          letterSpacing: '0.1em', fontWeight: '700',
        }}>
          DocuMind
        </p>
      </div>

      <MessageBody content={content} />
      <SourcesSection sources={sources} />
    </div>
  )
}
