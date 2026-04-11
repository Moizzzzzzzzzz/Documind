import { Brain } from 'lucide-react'
import CitationAccordion from './CitationAccordion'

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// Renders bold **text** inline
function renderContent(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    return part
  })
}

// Render bullet lists or plain paragraphs
function MessageBody({ content }) {
  const lines = content.split('\n').filter((l) => l.trim())
  const hasBullets = lines.some((l) => l.trim().startsWith('•') || l.trim().startsWith('-') || l.trim().startsWith('*'))

  if (hasBullets) {
    const intro = lines.filter((l) => !l.trim().match(/^[•\-\*]/))
    const bullets = lines.filter((l) => l.trim().match(/^[•\-\*]/))
    return (
      <div className="space-y-2">
        {intro.map((line, i) => (
          <p key={i} className="text-gray-800 text-sm leading-relaxed">
            {renderContent(line)}
          </p>
        ))}
        <ul className="space-y-1.5">
          {bullets.map((line, i) => {
            const text = line.replace(/^[•\-\*]\s*/, '')
            return (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0" />
                <span className="text-sm text-gray-700 leading-relaxed">
                  {renderContent(text)}
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => (
        <p key={i} className="text-gray-800 text-sm leading-relaxed">
          {renderContent(line)}
        </p>
      ))}
    </div>
  )
}

export default function ChatMessage({ message }) {
  const { role, content, sources, timestamp } = message

  if (role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[70%]">
          <div className="bg-gray-900 text-white rounded-2xl rounded-br-sm px-4 py-3">
            <p className="text-sm leading-relaxed">{content}</p>
          </div>
          <p className="text-[10px] text-gray-400 mt-1 text-right">
            Read {formatTime(timestamp)}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-3">
      {/* AI avatar */}
      <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Brain size={13} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <MessageBody content={content} />
        {sources && sources.length > 0 && (
          <CitationAccordion sources={sources} />
        )}
      </div>
    </div>
  )
}
