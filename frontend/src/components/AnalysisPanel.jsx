import { X } from 'lucide-react'

// Static placeholder insights shown as soon as a document is loaded
// (real insights would require a backend summarisation endpoint)
const PLACEHOLDER_INSIGHTS = [
  'Latency patterns correlate with DB lock escalations in key schema areas.',
  'Three redundant middleware layers identified for potential deprecation.',
  'Context suggests migration to a modern auth or OIDC provider.',
]

function ResourceBar({ label, value }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
        <span style={{
          color: '#71717A', fontSize: '10px', textTransform: 'uppercase',
          letterSpacing: '0.1em', fontWeight: '600',
        }}>
          {label}
        </span>
        <span style={{ color: '#F4F4F5', fontSize: '11px', fontWeight: '700' }}>{value}%</span>
      </div>
      <div style={{ height: '4px', backgroundColor: '#2A2A30', borderRadius: '2px', overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${value}%`,
            backgroundColor: '#4F46E5',
            borderRadius: '2px',
            transition: 'width 1s ease',
          }}
        />
      </div>
    </div>
  )
}

export default function AnalysisPanel({ document, messages, onClose, onIgnoreDocument }) {
  if (!document) return null

  // Context Window %: chunk_count / 100, clamped 5–99
  const contextPct = Math.min(99, Math.max(5, document.chunkCount ?? 0))

  // Embedding Density: fixed 82% as specified
  const embeddingPct = 82

  return (
    <aside
      style={{
        width: '300px',
        minWidth: '300px',
        backgroundColor: '#0D0D0F',
        borderLeft: '1px solid #2A2A30',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px',
        borderBottom: '1px solid #2A2A30',
        flexShrink: 0,
      }}>
        <p style={{
          color: '#71717A', fontSize: '10px', textTransform: 'uppercase',
          letterSpacing: '0.12em', fontWeight: '700',
        }}>
          Analysis
        </p>
        <button
          onClick={onClose}
          style={{
            width: '24px', height: '24px',
            borderRadius: '5px', border: 'none',
            background: 'transparent', color: '#71717A',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
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
          <X size={13} />
        </button>
      </div>

      {/* ── Scrollable body ────────────────────────────────────────────── */}
      <div className="scrollbar-dm flex-1 overflow-y-auto" style={{ padding: '16px' }}>

        {/* Active Document section */}
        <section style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <p style={{
              color: '#71717A', fontSize: '9px', textTransform: 'uppercase',
              letterSpacing: '0.12em', fontWeight: '700',
            }}>
              Active Document
            </p>
            <button
              onClick={onIgnoreDocument}
              style={{
                padding: '3px 10px',
                borderRadius: '20px',
                border: 'none',
                backgroundColor: '#4F46E5',
                color: '#ffffff',
                fontSize: '10px', fontWeight: '600',
                cursor: 'pointer', letterSpacing: '0.02em',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#4338CA' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#4F46E5' }}
            >
              Ignore
            </button>
          </div>

          {/* Filename */}
          <p style={{
            color: '#F4F4F5', fontSize: '13px', fontWeight: '500',
            marginBottom: '10px', wordBreak: 'break-all', lineHeight: '1.45',
          }}>
            {document.filename}
          </p>

          {/* Stats grid — Size / Pages */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            gap: '1px', backgroundColor: '#2A2A30',
            borderRadius: '8px', overflow: 'hidden', marginBottom: '8px',
          }}>
            {[
              { label: 'Size', value: document.size ?? '—' },
              { label: 'Pages', value: document.pages ?? '—' },
            ].map(({ label, value }) => (
              <div key={label} style={{ backgroundColor: '#1A1A1F', padding: '10px 12px' }}>
                <p style={{
                  color: '#71717A', fontSize: '9px', textTransform: 'uppercase',
                  letterSpacing: '0.1em', fontWeight: '600', marginBottom: '3px',
                }}>
                  {label}
                </p>
                <p style={{ color: '#F4F4F5', fontSize: '15px', fontWeight: '700' }}>{value}</p>
              </div>
            ))}
          </div>

          {/* Indexed Chunks */}
          <div style={{
            backgroundColor: '#1A1A1F', borderRadius: '7px',
            padding: '10px 12px', border: '1px solid #2A2A30',
          }}>
            <p style={{
              color: '#71717A', fontSize: '9px', textTransform: 'uppercase',
              letterSpacing: '0.1em', fontWeight: '600', marginBottom: '4px',
            }}>
              Indexed Chunks
            </p>
            <p style={{ color: '#F4F4F5', fontSize: '15px', fontWeight: '700' }}>
              {(document.chunkCount ?? 0).toLocaleString()}
              <span style={{ color: '#71717A', fontSize: '11px', fontWeight: '400', marginLeft: '5px' }}>
                segments
              </span>
            </p>
          </div>
        </section>

        {/* Divider */}
        <div style={{ height: '1px', backgroundColor: '#2A2A30', marginBottom: '20px' }} />

        {/* Resource Usage */}
        <section style={{ marginBottom: '20px' }}>
          <p style={{
            color: '#71717A', fontSize: '9px', textTransform: 'uppercase',
            letterSpacing: '0.12em', fontWeight: '700', marginBottom: '14px',
          }}>
            Resource Usage
          </p>
          <ResourceBar label="Context Window" value={contextPct} />
          <ResourceBar label="Embedding Density" value={embeddingPct} />
        </section>

        {/* Divider */}
        <div style={{ height: '1px', backgroundColor: '#2A2A30', marginBottom: '20px' }} />

        {/* Real-time Insights */}
        <section>
          <p style={{
            color: '#71717A', fontSize: '9px', textTransform: 'uppercase',
            letterSpacing: '0.12em', fontWeight: '700', marginBottom: '12px',
          }}>
            Real-time Insights
          </p>
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {PLACEHOLDER_INSIGHTS.map((insight, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '9px' }}>
                {/* Diamond bullet */}
                <span style={{
                  marginTop: '5px',
                  width: '6px', height: '6px',
                  flexShrink: 0,
                  backgroundColor: '#4F46E5',
                  borderRadius: '1px',
                  transform: 'rotate(45deg)',
                  display: 'block',
                }} />
                <p style={{ color: '#D4D4D8', fontSize: '12px', lineHeight: '1.65' }}>{insight}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </aside>
  )
}
