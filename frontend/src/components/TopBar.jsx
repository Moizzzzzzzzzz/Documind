import { Upload, Loader2 } from 'lucide-react'

export default function TopBar({ chatTitle, onUploadClick, uploading }) {
  return (
    <header
      style={{
        height: '52px',
        backgroundColor: '#0D0D0F',
        borderBottom: '1px solid #2A2A30',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        flexShrink: 0,
        gap: '12px',
      }}
    >
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0 }}>
        <span style={{ color: '#71717A', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          DocuMind
        </span>
        <span style={{ color: '#2A2A30', fontSize: '11px' }}>/</span>
        <span style={{ color: '#71717A', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {chatTitle || 'New Chat'}
        </span>
      </div>

      {/* Upload button */}
      <button
        onClick={onUploadClick}
        disabled={uploading}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 14px',
          borderRadius: '7px',
          border: '1px solid #2A2A30',
          background: 'transparent',
          color: uploading ? '#4F46E5' : '#F4F4F5',
          fontSize: '12px',
          fontWeight: '500',
          cursor: uploading ? 'not-allowed' : 'pointer',
          letterSpacing: '0.03em',
          transition: 'all 0.15s',
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          if (!uploading) {
            e.currentTarget.style.background = '#1A1A1F'
            e.currentTarget.style.borderColor = '#3A3A42'
          }
        }}
        onMouseLeave={(e) => {
          if (!uploading) {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.borderColor = '#2A2A30'
          }
        }}
      >
        {uploading ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <Upload size={12} />
        )}
        Upload
      </button>

      {/* Avatar */}
      <div
        style={{
          width: '30px',
          height: '30px',
          borderRadius: '50%',
          backgroundColor: '#1A1A1F',
          border: '1px solid #2A2A30',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          cursor: 'pointer',
        }}
      >
        <span style={{ color: '#F4F4F5', fontSize: '12px', fontWeight: '600' }}>D</span>
      </div>
    </header>
  )
}
