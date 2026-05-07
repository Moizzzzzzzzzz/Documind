import { useRef, useState, useEffect, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Toaster } from 'react-hot-toast'
import toast from 'react-hot-toast'
import { SignedIn, SignedOut, SignIn, useAuth } from '@clerk/clerk-react'

import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import ChatMessage from './components/ChatMessage'
import ChatInput from './components/ChatInput'
import EmptyState from './components/EmptyState'
import AnalysisPanel from './components/AnalysisPanel'
import SettingsModal from './components/SettingsModal'
import { uploadFile, sendChat, formatFileSize } from './api'

// ── Auth gate ─────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <>
      <SignedOut>
        <div className="auth-screen">
          <SignIn
            routing="hash"
            appearance={{
              variables: {
                colorBackground: '#0D0D0F',
                colorText: '#ffffff',
                colorPrimary: '#6366f1',
                colorInputBackground: '#1a1a1f',
                colorInputText: '#ffffff',
              },
              elements: {
                card: { boxShadow: 'none', border: '1px solid rgba(255,255,255,0.08)' },
                formButtonPrimary: { borderRadius: '6px' },
              },
            }}
          />
        </div>
      </SignedOut>
      <SignedIn>
        <DocuMindApp />
      </SignedIn>
      <style>{`
        .auth-screen {
          min-height: 100vh;
          background: #0D0D0F;
          display: flex;
          align-items: center;
          justify-content: center;
        }
      `}</style>
    </>
  )
}

// ── Main application (rendered only when signed in) ───────────────────────────

function DocuMindApp() {
  const { getToken } = useAuth()

  // ── Session (local conversation tracking — namespace derived server-side from userId)
  const [sessionId, setSessionId] = useState(() => uuidv4())
  const sessionIdRef = useRef(sessionId)

  // ── Documents ─────────────────────────────────────────────────────────────
  const [documents, setDocuments] = useState([])          // all uploaded docs
  const [activeDocument, setActiveDocument] = useState(null) // shown in panel

  // ── Chat ──────────────────────────────────────────────────────────────────
  const [messages, setMessages] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const streamingRef = useRef('')
  const currentSourcesRef = useRef([])
  const abortControllerRef = useRef(null)

  // ── Sessions (recent history, client-side) ────────────────────────────────
  const [sessions, setSessions] = useState([])

  // ── UI state ──────────────────────────────────────────────────────────────
  const [activeView, setActiveView] = useState('recent')       // sidebar tab
  const [analysisPanelOpen, setAnalysisPanelOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const chatEndRef = useRef(null)
  const fileInputRef = useRef(null)   // single shared ref for the file picker

  // Keep ref in sync with state so callbacks with stale closures still work
  useEffect(() => { sessionIdRef.current = sessionId }, [sessionId])

  // ── Auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading, streamingContent])

  // ── Upload ────────────────────────────────────────────────────────────────
  const handleUpload = useCallback(async (file) => {
    setUploading(true)
    try {
      const token = await getToken()
      const data = await uploadFile(file, token)
      const newDoc = {
        id: uuidv4(),
        filename: data.filename,
        chunkCount: data.chunk_count,
        size: formatFileSize(file.size),
        pages: data.page_count ?? '—',
      }
      setDocuments((prev) => {
        const exists = prev.some((d) => d.filename === data.filename)
        if (exists) {
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
  }, [getToken])

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
    setIsStreaming(false)
    setStreamingContent('')
    streamingRef.current = ''
    currentSourcesRef.current = []

    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      const token = await getToken()
      const res = await fetch('/api/chat-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ query }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ detail: 'Chat request failed' }))
        throw new Error(errBody.detail ?? `Chat failed: ${res.status}`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let firstToken = true

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop()

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          let event
          try { event = JSON.parse(line.slice(6)) } catch { continue }

          if (event.type === 'token') {
            if (firstToken) {
              firstToken = false
              setIsLoading(false)
              setIsStreaming(true)
            }
            streamingRef.current += event.content
            setStreamingContent(streamingRef.current)
          } else if (event.type === 'sources') {
            currentSourcesRef.current = event.sources
          } else if (event.type === 'done') {
            setMessages((prev) => [
              ...prev,
              {
                id: uuidv4(),
                role: 'assistant',
                content: streamingRef.current,
                sources: currentSourcesRef.current,
                timestamp: new Date(),
              },
            ])
            if (activeDocument) setAnalysisPanelOpen(true)
            return
          } else if (event.type === 'error') {
            throw new Error(event.message)
          }
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') return
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
      setStreamingContent('')
      streamingRef.current = ''
      currentSourcesRef.current = []
      setIsLoading(false)
      setIsStreaming(false)
    }
  }, [activeDocument, getToken])

  const handleSuggestion = useCallback((text) => {
    handleSend(text)
  }, [handleSend])

  // ── New Conversation ──────────────────────────────────────────────────────
  const handleNewChat = useCallback(() => {
    abortControllerRef.current?.abort()
    setIsStreaming(false)
    setIsLoading(false)
    setStreamingContent('')
    streamingRef.current = ''

    if (messages.length > 0) {
      const firstUser = messages.find((m) => m.role === 'user')
      const title = firstUser
        ? firstUser.content.slice(0, 48) + (firstUser.content.length > 48 ? '…' : '')
        : 'Untitled conversation'
      setSessions((prev) => [
        { id: uuidv4(), title, messages, sessionId, timestamp: new Date() },
        ...prev.slice(0, 19),
      ])
    }

    setMessages([])
    const newId = uuidv4()
    setSessionId(newId)
    sessionIdRef.current = newId
    setAnalysisPanelOpen(false)
    setActiveDocument(null)
  }, [messages, sessionId])

  const handleSelectSession = useCallback((session) => {
    setMessages(session.messages)
    setSessions((prev) => prev.filter((s) => s.id !== session.id))
  }, [])

  const handleDocumentClick = useCallback((doc) => {
    setActiveDocument(doc)
    setAnalysisPanelOpen(true)
  }, [])

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

              {/* Analyzing indicator — while waiting for first token */}
              {isLoading && !isStreaming && (
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <div style={{ width: '22px', height: '22px', borderRadius: '4px', backgroundColor: '#1A1A1F', border: '1px solid #2A2A30', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ color: '#F4F4F5', fontSize: '10px', fontWeight: '700' }}>D</span>
                    </div>
                    <p style={{ color: '#71717A', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '600' }}>DocuMind</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: '#71717A', fontSize: '13px', fontStyle: 'italic' }}>Analyzing</span>
                    <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
                      {[0, 0.18, 0.36].map((delay, i) => (
                        <span key={i} style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#71717A', display: 'block', animation: `dm-bounce 1.1s ease-in-out ${delay}s infinite` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Live streaming bubble — tokens arrive word by word */}
              {isStreaming && (
                <div style={{ marginBottom: '32px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <div style={{ width: '22px', height: '22px', borderRadius: '4px', backgroundColor: '#1A1A1F', border: '1px solid #2A2A30', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ color: '#F4F4F5', fontSize: '10px', fontWeight: '700' }}>D</span>
                    </div>
                    <p style={{ color: '#71717A', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '700' }}>DocuMind</p>
                  </div>
                  <div style={{ color: '#D4D4D8', fontSize: '14px', lineHeight: '1.7', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {streamingContent}<span style={{ display: 'inline-block', animation: 'dm-cursor-blink 1s step-end infinite', color: '#4F46E5', marginLeft: '1px' }}>▋</span>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        <ChatInput
          onSend={handleSend}
          disabled={isLoading || isStreaming}
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
        @keyframes dm-cursor-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  )
}
