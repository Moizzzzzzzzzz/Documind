import { useRef, useState, useEffect, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Toaster } from 'react-hot-toast'
import Sidebar from './components/Sidebar'
import TopNav from './components/TopNav'
import ChatMessage from './components/ChatMessage'
import ChatInput from './components/ChatInput'
import EmptyState from './components/EmptyState'
import { uploadFile, sendChat } from './api'

// Stable session_id for the lifetime of the page
const SESSION_ID = uuidv4()

export default function App() {
  const [documents, setDocuments] = useState([])
  const [messages, setMessages] = useState([])
  const [isChatLoading, setIsChatLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('Documents')
  const chatEndRef = useRef(null)
  const sidebarFileInputRef = useRef(null)

  // Auto-scroll chat to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isChatLoading])

  const handleUpload = useCallback(async (file) => {
    const data = await uploadFile(file)
    setDocuments((prev) => {
      // Deduplicate by filename
      const exists = prev.some((d) => d.filename === data.filename)
      if (exists) return prev
      return [...prev, { filename: data.filename, chunkCount: data.chunk_count }]
    })
  }, [])

  const handleSend = useCallback(async (query) => {
    // Append user message immediately
    setMessages((prev) => [
      ...prev,
      { id: uuidv4(), role: 'user', content: query, timestamp: new Date() },
    ])
    setIsChatLoading(true)

    try {
      const data = await sendChat(query, SESSION_ID)
      setMessages((prev) => [
        ...prev,
        {
          id: uuidv4(),
          role: 'assistant',
          content: data.answer,
          sources: data.sources ?? [],
          timestamp: new Date(),
        },
      ])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: uuidv4(),
          role: 'assistant',
          content: `Sorry, something went wrong: ${err.message}`,
          sources: [],
          timestamp: new Date(),
        },
      ])
    } finally {
      setIsChatLoading(false)
    }
  }, [])

  const handleNewChat = () => {
    setMessages([])
  }

  const handleTopUploadClick = () => {
    // Delegate to the sidebar's hidden file input via a custom event
    sidebarFileInputRef.current?.click()
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50">
      <Toaster position="bottom-right" toastOptions={{ style: { fontSize: '13px' } }} />
      <Sidebar
        documents={documents}
        onUpload={handleUpload}
        onNewChat={handleNewChat}
        fileInputRef={sidebarFileInputRef}
      />

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        <TopNav
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onUploadClick={handleTopUploadClick}
        />

        {/* Chat window */}
        <div className="flex-1 overflow-y-auto scrollbar-chat px-6 py-6">
          {messages.length === 0 ? (
            <EmptyState onUploadClick={handleTopUploadClick} />
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}

              {/* Thinking indicator */}
              {isChatLoading && (
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-[10px] font-bold">AI</span>
                  </div>
                  <div className="flex items-center gap-1 pt-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        <ChatInput
          onSend={handleSend}
          onAttach={handleTopUploadClick}
          disabled={isChatLoading}
        />
      </div>
    </div>
  )
}
