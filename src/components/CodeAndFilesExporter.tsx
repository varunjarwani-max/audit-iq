import React, { useState } from 'react';
import { 
  FileCode, 
  Download, 
  Copy, 
  Check, 
  Terminal, 
  FileText, 
  FolderDown, 
  Sparkles,
  Layers,
  Code2
} from 'lucide-react';
import { 
  REQUIREMENTS_TXT, 
  GENERATE_DATA_PY, 
  APP_PY, 
  AUDIT_SAMPLE_DATA_CSV 
} from '../data/sampleFiles';

interface FileDefinition {
  filename: string;
  language: string;
  content: string;
  description: string;
  badge: string;
}

const FILES: FileDefinition[] = [
  {
    filename: 'requirements.txt',
    language: 'plaintext',
    content: REQUIREMENTS_TXT,
    description: 'Python dependencies required for Streamlit app, Pandas, Scikit-Learn (IsolationForest), and NumPy.',
    badge: 'Dependencies'
  },
  {
    filename: 'generate_data.py',
    language: 'python',
    content: GENERATE_DATA_PY,
    description: 'Generates synthetic dataset of 75-100 audit transactions with 4 planted anomalies.',
    badge: 'Synthetic Data Script'
  },
  {
    filename: 'app.py',
    language: 'python',
    content: APP_PY,
    description: 'Streamlit app featuring schema validation, IsolationForest ML outlier detection, and 4 rule-based audit checks.',
    badge: 'Streamlit Application (Step 2)'
  },
  {
    filename: 'audit_sample_data.csv',
    language: 'csv',
    content: AUDIT_SAMPLE_DATA_CSV,
    description: 'Generated synthetic dataset containing 90 audit transactions with planted anomalies.',
    badge: 'Sample Dataset'
  }
];

export function CodeAndFilesExporter() {
  const [activeFile, setActiveFile] = useState<FileDefinition>(FILES[0]);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(activeFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSingle = (file: FileDefinition) => {
    const blob = new Blob([file.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadAll = () => {
    FILES.forEach((file) => {
      setTimeout(() => {
        handleDownloadSingle(file);
      }, 150);
    });
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider mb-1">
            <Code2 className="w-4 h-4" />
            POC Step 2 Source Files
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Source Code &amp; Data Exporter
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
            Inspect, copy, or download all updated Step 2 project files for pushing to GitHub and local execution in VS Code.
          </p>
        </div>

        <button
          onClick={handleDownloadAll}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white font-medium text-xs shadow-xs transition-colors shrink-0"
        >
          <FolderDownload className="w-4 h-4" />
          Download All 4 Files
        </button>
      </div>

      {/* Main Layout: File Selector Tabs + Code View */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Tabs */}
        <div className="space-y-2">
          {FILES.map((file) => {
            const isActive = activeFile.filename === file.filename;
            return (
              <button
                key={file.filename}
                onClick={() => setActiveFile(file)}
                className={`w-full text-left p-3.5 rounded-xl border transition-all flex flex-col gap-1 ${
                  isActive
                    ? 'border-red-500 bg-red-50/70 dark:bg-red-950/30 text-slate-900 dark:text-white shadow-2xs'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-600 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold flex items-center gap-2">
                    <FileCode className={`w-4 h-4 ${isActive ? 'text-red-600 dark:text-red-400' : 'text-slate-400'}`} />
                    {file.filename}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded font-sans font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                    {file.badge}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                  {file.description}
                </p>
              </button>
            );
          })}
        </div>

        {/* Code View Area */}
        <div className="lg:col-span-3 bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden flex flex-col">
          {/* Top Bar */}
          <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
              </div>
              <span className="font-mono text-xs text-slate-300 font-semibold pl-2 border-l border-slate-800">
                {activeFile.filename}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy Code
                  </>
                )}
              </button>

              <button
                onClick={() => handleDownloadSingle(activeFile)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-medium transition-colors shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                Download {activeFile.filename}
              </button>
            </div>
          </div>

          {/* Description header inside editor */}
          <div className="px-4 py-2 bg-slate-900/90 border-b border-slate-800/60 text-xs text-slate-400 font-sans">
            {activeFile.description}
          </div>

          {/* Code Body */}
          <div className="p-4 overflow-x-auto overflow-y-auto max-h-[550px] font-mono text-xs text-slate-200 leading-relaxed">
            <pre>
              <code>{activeFile.content}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

function FolderDownload(props: any) {
  return <FolderDown {...props} />;
}
