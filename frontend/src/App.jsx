import { useRef, useState, useEffect, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Toaster } from 'react-hot-toast'
import toast from 'react-hot-toast'

import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import ChatMessage from './components/ChatMessage'
import ChatInput from './components/ChatInput'
import EmptyState from './components/EmptyState'
import AnalysisPanel from './components/AnalysisPanel'
import SettingsModal from './components/SettingsModal'
import { uploadFile, sendChat, formatFileSize } from './api'

export default function App() {
  // ── Session ────────────────────────────────────────────────────────────────
  // sessionId lives in state so New Conversation can mint a fresh UUID
  const [sessionId, setSessionId] = useState(() => uuidv4())

  // ── Documents ─────────────────────────────────────────────────────────────
  const [documents, setDocuments] = useState([])          // all uploaded docs
  const [activeDocument, setActiveDocument] = useState(null) // shown in panel

  // ── Chat ──────────────────────────────────────────────────────────────────
  const [messages, setMessages] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  // ── Sessions (recent history, client-side) ────────────────────────────────
  const [sessions, setSessions] = useState([])

  // ── UI state ──────────────────────────────────────────────────────────────
  const [activeView, setActiveView] = useState('recent')       // sidebar tab
  const [analysisPanelOpen, setAnalysisPanelOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const chatEndRef = useRef(null)
  const fileInputRef = useRef(null)   // single shared ref for the file picker

  // ── Auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // ── Upload ────────────────────────────────────────────────────────────────
  const handleUpload = useCallback(async (file) => {
    setUploading(true)
    try {
      const data = await uploadFile(file, sessionId)
      const newDoc = {
        id: uuidv4(),
        filename: data.filename,
        chunkCount: data.chunk_count,
        // File.size is in bytes — convert client-side since API doesn't return it
        size: formatFileSize(file.size),
        pages: data.page_count ?? '—',
      }
      setDocuments((prev) => {
        const exists = prev.some((d) => d.filename === data.filename)
        if (exists) {
          // Update chunk count and page count for re-uploaded file
          return prev.map((d) => d.filename === data.filename ? { ...d, chunkCount: data.chunk_count, pages: data.page_count ?? '—' } : d)
        }
        return [...prev, newDoc]
      })
      setActiveDocument(newDoc)
      setAnalysisPanelOpen(true)
      toast.success(`"${data.filename}" indexed — ${data.chunk_count} segments`)
    } catch (err) {
      toast.error(err.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }, [])

  const handleFileInputChange = useCallback((e) => {
    const files = Array.from(e.target.files || [])
    files.forEach((f) => handleUpload(f))
    e.target.value = ''
  }, [handleUpload])

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  // ── Chat ──────────────────────────────────────────────────────────────────
  const handleSend = useCallback(async (query) => {
    const userMsg = { id: uuidv4(), role: 'user', content: query, timestamp: new Date() }
    setMessages((prev) => [...prev, userMsg])
    setIsLoading(true)

    try {
      const data = await sendChat(query, sessionId)
      const aiMsg = {
        id: uuidv4(),
        role: 'assistant',
        content: data.answer,
        sources: data.sources ?? [],
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, aiMsg])
      // Auto-open analysis panel after first AI response if a doc is available
      if (activeDocument) setAnalysisPanelOpen(true)
    } catch (err) {
      toast.error(err.message || 'Something went wrong')
      setMessages((prev) => [
        ...prev,
        {
          id: uuidv4(),
          role: 'assistant',
          isError: true,
          content: err.message || 'Something went wrong. Please try again.',
          sources: [],
          timestamp: new Date(),
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }, [sessionId, activeDocument])

  // Suggestion pills fire directly as chat messages
  const handleSuggestion = useCallback((text) => {
    handleSend(text)
  }, [handleSend])

  // ── New Conversation ──────────────────────────────────────────────────────
  const handleNewChat = useCallback(() => {
    // Save current conversation to the Recent list if it has messages
    if (messages.length > 0) {
      const firstUser = messages.find((m) => m.role === 'user')
      const title = firstUser
        ? firstUser.content.slice(0, 48) + (firstUser.content.length > 48 ? '…' : '')
        : 'Untitled conversation'
      setSessions((prev) => [
        { id: uuidv4(), title, messages, sessionId, timestamp: new Date() },
        ...prev.slice(0, 19),   // cap at 20 recent entries
      ])
    }

    // Reset chat state
    setMessages([])
    setSessionId(uuidv4())           // new UUID = new backend conversation thread
    setAnalysisPanelOpen(false)
    setActiveDocument(null)
  }, [messages, sessionId])

  // ── Select a past session from Recent ─────────────────────────────────────
  const handleSelectSession = useCallback((session) => {
    // Restore messages; keep using current session_id (read-only history)
    setMessages(session.messages)
    setSessions((prev) => prev.filter((s) => s.id !== session.id))
  }, [])

  // ── Document click in sidebar ─────────────────────────────────────────────
  const handleDocumentClick = useCallback((doc) => {
    setActiveDocument(doc)
    setAnalysisPanelOpen(true)
  }, [])

  // ── Ignore (remove) the active document ──────────────────────────────────
  const handleIgnoreDocument = useCallback(() => {
    if (!activeDocument) return
    setDocuments((prev) => {
      const remaining = prev.filter((d) => d.filename !== activeDocument.filename)
      if (remaining.length > 0) {
        setActiveDocument(remaining[remaining.length - 1])
      } else {
        setActiveDocument(null)
        setAnalysisPanelOpen(false)
      }
      return remaining
    })
  }, [activeDocument])

  // ── Chat title for TopBar breadcrumb ──────────────────────────────────────
  const firstUserMsg = messages.find((m) => m.role === 'user')
  const chatTitle = firstUserMsg
    ? firstUserMsg.content.slice(0, 32) + (firstUserMsg.content.length > 32 ? '…' : '')
    : 'New Chat'

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        backgroundColor: '#0D0D0F',
      }}
    >
      {/* Hidden shared file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.txt"
        multiple
        className="hidden"
        onChange={handleFileInputChange}
      />

      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 3500,
          style: {
            background: '#1A1A1F',
            color: '#F4F4F5',
            border: '1px solid #2A2A30',
            fontSize: '13px',
            borderRadius: '8px',
          },
        }}
      />

      {/* ── Left Sidebar ─────────────────────────────────────────────────── */}
      <Sidebar
        documents={documents}
        sessions={sessions}
        activeView={activeView}
        activeDocument={activeDocument}
        onViewChange={setActiveView}
        onUploadClick={openFilePicker}
        onNewChat={handleNewChat}
        onSelectSession={handleSelectSession}
        onDocumentClick={handleDocumentClick}
        onOpenSettings={() => setSettingsOpen(true)}
        uploading={uploading}
      />

      {/* ── Main area ────────────────────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          backgroundColor: '#0D0D0F',
        }}
      >
        <TopBar
          chatTitle={chatTitle}
          onUploadClick={openFilePicker}
          uploading={uploading}
        />

        {/* Chat window */}
        <div
          className="scrollbar-dm"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: messages.length === 0 ? '0' : '32px 40px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {messages.length === 0 ? (
            <EmptyState onSuggestion={handleSuggestion} />
          ) : (
            <div style={{ maxWidth: '720px', width: '100%', margin: '0 auto' }}>
              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}

              {/* Analyzing indicator */}
              {isLoading && (
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <div
                      style={{
                        width: '22px', height: '22px', borderRadius: '4px',
                        backgroundColor: '#1A1A1F', border: '1px solid #2A2A30',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <span style={{ color: '#F4F4F5', fontSize: '10px', fontWeight: '700' }}>D</span>
                    </div>
                    <p style={{ color: '#71717A', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '600' }}>
                      DocuMind
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: '#71717A', fontSize: '13px', fontStyle: 'italic' }}>Analyzing</span>
                    <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
                      {[0, 0.18, 0.36].map((delay, i) => (
                        <span
                          key={i}
                          style={{
                            width: '4px', height: '4px',
                            borderRadius: '50%',
                            backgroundColor: '#71717A',
                            display: 'block',
                            animation: `dm-bounce 1.1s ease-in-out ${delay}s infinite`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        <ChatInput
          onSend={handleSend}
          disabled={isLoading}
          hasMessages={messages.length > 0}
        />
      </div>

      {/* ── Right Analysis Panel ─────────────────────────────────────────── */}
      {analysisPanelOpen && activeDocument && (
        <AnalysisPanel
          document={activeDocument}
          messages={messages}
          onClose={() => setAnalysisPanelOpen(false)}
          onIgnoreDocument={handleIgnoreDocument}
        />
      )}

      {/* ── Settings Modal ────────────────────────────────────────────────── */}
      {settingsOpen && (
        <SettingsModal onClose={() => setSettingsOpen(false)} />
      )}

      {/* Keyframe animations */}
      <style>{`
        @keyframes dm-bounce {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50% { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
