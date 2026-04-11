import { Brain, Upload, MessageSquare } from 'lucide-react'

export default function EmptyState({ onUploadClick }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center px-8">
      <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center">
        <Brain size={32} className="text-indigo-500 dark:text-indigo-400" />
      </div>
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Start your research
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xs leading-relaxed">
          Upload documents from the sidebar, then ask questions to get AI-powered insights with source citations.
        </p>
      </div>
      <div className="flex gap-4">
        <button
          onClick={onUploadClick}
          className="flex items-center gap-2 bg-gray-900 dark:bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-600 dark:hover:bg-indigo-500 transition-colors"
        >
          <Upload size={14} />
          Upload a document
        </button>
        <button className="flex items-center gap-2 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <MessageSquare size={14} />
          Ask a question
        </button>
      </div>
    </div>
  )
}
