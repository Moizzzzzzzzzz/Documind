import { useState } from 'react'
import { ChevronDown, FileText, Hash } from 'lucide-react'

export default function CitationAccordion({ sources }) {
  const [open, setOpen] = useState(false)

  if (!sources || sources.length === 0) return null

  return (
    <div className="mt-3 border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        {/* Citation icon stack */}
        <div className="flex items-center -space-x-1">
          {sources.slice(0, 3).map((_, i) => (
            <div
              key={i}
              className="w-5 h-5 rounded bg-indigo-100 border-2 border-white flex items-center justify-center"
              style={{ zIndex: sources.length - i }}
            >
              <FileText size={9} className="text-indigo-600" />
            </div>
          ))}
        </div>
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          View {sources.length} Source Citation{sources.length !== 1 ? 's' : ''}
        </span>
        <ChevronDown
          size={14}
          className={`text-gray-400 ml-auto transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="divide-y divide-gray-100">
          {sources.map((src, idx) => (
            <div key={idx} className="px-3 py-2.5 bg-white">
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <FileText size={10} className="text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-xs font-semibold text-gray-800 truncate">
                      {src.metadata?.source_file ?? 'Unknown source'}
                    </p>
                    {src.metadata?.page_number != null && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-gray-400 bg-gray-100 rounded px-1.5 py-0.5 flex-shrink-0">
                        <Hash size={9} />
                        Page {src.metadata.page_number}
                      </span>
                    )}
                  </div>
                  {src.page_content && (
                    <p className="text-xs text-gray-500 leading-relaxed line-clamp-3">
                      {src.page_content}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
