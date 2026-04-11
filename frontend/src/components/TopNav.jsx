import { Search, Upload, Bell, User } from 'lucide-react'
import toast from 'react-hot-toast'

const TABS = ['Current Analysis', 'Documents', 'Analysis', 'Team']
const PRO_TABS = new Set(['Analysis', 'Team'])

export default function TopNav({ activeTab, setActiveTab, onUploadClick }) {
  const handleTabClick = (tab) => {
    if (PRO_TABS.has(tab)) {
      toast('Pro Feature: Coming in v2.0!', { icon: '🔒' })
    } else {
      setActiveTab(tab)
    }
  }

  return (
    <header className="h-14 border-b border-gray-200 flex items-center px-6 gap-6 flex-shrink-0 bg-white">
      {/* Tabs */}
      <nav className="flex items-center gap-1 h-full">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabClick(tab)}
            className={`
              h-full px-3 text-sm font-medium border-b-2 transition-colors
              ${activeTab === tab
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            {tab}
          </button>
        ))}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search analysis..."
          className="pl-8 pr-3 py-1.5 text-sm bg-gray-100 rounded-lg border-0 outline-none focus:ring-2 focus:ring-indigo-300 w-44 placeholder:text-gray-400"
        />
      </div>

      {/* Upload button */}
      <button
        onClick={onUploadClick}
        className="flex items-center gap-1.5 bg-gray-900 text-white text-sm font-medium px-3.5 py-1.5 rounded-lg hover:bg-gray-700 transition-colors"
      >
        <Upload size={13} />
        Upload
      </button>

      {/* Icons */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => toast('Pro Feature: Coming in v2.0!', { icon: '🔒' })}
          className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <Bell size={16} />
        </button>
        <button
          onClick={() => toast('Pro Feature: Coming in v2.0!', { icon: '🔒' })}
          className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center"
        >
          <User size={14} className="text-white" />
        </button>
      </div>
    </header>
  )
}
