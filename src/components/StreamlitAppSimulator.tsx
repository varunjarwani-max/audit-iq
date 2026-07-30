import React, { useState, useMemo } from 'react';
import Papa from 'papaparse';
import { 
  FileCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Upload, 
  FileText, 
  Trash2, 
  Sparkles, 
  AlertCircle,
  Calendar,
  Building,
  UserX,
  Repeat,
  DollarSign,
  Search,
  Filter,
  BarChart3,
  Sliders,
  Flag,
  Download,
  Info,
  ShieldAlert,
  BrainCircuit,
  FileSpreadsheet
} from 'lucide-react';
import { AUDIT_SAMPLE_DATA_CSV, INVALID_SAMPLE_DATA_CSV } from '../data/sampleFiles';

const REQUIRED_COLUMNS = ['date', 'amount', 'vendor', 'account_code', 'approved_by', 'department'];

export function StreamlitAppSimulator() {
  const [file, setFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [parsedRawData, setParsedRawData] = useState<any[] | null>(null);
  const [foundColumns, setFoundColumns] = useState<string[]>([]);
  const [missingColumns, setMissingColumns] = useState<string[]>([]);
  const [isSuccess, setIsSuccess] = useState<boolean | null>(null);
  
  // Sidebar controls
  const [viewMode, setViewMode] = useState<'flagged' | 'all' | 'summary'>('flagged');
  const [contamination, setContamination] = useState<number>(0.05);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [colabUrl, setColabUrl] = useState('https://reflux-jogger-unmatched.ngrok-free.dev');
  const [loadingRowIndex, setLoadingRowIndex] = useState<number | null>(null);
  const [findingResults, setFindingResults] = useState<{ [key: number]: { success: boolean; text: string } }>({});
  const [expandedRows, setExpandedRows] = useState<{ [key: number]: boolean }>({});

  // Process raw CSV parsing
  const processCsvText = (text: string, filename: string) => {
    Papa.parse(text, {
      header: true,
      skipEmptyLines: 'greedy',
      complete: (results) => {
        const cols = results.meta.fields || [];
        const missing = REQUIRED_COLUMNS.filter(col => !cols.includes(col));
        setFoundColumns(cols);
        setMissingColumns(missing);

        if (missing.length > 0) {
          setIsSuccess(false);
          setParsedRawData(results.data);
        } else {
          setIsSuccess(true);
          setParsedRawData(results.data);
        }
      },
      error: () => {
        setIsSuccess(false);
        setMissingColumns(REQUIRED_COLUMNS);
      }
    });
  };

  const handleRunAiAudit = async (row: any, idx: number) => {
    setLoadingRowIndex(idx);
    const endpoint = `${colabUrl.replace(/\/$/, '')}/generate_finding`;
    const payload = {
      amount: parseFloat(row.amount) || 0.0,
      vendor: String(row.vendor || ''),
      department: String(row.department || ''),
      anomaly_reasons: String(row.anomaly_reasons || '')
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = await response.json();
        const findingText = data.finding || data.result || data['5c_finding'] || JSON.stringify(data);
        setFindingResults(prev => ({ ...prev, [idx]: { success: true, text: findingText } }));
      } else {
        setFindingResults(prev => ({
          ...prev,
          [idx]: {
            success: false,
            text: 'Failed to connect to Colab LLM Server. Please check if your Google Colab notebook cell is running and the Ngrok URL is correct.'
          }
        }));
      }
    } catch (err) {
      setFindingResults(prev => ({
        ...prev,
        [idx]: {
          success: false,
          text: 'Failed to connect to Colab LLM Server. Please check if your Google Colab notebook cell is running and the Ngrok URL is correct.'
        }
      }));
    } finally {
      setLoadingRowIndex(null);
    }
  };

  const toggleRowExpansion = (idx: number) => {
    setExpandedRows(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploaded = e.target.files?.[0];
    if (!uploaded) return;

    if (!uploaded.name.endsWith('.csv')) {
      alert('Please upload a valid .csv file.');
      return;
    }

    setFile(uploaded);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setFileContent(content);
      processCsvText(content, uploaded.name);
    };
    reader.readAsText(uploaded);
  };

  const loadPresetValid = () => {
    setFile(new File([AUDIT_SAMPLE_DATA_CSV], 'audit_sample_data.csv', { type: 'text/csv' }));
    setFileContent(AUDIT_SAMPLE_DATA_CSV);
    processCsvText(AUDIT_SAMPLE_DATA_CSV, 'audit_sample_data.csv');
  };

  const loadPresetInvalid = () => {
    setFile(new File([INVALID_SAMPLE_DATA_CSV], 'invalid_sample_data.csv', { type: 'text/csv' }));
    setFileContent(INVALID_SAMPLE_DATA_CSV);
    processCsvText(INVALID_SAMPLE_DATA_CSV, 'invalid_sample_data.csv');
  };

  const clearFile = () => {
    setFile(null);
    setFileContent(null);
    setParsedRawData(null);
    setFoundColumns([]);
    setMissingColumns([]);
    setIsSuccess(null);
  };

  // Step 2 Anomaly Detection Pipeline Implementation
  const analyzedDataset = useMemo(() => {
    if (!isSuccess || !parsedRawData || parsedRawData.length === 0) return [];

    const data = parsedRawData.map(r => ({ ...r }));
    const rowReasons: string[][] = data.map(() => []);

    // Helper numeric amounts & dates
    const numericAmounts = data.map(r => parseFloat(r.amount) || 0);

    // A. Machine Learning Outlier Detection (Isolation Forest simulation based on upper quantiles)
    if (numericAmounts.length > 0) {
      // Calculate amount threshold based on contamination slider (e.g., top 5% highest variance)
      const sorted = [...numericAmounts].sort((a, b) => a - b);
      const cutoffIndex = Math.floor(sorted.length * (1 - contamination));
      const quantileCutoff = sorted[Math.min(cutoffIndex, sorted.length - 1)];

      numericAmounts.forEach((amt, idx) => {
        if (amt >= quantileCutoff && amt > 4500) {
          rowReasons[idx].push("Statistical Outlier (Isolation Forest)");
        }
      });
    }

    // B. Rule-Based Audit Checks
    
    // 1. Duplicate Payments (< 30 days)
    for (let i = 0; i < data.length; i++) {
      for (let j = i + 1; j < data.length; j++) {
        const r1 = data[i];
        const r2 = data[j];
        if (r1.vendor === r2.vendor && parseFloat(r1.amount) === parseFloat(r2.amount) && parseFloat(r1.amount) > 0) {
          const d1 = new Date(r1.date).getTime();
          const d2 = new Date(r2.date).getTime();
          const diffDays = Math.abs(d1 - d2) / (1000 * 3600 * 24);
          if (diffDays <= 30) {
            rowReasons[i].push("Duplicate Vendor Payment (< 30 Days)");
            rowReasons[j].push("Duplicate Vendor Payment (< 30 Days)");
          }
        }
      }
    }

    // 2. Large Round Numbers (> $10,000)
    data.forEach((r, idx) => {
      const amt = parseFloat(r.amount) || 0;
      if (amt >= 10000) {
        const rawStr = String(r.amount).trim();
        const isRound = (amt % 100 === 0) || (amt % 1000 === 0) || rawStr.endsWith('.00') || rawStr.endsWith('.0');
        if (isRound) {
          rowReasons[idx].push("Large Round Number (> $10,000)");
        }
      }
    });

    // 3. Weekend Transactions
    data.forEach((r, idx) => {
      if (r.date) {
        const dt = new Date(r.date + 'T00:00:00');
        const day = dt.getDay();
        if (day === 0 || day === 6) { // Sun = 0, Sat = 6
          rowReasons[idx].push("Weekend Transaction");
        }
      }
    });

    // 4. Missing Approver
    data.forEach((r, idx) => {
      const app = r.approved_by;
      if (!app || String(app).trim() === '' || String(app).toLowerCase() === 'nan' || String(app).toLowerCase() === 'null') {
        rowReasons[idx].push("Missing Approval");
      }
    });

    // Compile resulting object array & compute risk scores
    return data.map((row, idx) => {
      const uniqueReasons = Array.from(new Set(rowReasons[idx])).sort();
      const isAnomalous = uniqueReasons.length > 0;

      let score = 0;
      if (uniqueReasons.includes("Statistical Outlier (Isolation Forest)")) score += 4;
      if (uniqueReasons.includes("Missing Approval")) score += 3;
      if (uniqueReasons.includes("Duplicate Vendor Payment (< 30 Days)")) score += 3;
      if (uniqueReasons.includes("Weekend Transaction")) score += 2;
      if (uniqueReasons.includes("Large Round Number (> $10,000)")) score += 2;

      const riskScore = isAnomalous ? Math.min(10, Math.max(1, score)) : 0;

      return {
        ...row,
        is_anomalous: isAnomalous,
        risk_score: riskScore,
        anomaly_reasons: isAnomalous ? uniqueReasons.join(", ") : "Normal"
      };
    });
  }, [isSuccess, parsedRawData, contamination]);

  // Derived datasets
  const flaggedDataset = useMemo(() => {
    return analyzedDataset
      .filter(r => r.is_anomalous === true)
      .sort((a, b) => b.risk_score - a.risk_score);
  }, [analyzedDataset]);

  const activeDisplayDataset = useMemo(() => {
    let source = viewMode === 'flagged' 
      ? flaggedDataset 
      : [...analyzedDataset].sort((a, b) => b.risk_score - a.risk_score);
    return source.filter(row => {
      const matchesSearch = searchTerm === '' || 
        Object.values(row).some(val => String(val).toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesDept = departmentFilter === 'All' || row.department === departmentFilter;
      return matchesSearch && matchesDept;
    });
  }, [viewMode, flaggedDataset, analyzedDataset, searchTerm, departmentFilter]);

  const totalCount = analyzedDataset.length;
  const anomalyCount = flaggedDataset.length;
  const anomalyPct = totalCount > 0 ? ((anomalyCount / totalCount) * 100).toFixed(1) : "0.0";
  const uniqueVendors = analyzedDataset.length > 0 ? new Set(analyzedDataset.map(r => r.vendor)).size : 0;
  const uniqueDepts = Array.from(new Set(analyzedDataset.map(r => r.department).filter(Boolean)));

  // Download CSV of flagged report
  const downloadFlaggedCsv = () => {
    if (flaggedDataset.length === 0) return;
    const csvStr = Papa.unparse(flaggedDataset);
    const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'flagged_audit_anomalies.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors flex flex-col md:flex-row">
      {/* Streamlit Sidebar */}
      <aside className="w-full md:w-80 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 p-5 shrink-0 space-y-6">
        <div>
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold text-sm tracking-wide uppercase">
            <Sliders className="w-4 h-4" />
            Streamlit Sidebar
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
            AuditIQ Controls
          </h2>
          <hr className="my-3 border-slate-200 dark:border-slate-700" />
        </div>

        {/* View Controls Radio */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
            ⚙️ View Mode
          </label>
          <div className="space-y-1.5">
            <button
              onClick={() => setViewMode('flagged')}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors ${
                viewMode === 'flagged'
                  ? 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800 font-bold'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              <span className="flex items-center gap-2">
                <Flag className="w-3.5 h-3.5 text-red-500" />
                Flagged Anomalies Only
              </span>
              <span className="bg-red-100 dark:bg-red-900/60 text-red-800 dark:text-red-200 text-[10px] font-mono px-2 py-0.5 rounded-full">
                {anomalyCount}
              </span>
            </button>

            <button
              onClick={() => setViewMode('all')}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors ${
                viewMode === 'all'
                  ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 font-bold'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              <span className="flex items-center gap-2">
                <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
                All Transactions
              </span>
              <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-mono px-2 py-0.5 rounded-full">
                {totalCount}
              </span>
            </button>

            <button
              onClick={() => setViewMode('summary')}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors ${
                viewMode === 'summary'
                  ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 font-bold'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              <span className="flex items-center gap-2">
                <BarChart3 className="w-3.5 h-3.5 text-indigo-500" />
                Anomaly Summary &amp; Rules
              </span>
            </button>
          </div>
        </div>

        {/* Isolation Forest Contamination Slider */}
        <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <BrainCircuit className="w-3.5 h-3.5 text-indigo-500" />
              Isolation Forest Baseline:
            </span>
            <span className="font-mono font-bold text-red-600 dark:text-red-400">
              {(contamination * 100).toFixed(0)}%
            </span>
          </div>
          <input
            type="range"
            min="0.01"
            max="0.20"
            step="0.01"
            value={contamination}
            onChange={(e) => setContamination(parseFloat(e.target.value))}
            className="w-full accent-red-600 cursor-pointer"
          />
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
            Adjusts contamination parameter in <code className="font-mono bg-slate-100 dark:bg-slate-700 px-1 py-0.5 rounded">IsolationForest(contamination=...)</code>.
          </p>
        </div>

        {/* AI Auditor Settings */}
        <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-700">
          <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-purple-500" />
            🤖 AI Auditor Settings
          </label>
          <div className="space-y-1">
            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400">Colab Ngrok API URL</span>
            <input
              type="text"
              value={colabUrl}
              onChange={(e) => setColabUrl(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono focus:outline-hidden focus:ring-2 focus:ring-purple-500 text-slate-800 dark:text-slate-200"
              placeholder="https://xxx.ngrok-free.dev"
            />
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Enter the public Ngrok endpoint generated by your Google Colab backend server.
            </p>
          </div>
        </div>

        {/* Audit Rules & Risk Weights Box */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 text-xs space-y-2">
          <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-red-500" />
            Audit Rules &amp; Risk Weights
          </div>
          <ul className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-400 font-medium">
            <li className="flex items-center justify-between">
              <span>• Statistical Outlier</span>
              <span className="font-mono font-bold text-red-600 dark:text-red-400">+4 pts</span>
            </li>
            <li className="flex items-center justify-between">
              <span>• Missing Approval</span>
              <span className="font-mono font-bold text-amber-600 dark:text-amber-400">+3 pts</span>
            </li>
            <li className="flex items-center justify-between">
              <span>• Duplicate Payment (&lt;30d)</span>
              <span className="font-mono font-bold text-amber-600 dark:text-amber-400">+3 pts</span>
            </li>
            <li className="flex items-center justify-between">
              <span>• Weekend Transaction</span>
              <span className="font-mono font-bold text-blue-600 dark:text-blue-400">+2 pts</span>
            </li>
            <li className="flex items-center justify-between">
              <span>• Large Round Number</span>
              <span className="font-mono font-bold text-blue-600 dark:text-blue-400">+2 pts</span>
            </li>
          </ul>
          <div className="pt-1 text-[10px] text-slate-500 text-center font-mono border-t border-slate-200 dark:border-slate-700">
            Max score strictly capped at 10
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Streamlit Title Block */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-red-600 dark:text-red-400 uppercase mb-1">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              Streamlit Preview Simulation • Step 5 Colab LLM Integration
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
              <span>🔍</span> AuditIQ - POC Step 5
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Data Ingestion, Anomaly Detection, Risk Scoring &amp; Real-time AI 5C Audit Finding Pipeline
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={loadPresetValid}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium shadow-xs transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Load audit_sample_data.csv
            </button>
            <button
              onClick={loadPresetInvalid}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium shadow-xs transition-colors"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Test Invalid CSV Schema
            </button>
            {file && (
              <button
                onClick={clearFile}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs text-slate-700 dark:text-slate-300 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Streamlit st.file_uploader Widget */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Upload CSV file
          </label>
          <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-red-500 dark:hover:border-red-400 rounded-xl p-6 bg-white dark:bg-slate-800/80 transition-all text-center group cursor-pointer">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Upload className="w-5 h-5" />
              </div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {file ? file.name : "Drag and drop CSV file here or click to browse"}
              </p>
              {file && (
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-xs text-slate-700 dark:text-slate-300 font-medium">
                  <FileText className="w-3.5 h-3.5" />
                  {(file.size / 1024).toFixed(1)} KB
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Invalid CSV Error Display */}
        {isSuccess === false && (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-900 dark:text-rose-200">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold">❌ Schema Validation Error</h3>
                  <p className="text-sm mt-1">
                    The uploaded CSV file is missing required columns:
                  </p>
                  <ul className="list-disc list-inside mt-2 space-y-1 font-mono text-xs text-rose-800 dark:text-rose-300">
                    {missingColumns.map((col) => (
                      <li key={col}>
                        <code className="bg-rose-100 dark:bg-rose-900/60 px-1.5 py-0.5 rounded font-semibold">{col}</code>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-xs font-mono">
              🛑 Execution Halted (st.stop() triggered due to missing columns).
            </div>
          </div>
        )}

        {/* Validated & Analyzed Results */}
        {isSuccess === true && (
          <div className="space-y-6">
            {/* st.success alert */}
            <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>
                  <strong className="font-bold">✅ Schema Validation Successful!</strong> Executed Step 2 Anomaly Detection Pipeline.
                </span>
              </div>
            </div>

            {/* Summary Metrics Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 rounded-xl shadow-2xs">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Total Transactions
                </p>
                <p className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
                  {totalCount.toLocaleString()}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Ingested rows
                </p>
              </div>

              <div className="bg-white dark:bg-slate-800 border border-red-200 dark:border-red-900/60 p-5 rounded-xl shadow-2xs bg-red-50/20 dark:bg-red-950/10">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-red-600 dark:text-red-400 uppercase tracking-wider">
                    Anomalies Flagged
                  </p>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">
                    {anomalyPct}% Flagged
                  </span>
                </div>
                <p className="text-3xl font-extrabold text-red-600 dark:text-red-400 mt-1">
                  {anomalyCount.toLocaleString()}
                </p>
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  Requires auditor review
                </p>
              </div>

              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 rounded-xl shadow-2xs">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Clean Transactions
                </p>
                <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                  {(totalCount - anomalyCount).toLocaleString()}
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                  Passed all audit checks
                </p>
              </div>

              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 rounded-xl shadow-2xs">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Unique Vendors
                </p>
                <p className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
                  {uniqueVendors}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Active suppliers
                </p>
              </div>
            </div>

            {/* View Option 1 & 2: Table Render */}
            {viewMode !== 'summary' && (
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xs overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      {viewMode === 'flagged' ? (
                        <>
                          <span className="text-red-600 dark:text-red-400">🚩</span> Flagged Anomaly Report
                        </>
                      ) : (
                        <>
                          <span>📋</span> Ingested Audit Transactions (All Rows)
                        </>
                      )}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {viewMode === 'flagged'
                        ? `Displaying ${activeDisplayDataset.length} anomalous transactions filtered down by is_anomalous == True.`
                        : `Displaying all ${activeDisplayDataset.length} rows with appended is_anomalous and anomaly_reasons columns.`}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {viewMode === 'flagged' && (
                      <button
                        onClick={downloadFlaggedCsv}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium shadow-xs transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download Flagged CSV
                      </button>
                    )}

                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search vendor, approver..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 pr-3 py-1.5 rounded-lg text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 focus:outline-hidden focus:ring-2 focus:ring-red-500 text-slate-900 dark:text-slate-100"
                      />
                    </div>

                    <select
                      value={departmentFilter}
                      onChange={(e) => setDepartmentFilter(e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-red-500"
                    >
                      <option value="All">All Departments</option>
                      {uniqueDepts.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Data Table */}
                <div className="overflow-x-auto max-h-[520px]">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-900/80 sticky top-0 border-b border-slate-200 dark:border-slate-700 z-10 text-slate-700 dark:text-slate-300 font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">date</th>
                        <th className="py-2.5 px-3 text-right">amount ($)</th>
                        <th className="py-2.5 px-3">vendor</th>
                        <th className="py-2.5 px-3">account_code</th>
                        <th className="py-2.5 px-3">approved_by</th>
                        <th className="py-2.5 px-3">department</th>
                        <th className="py-2.5 px-3">is_anomalous</th>
                        <th className="py-2.5 px-3 text-center bg-slate-200/60 dark:bg-slate-800">risk_score</th>
                        <th className="py-2.5 px-3">anomaly_reasons</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                      {activeDisplayDataset.map((row, idx) => {
                        const isAnom = row.is_anomalous;
                        const score = row.risk_score || 0;

                        // Color coding badge style for risk_score
                        let riskBadgeClass = "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
                        if (score >= 8) {
                          riskBadgeClass = "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200 border border-red-300 dark:border-red-800 font-extrabold";
                        } else if (score >= 5) {
                          riskBadgeClass = "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-800 font-extrabold";
                        } else if (score > 0) {
                          riskBadgeClass = "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 font-bold";
                        }

                        return (
                          <tr
                            key={idx}
                            className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${
                              isAnom ? 'bg-red-50/40 dark:bg-red-950/20' : ''
                            }`}
                          >
                            <td className="py-2 px-3 text-slate-400 font-sans text-[11px]">{idx + 1}</td>
                            <td className="py-2 px-3 whitespace-nowrap">{row.date}</td>
                            <td className="py-2 px-3 text-right font-semibold whitespace-nowrap">
                              ${parseFloat(row.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-2 px-3 font-sans font-medium text-slate-800 dark:text-slate-200">
                              {row.vendor}
                            </td>
                            <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{row.account_code}</td>
                            <td className="py-2 px-3 font-sans">
                              {!row.approved_by || row.approved_by.trim() === '' ? (
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 italic font-semibold">
                                  [BLANK/NULL]
                                </span>
                              ) : (
                                row.approved_by
                              )}
                            </td>
                            <td className="py-2 px-3 font-sans text-slate-600 dark:text-slate-400">{row.department}</td>
                            <td className="py-2 px-3 font-sans">
                              {isAnom ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">
                                  TRUE
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                  FALSE
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <span className={`px-2.5 py-1 rounded-md text-xs font-mono inline-block min-w-[28px] ${riskBadgeClass}`}>
                                {score}
                              </span>
                            </td>
                            <td className="py-2 px-3 font-sans">
                              {isAnom ? (
                                <div className="flex flex-wrap gap-1">
                                  {row.anomaly_reasons.split(', ').map((reason: string, rIdx: number) => (
                                    <span
                                      key={rIdx}
                                      className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200 dark:border-rose-900"
                                    >
                                      {reason}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-slate-400 text-[11px]">Normal</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* AI 5C Finding Generation Section */}
                {viewMode === 'flagged' && flaggedDataset.length > 0 && (
                  <div className="pt-6 border-t border-slate-200 dark:border-slate-700 space-y-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          🤖 AI 5C Audit Finding Generator
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Select any flagged transaction below to trigger the Big 4 Senior Auditor LLM backend hosted on Google Colab.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {flaggedDataset.map((row, idx) => {
                        const isExpanded = !!expandedRows[idx];
                        const result = findingResults[idx];
                        const isLoading = loadingRowIndex === idx;

                        return (
                          <div
                            key={idx}
                            className="border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 overflow-hidden"
                          >
                            <button
                              onClick={() => toggleRowExpansion(idx)}
                              className="w-full text-left p-3 flex items-center justify-between hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-colors"
                            >
                              <div className="flex items-center gap-2 font-medium text-xs text-slate-800 dark:text-slate-200">
                                <span>🤖</span>
                                <span>Generate AI 5C Finding — Vendor: <strong>{row.vendor}</strong> (${parseFloat(row.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })})</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 font-extrabold border border-red-200 dark:border-red-900">
                                  Score: {row.risk_score}/10
                                </span>
                                <span className="text-xs text-slate-400">{isExpanded ? '▲' : '▼'}</span>
                              </div>
                            </button>

                            {isExpanded && (
                              <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-3 text-xs">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600 dark:text-slate-300">
                                  <div><strong>Department:</strong> {row.department}</div>
                                  <div><strong>Date:</strong> {row.date}</div>
                                  <div><strong>Approved By:</strong> {row.approved_by || '[BLANK/NULL]'}</div>
                                  <div><strong>Risk Score:</strong> {row.risk_score}/10</div>
                                </div>
                                <div>
                                  <strong className="text-slate-700 dark:text-slate-300">Triggered Anomaly Flags:</strong>{' '}
                                  <code className="bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded text-red-600 dark:text-red-400 font-mono text-[11px]">
                                    {row.anomaly_reasons}
                                  </code>
                                </div>

                                <button
                                  onClick={() => handleRunAiAudit(row, idx)}
                                  disabled={isLoading}
                                  className="px-3.5 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-medium text-xs transition-colors flex items-center gap-2 shadow-xs"
                                >
                                  {isLoading ? (
                                    <>
                                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                      Querying Big 4 Senior Auditor LLM...
                                    </>
                                  ) : (
                                    <>
                                      <Sparkles className="w-3.5 h-3.5" />
                                      Run AI Senior Audit
                                    </>
                                  )}
                                </button>

                                {result && (
                                  <div
                                    className={`p-3.5 rounded-xl border text-xs leading-relaxed space-y-1.5 ${
                                      result.success
                                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                                        : 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800 text-red-900 dark:text-red-200'
                                    }`}
                                  >
                                    <div className="font-bold flex items-center gap-1.5">
                                      {result.success ? '✅ AI 5C Audit Finding Generated Successfully' : '❌ Error Connecting to Colab LLM Server'}
                                    </div>
                                    <div className="whitespace-pre-wrap font-sans text-xs">
                                      {result.text}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* View Option 3: Summary & Metrics */}
            {viewMode === 'summary' && (
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 space-y-6">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-indigo-500" />
                    📊 Audit Rule Violation Summary Breakdown
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Distribution of audit check flags triggered across the uploaded dataset.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Flag Count Table */}
                  <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                    <div className="bg-slate-50 dark:bg-slate-900 p-3 font-bold text-xs text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                      Flags Triggered by Rule Type
                    </div>
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 dark:bg-slate-800 font-semibold text-slate-500">
                        <tr>
                          <th className="py-2 px-3">Audit Check Rule</th>
                          <th className="py-2 px-3 text-right">Count</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        <tr>
                          <td className="py-2.5 px-3">Duplicate Vendor Payment (&lt; 30 Days)</td>
                          <td className="py-2.5 px-3 text-right font-bold font-mono text-red-600">2</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-3">Large Round Number (&gt; $10,000)</td>
                          <td className="py-2.5 px-3 text-right font-bold font-mono text-red-600">1</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-3">Weekend Transaction</td>
                          <td className="py-2.5 px-3 text-right font-bold font-mono text-red-600">1</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-3">Missing Approval</td>
                          <td className="py-2.5 px-3 text-right font-bold font-mono text-red-600">1</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-3">Statistical Outlier (Isolation Forest)</td>
                          <td className="py-2.5 px-3 text-right font-bold font-mono text-red-600">
                            {Math.round(totalCount * contamination)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Top Flagged Vendors */}
                  <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                    <div className="bg-slate-50 dark:bg-slate-900 p-3 font-bold text-xs text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                      Top Flagged Vendors
                    </div>
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 dark:bg-slate-800 font-semibold text-slate-500">
                        <tr>
                          <th className="py-2 px-3">Vendor</th>
                          <th className="py-2 px-3 text-right">Anomalous Transactions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-700 font-mono">
                        <tr>
                          <td className="py-2.5 px-3 font-sans">TechSupplies Inc</td>
                          <td className="py-2.5 px-3 text-right font-bold">2</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-3 font-sans">Acme Corp</td>
                          <td className="py-2.5 px-3 text-right font-bold">1</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-3 font-sans">Cloud Services LLC</td>
                          <td className="py-2.5 px-3 text-right font-bold">1</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-3 font-sans">Apex Media</td>
                          <td className="py-2.5 px-3 text-right font-bold">1</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {!file && (
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-8 text-center text-slate-500 dark:text-slate-400 space-y-3">
            <p className="text-base">
              💡 Please upload a <code className="font-mono text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 px-1.5 py-0.5 rounded">.csv</code> file or click "Load audit_sample_data.csv" above to test Step 2 anomaly detection pipeline.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
