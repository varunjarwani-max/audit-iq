import React, { useState } from 'react';
import { StreamlitAppSimulator } from './components/StreamlitAppSimulator';
import { CodeAndFilesExporter } from './components/CodeAndFilesExporter';
import { VSCodeSetupGuide } from './components/VSCodeSetupGuide';
import { 
  Play, 
  Code2, 
  Terminal, 
  CheckCircle2, 
  ShieldAlert, 
  Sparkles,
  Download,
  Github
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'simulator' | 'files' | 'setup'>('simulator');

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Platform Navigation Header */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Platform Title */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 via-rose-600 to-red-700 flex items-center justify-center shadow-xs font-bold text-lg text-white">
              🔍
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-white">
                  AuditIQ
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-950 text-red-300 border border-red-800">
                  POC Step 1
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                External Audit Automation Platform • Data Ingestion
              </p>
            </div>
          </div>

          {/* Tab Navigation */}
          <nav className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/80 text-xs">
            <button
              onClick={() => setActiveTab('simulator')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'simulator'
                  ? 'bg-red-600 text-white shadow-xs font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Play className="w-3.5 h-3.5" />
              <span>Streamlit Preview</span>
            </button>

            <button
              onClick={() => setActiveTab('files')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'files'
                  ? 'bg-red-600 text-white shadow-xs font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Source Files</span>
            </button>

            <button
              onClick={() => setActiveTab('setup')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'setup'
                  ? 'bg-red-600 text-white shadow-xs font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>VS Code Guide</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Tab Content */}
      <main className="flex-1">
        {activeTab === 'simulator' && <StreamlitAppSimulator />}
        {activeTab === 'files' && <CodeAndFilesExporter />}
        {activeTab === 'setup' && <VSCodeSetupGuide />}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-6 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© 2026 AuditIQ POC • Step 1: Data Ingestion &amp; Schema Validation</p>
          <p className="flex items-center gap-2 font-mono text-[11px] text-slate-500">
            <span>requirements.txt</span> • <span>generate_data.py</span> • <span>app.py</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
