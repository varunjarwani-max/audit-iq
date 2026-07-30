import React, { useState } from 'react';
import { 
  Terminal, 
  Check, 
  Copy, 
  Laptop, 
  FolderGit2, 
  GitBranch, 
  Play, 
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Cpu
} from 'lucide-react';

export function VSCodeSetupGuide() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const steps = [
    {
      title: "1. Update Local Repository & Install Dependencies",
      description: "Install or update required packages including scikit-learn and numpy for Step 2 anomaly detection.",
      command: `pip install -r requirements.txt`,
      explanation: "Installs Streamlit, Pandas, Scikit-Learn (IsolationForest), and NumPy."
    },
    {
      title: "2. Generate Synthetic Dataset with Planted Anomalies",
      description: "Run the Python script to build audit_sample_data.csv featuring 90 transactions and 4 deliberate anomalies.",
      command: `python generate_data.py`,
      explanation: "Creates audit_sample_data.csv with duplicate payments, large round amounts, weekend dates, and missing approvers."
    },
    {
      title: "3. Launch AuditIQ Step 2 Streamlit App",
      description: "Execute Streamlit to start the interactive anomaly detection web application on localhost.",
      command: `streamlit run app.py`,
      explanation: "Opens AuditIQ Step 2 on http://localhost:8501 with ML outlier detection & rule-based checks."
    }
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Overview Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 text-red-300 text-xs font-semibold uppercase tracking-wider border border-red-500/30">
              <Laptop className="w-3.5 h-3.5" />
              Local VS Code &amp; GitHub Setup
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Running AuditIQ Step 2 Locally
            </h2>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Follow these simple terminal commands to run the updated Step 2 Anomaly Detection Pipeline directly in VS Code.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 text-xs space-y-1.5 shrink-0">
            <div className="font-bold text-slate-200 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Step 2 Verification Status
            </div>
            <div className="text-slate-400">
              • Schema Validation: <span className="text-emerald-400 font-bold">Active</span>
            </div>
            <div className="text-slate-400">
              • IsolationForest ML: <span className="text-emerald-400 font-bold">Active</span>
            </div>
            <div className="text-slate-400">
              • 4 Audit Check Rules: <span className="text-emerald-400 font-bold">Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Steps List */}
      <div className="space-y-6">
        {steps.map((step, idx) => (
          <div
            key={idx}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-2xs space-y-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {step.title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  {step.description}
                </p>
              </div>

              <span className="w-7 h-7 rounded-full bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 font-bold text-xs flex items-center justify-center shrink-0">
                {idx + 1}
              </span>
            </div>

            {/* Terminal Block */}
            <div className="bg-slate-900 text-slate-100 rounded-xl p-4 font-mono text-xs border border-slate-800 flex items-center justify-between gap-4 group">
              <div className="flex items-center gap-3 overflow-x-auto">
                <Terminal className="w-4 h-4 text-red-400 shrink-0" />
                <code className="text-red-300 font-bold">{step.command}</code>
              </div>

              <button
                onClick={() => copyToClipboard(step.command, idx)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-sans transition-colors shrink-0"
              >
                {copiedIndex === idx ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy Command
                  </>
                )}
              </button>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
              💡 {step.explanation}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
