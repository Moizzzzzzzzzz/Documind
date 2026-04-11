import { useRef, useState } from 'react'
import { Paperclip, Send, Loader2 } from 'lucide-react'

export default function ChatInput({ onSend, onAttach, disabled }) {
  const [value, setValue] = useState('')
  const textareaRef = useRef(null)

  const submit = () => {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  const handleChange = (e) => {
    setValue(e.target.value)
    // Auto-grow textarea
    const el = textareaRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = `${Math.min(el.scrollHeight, 160)}px`
    }
  }

  return (
    <div className="border-t border-gray-200 bg-white px-4 py-3">
      <div className="flex items-end gap-2 bg-gray-100 rounded-2xl px-4 py-2.5">
        {/* Paperclip */}
        <button
          onClick={onAttach}
          disabled={disabled}
          className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 mb-0.5 disabled:opacity-40"
          title="Attach file"
        >
          <Paperclip size={18} />
        </button>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="Ask a question about your documents..."
          className="flex-1 bg-transparent text-sm text-gray-800 placeholder:text-gray-400 outline-none resize-none leading-relaxed max-h-40 disabled:opacity-60"
        />

        {/* Send */}
        <button
          onClick={submit}
          disabled={disabled || !value.trim()}
          className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center text-white flex-shrink-0 hover:bg-indigo-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed mb-0.5"
        >
          {disabled ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Send size={14} />
          )}
        </button>
      </div>
      <p className="text-[10px] text-gray-400 text-center mt-2">
        AI-generated responses may contain inaccuracies. Cross-reference with sources provided.
      </p>
    </div>
  )
}
