import { Plus, Clock, FileText, Settings, HelpCircle, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Sidebar({
  documents,
  sessions,
  activeView,
  activeDocument,
  onViewChange,
  onUploadClick,
  onNewChat,
  onSelectSession,
  onDocumentClick,
  onOpenSettings,
  uploading,
}) {
  return (
    <aside
      style={{
        width: '260px',
        minWidth: '260px',
        backgroundColor: '#111113',
        borderRight: '1px solid #2A2A30',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ── Logo ──────────────────────────────────────────────────────── */}
      <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid #2A2A30', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '36px', height: '36px',
              backgroundColor: '#1A1A1F',
              border: '1px solid #2A2A30',
              borderRadius: '7px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <span style={{ color: '#F4F4F5', fontSize: '16px', fontWeight: '700', letterSpacing: '-0.5px' }}>D</span>
          </div>
          <div>
            <p style={{ color: '#F4F4F5', fontSize: '14px', fontWeight: '600', lineHeight: '1.2', letterSpacing: '0.01em' }}>
              DocuMind AI
            </p>
            <p style={{ color: '#71717A', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.12em', lineHeight: '1.5' }}>
              Precision Intelligence
            </p>
          </div>
        </div>
      </div>

      {/* ── New Conversation ──────────────────────────────────────────── */}
      <div style={{ padding: '14px 12px 8px', flexShrink: 0 }}>
        <button
          onClick={onNewChat}
          style={{
            width: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '9px 14px',
            borderRadius: '8px',
            border: '1px solid #2A2A30',
            background: 'transparent',
            color: '#F4F4F5',
            fontSize: '13px', fontWeight: '500',
            cursor: 'pointer',
            transition: 'background 0.15s, border-color 0.15s',
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
          <span>New Conversation</span>
          <Plus size={14} style={{ color: '#71717A' }} />
        </button>
      </div>

      {/* ── Library nav ───────────────────────────────────────────────── */}
      <div style={{ padding: '8px 12px 4px', flexShrink: 0 }}>
        <p style={{
          color: '#71717A', fontSize: '9px', textTransform: 'uppercase',
          letterSpacing: '0.12em', fontWeight: '600', padding: '0 4px 8px',
        }}>
          Library
        </p>

        {[
          { id: 'recent', label: 'Recent', Icon: Clock },
          { id: 'documents', label: 'Documents', Icon: FileText },
        ].map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => onViewChange(id)}
            style={{
              width: '100%',
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '8px 10px',
              borderRadius: '7px',
              border: 'none',
              background: activeView === id ? '#1A1A1F' : 'transparent',
              color: activeView === id ? '#F4F4F5' : '#71717A',
              fontSize: '13px', fontWeight: '500',
              cursor: 'pointer', textAlign: 'left',
              transition: 'background 0.15s, color 0.15s',
              marginBottom: '2px',
            }}
            onMouseEnter={(e) => {
              if (activeView !== id) {
                e.currentTarget.style.background = '#1A1A1F'
                e.currentTarget.style.color = '#F4F4F5'
              }
            }}
            onMouseLeave={(e) => {
              if (activeView !== id) {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = '#71717A'
              }
            }}
          >
            <Icon size={14} style={{ flexShrink: 0 }} />
            <span>{label}</span>
            {/* Badge: document count or session count */}
            {id === 'documents' && documents.length > 0 && (
              <span style={{
                marginLeft: 'auto',
                backgroundColor: '#1A1A1F',
                border: '1px solid #2A2A30',
                color: '#71717A',
                fontSize: '9px',
                fontWeight: '700',
                padding: '1px 6px',
                borderRadius: '10px',
                letterSpacing: '0.04em',
              }}>
                {documents.length}
              </span>
            )}
            {id === 'recent' && sessions.length > 0 && (
              <span style={{
                marginLeft: 'auto',
                backgroundColor: '#1A1A1F',
                border: '1px solid #2A2A30',
                color: '#71717A',
                fontSize: '9px',
                fontWeight: '700',
                padding: '1px 6px',
                borderRadius: '10px',
                letterSpacing: '0.04em',
              }}>
                {sessions.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Dynamic list (Recent / Documents) ─────────────────────────── */}
      <div
        className="scrollbar-dm"
        style={{ flex: 1, overflowY: 'auto', padding: '4px 12px', minHeight: 0 }}
      >
        {/* ── RECENT view ────────────────────────────────────── */}
        {activeView === 'recent' && (
          <>
            {sessions.length === 0 ? (
              <p style={{ color: '#71717A', fontSize: '11px', padding: '8px 4px', fontStyle: 'italic', lineHeight: '1.5' }}>
                No recent conversations yet
              </p>
            ) : (
              sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => onSelectSession(session)}
                  title={session.title}
                  style={{
                    width: '100%',
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '7px 8px',
                    borderRadius: '6px',
                    border: 'none',
                    background: 'transparent',
                    color: '#71717A',
                    fontSize: '12px',
                    cursor: 'pointer', textAlign: 'left',
                    transition: 'background 0.15s, color 0.15s',
                    marginBottom: '2px',
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
                  <Clock size={11} style={{ flexShrink: 0, opacity: 0.7 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {session.title}
                  </span>
                </button>
              ))
            )}
          </>
        )}

        {/* ── DOCUMENTS view ─────────────────────────────────── */}
        {activeView === 'documents' && (
          <>
            {documents.length === 0 ? (
              <p style={{ color: '#71717A', fontSize: '11px', padding: '8px 4px', fontStyle: 'italic', lineHeight: '1.5' }}>
                No documents yet — upload a PDF, DOCX, or TXT
              </p>
            ) : (
              documents.map((doc) => {
                const isActive = activeDocument?.filename === doc.filename
                return (
                  <button
                    key={doc.id ?? doc.filename}
                    onClick={() => onDocumentClick(doc)}
                    title={doc.filename}
                    style={{
                      width: '100%',
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '9px 10px',
                      borderRadius: '7px',
                      border: isActive ? '1px solid #3A3A50' : '1px solid transparent',
                      background: isActive ? '#1A1A2F' : 'transparent',
                      cursor: 'pointer', textAlign: 'left',
                      transition: 'all 0.15s',
                      marginBottom: '3px',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = '#1A1A1F'
                        e.currentTarget.style.borderColor = '#2A2A30'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'transparent'
                        e.currentTarget.style.borderColor = 'transparent'
                      }
                    }}
                  >
                    {/* File icon */}
                    <FileText size={14} style={{ flexShrink: 0, color: isActive ? '#4F46E5' : '#71717A' }} />

                    {/* File info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        color: '#F4F4F5', fontSize: '12px', fontWeight: '500',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        lineHeight: '1.3', marginBottom: '2px',
                      }}>
                        {doc.filename}
                      </p>
                      <p style={{ color: '#71717A', fontSize: '10px' }}>
                        {doc.chunkCount} segments · {doc.size}
                      </p>
                    </div>

                    {/* Green "indexed" dot */}
                    <span
                      title="Indexed successfully"
                      style={{
                        width: '7px', height: '7px',
                        borderRadius: '50%',
                        backgroundColor: '#22C55E',
                        flexShrink: 0,
                        boxShadow: '0 0 5px rgba(34, 197, 94, 0.5)',
                      }}
                    />
                  </button>
                )
              })
            )}
          </>
        )}
      </div>

      {/* ── Bottom: Upload + Settings/Support ─────────────────────────── */}
      <div style={{ padding: '10px 12px 14px', borderTop: '1px solid #2A2A30', flexShrink: 0 }}>
        {/* Upload Document dashed button */}
        <button
          onClick={onUploadClick}
          disabled={uploading}
          style={{
            width: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            padding: '7px',
            marginBottom: '6px',
            borderRadius: '7px',
            border: '1px dashed #2A2A30',
            background: 'transparent',
            color: uploading ? '#4F46E5' : '#71717A',
            fontSize: '11px',
            cursor: uploading ? 'not-allowed' : 'pointer',
            opacity: uploading ? 0.7 : 1,
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            if (!uploading) {
              e.currentTarget.style.borderColor = '#4F46E5'
              e.currentTarget.style.color = '#4F46E5'
            }
          }}
          onMouseLeave={(e) => {
            if (!uploading) {
              e.currentTarget.style.borderColor = '#2A2A30'
              e.currentTarget.style.color = '#71717A'
            }
          }}
        >
          {uploading ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
          <span>{uploading ? 'Uploading…' : 'Upload Document'}</span>
        </button>

        {/* Settings + Support */}
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={onOpenSettings}
            style={{
              flex: 1,
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '7px 8px',
              borderRadius: '7px',
              border: 'none',
              background: 'transparent',
              color: '#71717A',
              fontSize: '12px',
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
            <Settings size={13} />
            <span>Settings</span>
          </button>

          <button
            onClick={() => toast('Support documentation coming soon', { icon: '📚' })}
            style={{
              flex: 1,
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '7px 8px',
              borderRadius: '7px',
              border: 'none',
              background: 'transparent',
              color: '#71717A',
              fontSize: '12px',
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
            <HelpCircle size={13} />
            <span>Support</span>
          </button>
        </div>
      </div>
    </aside>
  )
}
