import React, { useState } from 'react';
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
  BarChart3
} from 'lucide-react';
import { AUDIT_SAMPLE_DATA_CSV, INVALID_SAMPLE_DATA_CSV } from '../data/sampleFiles';

const REQUIRED_COLUMNS = ['date', 'amount', 'vendor', 'account_code', 'approved_by', 'department'];

export function StreamlitAppSimulator() {
  const [file, setFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<any[] | null>(null);
  const [foundColumns, setFoundColumns] = useState<string[]>([]);
  const [missingColumns, setMissingColumns] = useState<string[]>([]);
  const [isSuccess, setIsSuccess] = useState<boolean | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [showAnomalyInspector, setShowAnomalyInspector] = useState(true);

  // Schema validation logic mirroring app.py
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
          setParsedData(results.data);
        } else {
          setIsSuccess(true);
          setParsedData(results.data);
        }
      },
      error: (err) => {
        setIsSuccess(false);
        setMissingColumns(REQUIRED_COLUMNS);
      }
    });
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
    setParsedData(null);
    setFoundColumns([]);
    setMissingColumns([]);
    setIsSuccess(null);
  };

  // Detect 4 planted anomalies
  const detectAnomalies = (data: any[]) => {
    if (!data || data.length === 0) return [];

    const anomalies: { type: string; desc: string; rows: any[]; badge: string }[] = [];

    // 1. Weekend dates
    const weekendRows = data.filter(row => {
      if (!row.date) return false;
      const dt = new Date(row.date + 'T00:00:00');
      const day = dt.getDay();
      return day === 0 || day === 6; // Sun = 0, Sat = 6
    });

    if (weekendRows.length > 0) {
      anomalies.push({
        type: 'Weekend Date Transaction',
        desc: 'Transactions posted on a Saturday or Sunday.',
        rows: weekendRows,
        badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
      });
    }

    // 2. Round number > $10,000
    const roundLargeRows = data.filter(row => {
      const amt = parseFloat(row.amount);
      return !isNaN(amt) && amt > 10000 && amt % 100 === 0;
    });

    if (roundLargeRows.length > 0) {
      anomalies.push({
        type: 'Round Amount > $10,000',
        desc: 'Large round-dollar amount exceeding $10,000 requiring higher authorization.',
        rows: roundLargeRows,
        badge: 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300'
      });
    }

    // 3. Null / Blank Approved By
    const nullApproverRows = data.filter(row => {
      return !row.approved_by || row.approved_by.trim() === '' || row.approved_by === 'NaN' || row.approved_by === 'null';
    });

    if (nullApproverRows.length > 0) {
      anomalies.push({
        type: 'Missing Approver (Null / Blank)',
        desc: 'Transaction lacking an approving authority name.',
        rows: nullApproverRows,
        badge: 'bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300'
      });
    }

    // 4. Duplicate amount to same vendor within 30 days
    const duplicates: any[] = [];
    for (let i = 0; i < data.length; i++) {
      for (let j = i + 1; j < data.length; j++) {
        const r1 = data[i];
        const r2 = data[j];
        if (r1.vendor === r2.vendor && parseFloat(r1.amount) === parseFloat(r2.amount)) {
          const d1 = new Date(r1.date).getTime();
          const d2 = new Date(r2.date).getTime();
          const diffDays = Math.abs(d1 - d2) / (1000 * 3600 * 24);
          if (diffDays <= 30) {
            if (!duplicates.includes(r1)) duplicates.push(r1);
            if (!duplicates.includes(r2)) duplicates.push(r2);
          }
        }
      }
    }

    if (duplicates.length > 0) {
      anomalies.push({
        type: 'Duplicate Amount (Same Vendor < 30 days)',
        desc: 'Identical amount charged by same vendor within a 30-day timeframe.',
        rows: duplicates,
        badge: 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300'
      });
    }

    return anomalies;
  };

  const detectedAnomalies = isSuccess && parsedData ? detectAnomalies(parsedData) : [];

  // Filtered rows for data table
  const filteredRows = parsedData?.filter(row => {
    const matchesSearch = searchTerm === '' || 
      Object.values(row).some(val => String(val).toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesDept = departmentFilter === 'All' || row.department === departmentFilter;
    return matchesSearch && matchesDept;
  }) || [];

  const uniqueVendors = isSuccess && parsedData ? new Set(parsedData.map(r => r.vendor)).size : 0;
  const uniqueDepts = isSuccess && parsedData ? Array.from(new Set(parsedData.map(r => r.department).filter(Boolean))) : [];

  return (
    <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors">
      {/* Streamlit Top Red Bar Accent */}
      <div className="h-1.5 bg-gradient-to-r from-red-500 via-rose-500 to-red-600 w-full" />

      {/* Streamlit Header Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Streamlit Title Block */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-red-600 dark:text-red-400 uppercase mb-1">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              Streamlit Preview Simulation
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
              <span>🔍</span> AuditIQ - POC Step 1
            </h1>
            <p className="mt-2 text-base text-slate-600 dark:text-slate-400">
              Data Ingestion &amp; Schema Validation Engine
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={loadPresetValid}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium shadow-xs transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Load Valid audit_sample_data.csv
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
        <div className="mb-8">
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Upload CSV file
          </label>
          <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-red-500 dark:hover:border-red-400 rounded-xl p-8 bg-white dark:bg-slate-800/80 transition-all text-center group cursor-pointer">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className="flex flex-col items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {file ? file.name : "Drag and drop file here or click to browse"}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Limit 200MB per file • CSV only
                </p>
              </div>
              {file && (
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-xs text-slate-700 dark:text-slate-300 font-medium">
                  <FileText className="w-3.5 h-3.5" />
                  {(file.size / 1024).toFixed(1)} KB
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dynamic Output Area mirroring Streamlit behavior */}
        {isSuccess === false && (
          <div className="space-y-4 mb-8">
            {/* st.error block */}
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

            {/* st.warning expected vs found */}
            <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-xs font-mono space-y-2">
              <p>
                <strong className="text-amber-800 dark:text-amber-300">Expected Schema:</strong>{' '}
                <code>{JSON.stringify(REQUIRED_COLUMNS)}</code>
              </p>
              <p>
                <strong className="text-amber-800 dark:text-amber-300">Found Columns:</strong>{' '}
                <code>{JSON.stringify(foundColumns)}</code>
              </p>
              <p className="text-rose-700 dark:text-rose-400 font-semibold text-xs pt-1">
                🛑 Execution Halted (st.stop() triggered due to schema mismatch).
              </p>
            </div>
          </div>
        )}

        {isSuccess === true && parsedData && (
          <div className="space-y-8 mb-8 animate-in fade-in duration-300">
            {/* st.success alert */}
            <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div className="text-sm">
                <span className="font-bold">✅ Schema Validation Successful!</span> All required columns are present:{' '}
                <code className="font-mono text-xs bg-emerald-100 dark:bg-emerald-900/60 px-1.5 py-0.5 rounded text-emerald-800 dark:text-emerald-300">
                  {REQUIRED_COLUMNS.join(', ')}
                </code>
              </div>
            </div>

            {/* Streamlit Metrics Columns (3-column layout) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 rounded-xl shadow-2xs">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Total Row Count
                </p>
                <p className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
                  {parsedData.length.toLocaleString()}
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                  ✓ Validated against schema
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
                  Active suppliers in sample
                </p>
              </div>

              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 rounded-xl shadow-2xs">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Departments
                </p>
                <p className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
                  {uniqueDepts.length}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Cost centers represented
                </p>
              </div>
            </div>

            {/* Planted Anomalies Inspector (POC Verification Banner) */}
            {detectedAnomalies.length > 0 && (
              <div className="bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-900 rounded-xl p-5 shadow-2xs">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      POC Verification: Planted Anomalies Inspector
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowAnomalyInspector(!showAnomalyInspector)}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                  >
                    {showAnomalyInspector ? 'Collapse Anomaly Details' : 'Expand Anomaly Details'}
                  </button>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
                  These 4 anomalies were deliberately seeded by <code className="font-mono bg-slate-100 dark:bg-slate-700 px-1 py-0.5 rounded">generate_data.py</code> to test downstream audit anomaly detection rules:
                </p>

                {showAnomalyInspector && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {detectedAnomalies.map((anomaly, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${anomaly.badge}`}>
                            Anomaly #{idx + 1}: {anomaly.type}
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono">
                            {anomaly.rows.length} row(s)
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          {anomaly.desc}
                        </p>
                        <div className="mt-2 text-[11px] font-mono bg-white dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700 space-y-1 max-h-24 overflow-y-auto">
                          {anomaly.rows.map((r, rIdx) => (
                            <div key={rIdx} className="text-slate-700 dark:text-slate-300">
                              • Date: <span className="font-semibold">{r.date}</span> | Amt: <span className="font-semibold">${r.amount}</span> | Vendor: <span className="font-semibold">{r.vendor}</span> | Approver: <span className="italic">{r.approved_by || 'NULL/BLANK'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Interactive Data Table section */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xs overflow-hidden">
              <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Ingested Audit Transactions
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Interactive Streamlit DataFrame rendering ({filteredRows.length} shown)
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
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

              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-900/80 sticky top-0 border-b border-slate-200 dark:border-slate-700 z-10 text-slate-700 dark:text-slate-300 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3 text-right">Amount ($)</th>
                      <th className="py-2.5 px-3">Vendor</th>
                      <th className="py-2.5 px-3">Account Code</th>
                      <th className="py-2.5 px-3">Approved By</th>
                      <th className="py-2.5 px-3">Department</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                    {filteredRows.slice(0, 100).map((row, idx) => {
                      const isNullApprover = !row.approved_by || row.approved_by.trim() === '';
                      const isLargeRound = parseFloat(row.amount) >= 10000 && parseFloat(row.amount) % 100 === 0;
                      const isWeekend = new Date(row.date + 'T00:00:00').getDay() === 0 || new Date(row.date + 'T00:00:00').getDay() === 6;

                      return (
                        <tr
                          key={idx}
                          className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${
                            isNullApprover ? 'bg-purple-50/50 dark:bg-purple-950/20' :
                            isLargeRound ? 'bg-rose-50/50 dark:bg-rose-950/20' :
                            isWeekend ? 'bg-amber-50/50 dark:bg-amber-950/20' : ''
                          }`}
                        >
                          <td className="py-2 px-3 text-slate-400 font-sans text-[11px]">{idx + 1}</td>
                          <td className="py-2 px-3 whitespace-nowrap">
                            {row.date}
                            {isWeekend && (
                              <span className="ml-1 px-1.5 py-0.2 rounded text-[10px] font-sans font-bold bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                                Weekend
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right font-semibold whitespace-nowrap">
                            ${parseFloat(row.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            {isLargeRound && (
                              <span className="ml-1 px-1.5 py-0.2 rounded text-[10px] font-sans font-bold bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200">
                                &gt;$10k
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 font-sans font-medium text-slate-800 dark:text-slate-200">
                            {row.vendor}
                          </td>
                          <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{row.account_code}</td>
                          <td className="py-2 px-3 font-sans">
                            {isNullApprover ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300 italic">
                                [NULL / BLANK]
                              </span>
                            ) : (
                              row.approved_by
                            )}
                          </td>
                          <td className="py-2 px-3 font-sans text-slate-600 dark:text-slate-400">{row.department}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {!file && (
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-8 text-center text-slate-500 dark:text-slate-400 space-y-3">
            <p className="text-base">
              💡 Please upload a <code className="font-mono text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 px-1.5 py-0.5 rounded">.csv</code> file or click one of the preset buttons above to test schema validation.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
