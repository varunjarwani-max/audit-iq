import React, { useState } from 'react';
import { Terminal, Copy, Check, ExternalLink, GitBranch, Play, ShieldAlert, FileCheck2 } from 'lucide-react';

export function VSCodeSetupGuide() {
  const [copiedStep, setCopiedStep] = useState<string | null>(null);

  const copyCommand = (cmd: string, key: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedStep(key);
    setTimeout(() => setCopiedStep(null), 2000);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Title */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-2xs">
        <div className="flex items-center gap-2 text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider mb-1">
          <Terminal className="w-4 h-4" />
          VS Code &amp; GitHub Setup Guide
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          How to Run AuditIQ - POC Step 1 Locally
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
          Follow these 3 simple commands to run the Streamlit app and generate synthetic data on your machine.
        </p>
      </div>

      {/* Step by Step Execution Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Step 1 */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 font-bold flex items-center justify-center text-sm mb-3">
              1
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Install Dependencies
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 mb-4">
              Install Streamlit and Pandas listed in <code className="font-mono bg-slate-100 dark:bg-slate-700 px-1 py-0.5 rounded">requirements.txt</code>.
            </p>
          </div>

          <div className="bg-slate-900 rounded-lg p-3 font-mono text-xs text-emerald-400 flex items-center justify-between gap-2 border border-slate-800">
            <code>pip install -r requirements.txt</code>
            <button
              onClick={() => copyCommand('pip install -r requirements.txt', 'step1')}
              className="text-slate-400 hover:text-white transition-colors"
            >
              {copiedStep === 'step1' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Step 2 */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 font-bold flex items-center justify-center text-sm mb-3">
              2
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Generate Synthetic Dataset
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 mb-4">
              Executes Python script to generate <code className="font-mono bg-slate-100 dark:bg-slate-700 px-1 py-0.5 rounded">audit_sample_data.csv</code> with 4 planted anomalies.
            </p>
          </div>

          <div className="bg-slate-900 rounded-lg p-3 font-mono text-xs text-emerald-400 flex items-center justify-between gap-2 border border-slate-800">
            <code>python generate_data.py</code>
            <button
              onClick={() => copyCommand('python generate_data.py', 'step2')}
              className="text-slate-400 hover:text-white transition-colors"
            >
              {copiedStep === 'step2' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Step 3 */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 font-bold flex items-center justify-center text-sm mb-3">
              3
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Launch Streamlit App
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 mb-4">
              Launches the wide layout AuditIQ Step 1 Streamlit app in your default browser.
            </p>
          </div>

          <div className="bg-slate-900 rounded-lg p-3 font-mono text-xs text-emerald-400 flex items-center justify-between gap-2 border border-slate-800">
            <code>streamlit run app.py</code>
            <button
              onClick={() => copyCommand('streamlit run app.py', 'step3')}
              className="text-slate-400 hover:text-white transition-colors"
            >
              {copiedStep === 'step3' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* GitHub Push Instructions */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
          <GitBranch className="w-4 h-4 text-red-600 dark:text-red-400" />
          Git Repository Initialization Commands
        </div>

        <div className="bg-slate-900 rounded-xl p-4 font-mono text-xs text-slate-200 space-y-2 border border-slate-800 overflow-x-auto">
          <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800 text-[11px]">
            <span>Terminal Shell Commands</span>
            <button
              onClick={() => copyCommand(`git init\ngit add .\ngit commit -m "feat: AuditIQ POC Step 1 - Data Ingestion & Schema Validation"\ngit branch -M main`, 'git')}
              className="hover:text-white transition-colors flex items-center gap-1"
            >
              {copiedStep === 'git' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              Copy All Git Commands
            </button>
          </div>
          <p className="text-emerald-400">git init</p>
          <p className="text-emerald-400">git add .</p>
          <p className="text-emerald-400">git commit -m "feat: AuditIQ POC Step 1 - Data Ingestion &amp; Schema Validation"</p>
          <p className="text-emerald-400">git branch -M main</p>
          <p className="text-slate-500"># git remote add origin git@github.com:YOUR_USERNAME/AuditIQ-POC.git</p>
          <p className="text-slate-500"># git push -u origin main</p>
        </div>
      </div>
    </div>
  );
}
