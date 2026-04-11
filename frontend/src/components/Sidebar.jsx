import { useRef, useState } from 'react'
import toast from 'react-hot-toast'
import {
  Brain,
  Plus,
  Upload,
  FileText,
  MessageSquare,
  CheckCircle2,
  Loader2,
} from 'lucide-react'
import ThemeToggle from './ThemeToggle'

export default function Sidebar({ documents, onUpload, onNewChat, onSelectSession, sessions = [], fileInputRef: externalRef }) {
  const internalRef = useRef(null)
  const fileInputRef = externalRef ?? internalRef
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)

  const handleFiles = async (files) => {
    if (!files || files.length === 0) return
    setUploading(true)
    try {
      for (const file of files) {
        await onUpload(file)
      }
      toast.success('File uploaded successfully')
    } catch (err) {
      toast.error(err.message || 'Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => setDragOver(false)

  const handleInputChange = (e) => {
    handleFiles(e.target.files)
    e.target.value = ''
  }

  return (
    <aside className="w-64 min-w-64 h-full bg-gray-950 flex flex-col border-r border-gray-800">
      {/* Logo */}
      <div className="px-4 pt-5 pb-4 border-b border-gray-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
            <Brain size={16} className="text-white" />
          </div>
          <div>
            <p className="text-white text-sm font-semibold leading-tight tracking-wide">
              DocuMind AI
            </p>
            <p className="text-gray-500 text-[10px] uppercase tracking-widest leading-tight">
              Elite Digital Curator
            </p>
          </div>
        </div>
      </div>

      {/* New Chat */}
      <div className="px-3 pt-4 pb-3">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-gray-700 text-gray-200 text-sm font-medium hover:bg-gray-800 hover:border-gray-600 transition-colors"
        >
          <Plus size={15} />
          New Chat
        </button>
      </div>

      {/* Upload Zone */}
      <div className="px-3 pb-3">
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={`
            relative w-full rounded-xl border-2 border-dashed p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all
            ${dragOver
              ? 'border-indigo-500 bg-indigo-950/40'
              : 'border-gray-700 hover:border-gray-600 hover:bg-gray-900/60'
            }
            ${uploading ? 'pointer-events-none opacity-70' : ''}
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt"
            multiple
            className="hidden"
            onChange={handleInputChange}
          />
          {uploading ? (
            <Loader2 size={22} className="text-indigo-400 animate-spin" />
          ) : (
            <Upload size={22} className="text-gray-500" />
          )}
          <p className="text-gray-300 text-xs font-medium text-center leading-snug">
            {uploading ? 'Uploading…' : 'Upload Files'}
          </p>
          <p className="text-gray-600 text-[10px] text-center">
            PDF, DOCX up to 50MB
          </p>
        </div>
      </div>

      {/* Uploaded Documents */}
      {documents.length > 0 && (
        <div className="px-3 pb-3 flex flex-col gap-1">
          <p className="text-gray-600 text-[10px] uppercase tracking-widest px-1 mb-1">
            Uploaded Documents
          </p>
          <div className="flex flex-col gap-1 max-h-40 overflow-y-auto scrollbar-thin">
            {documents.map((doc) => (
              <div
                key={doc.filename}
                className="flex items-center gap-2 bg-gray-900 rounded-lg px-2.5 py-2"
              >
                <FileText size={14} className="text-gray-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-gray-200 text-xs truncate leading-tight">
                    {doc.filename}
                  </p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <CheckCircle2 size={10} className="text-emerald-500" />
                    <span className="text-emerald-500 text-[10px]">Ready</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Past Chats */}
      <div className="px-3 pb-3 flex-1 flex flex-col gap-0.5 overflow-y-auto scrollbar-thin min-h-0">
        {sessions.length > 0 && (
          <p className="text-gray-600 text-[10px] uppercase tracking-widest px-1 mb-1 flex-shrink-0">
            Past Chats
          </p>
        )}
        {sessions.map((session) => (
          <button
            key={session.id}
            onClick={() => onSelectSession(session)}
            className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-gray-200 transition-colors text-left"
          >
            <MessageSquare size={14} className="flex-shrink-0" />
            <span className="truncate">{session.title}</span>
          </button>
        ))}
      </div>

      {/* Theme Toggle */}
      <div className="px-3 pb-4 pt-2 border-t border-gray-800 flex-shrink-0">
        <ThemeToggle />
      </div>
    </aside>
  )
}
